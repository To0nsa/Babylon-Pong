// src/client/entry/embed.ts
import { createEngine, createLifecycle } from "../engine";
import { createWorld } from "../scene";
import type { PongInstance } from "./types";
import Logger from "../../shared/utils/Logger";

import { createInitialState } from "../../game";
import { stepPaddles } from "../../game";
import { handleSteps } from "../../game";

import {
  attachLocalInput,
  readIntent,
  blockInputFor,
  toggleControlsMirrored,
} from "../input";
import { createBounces } from "../visuals";

import { FXManager } from "../FX/manager";

import { createScoreboard } from "../ui";
import "../ui/theme.css";
import "./babylon.sidefx";

import { computeBounds } from "./bounds";
import { createPaddleAnimator } from "../visuals";
import { detectEnteredServe, onEnteredServe } from "./serveCue";
import { updateHUD } from "../ui/hudBinding";
import { applyFrameEvents } from "./eventsToFX";

import { tableTennisRules } from "../../game/rules/presets";
import { createMatchController } from "../../game/match/controller";

import { pickInitialServer, type MatchSeed } from "../../shared/utils/rng";
import { serveFrom } from "../../game/systems/flow";

import { SERVE_SELECT_TOTAL_MS } from "../../game/constants";

Logger.setLevel("debug");

function localMatchSeed(): MatchSeed {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] >>> 0;
}

export function createPong(canvas: HTMLCanvasElement): PongInstance {
  canvas.tabIndex = 1;

  const matchSeed = localMatchSeed();

  const { engine, engineDisposable } = createEngine(canvas);
  const world = createWorld(engine);
  const {
    scene,
    paddles: { left, right },
    table,
    ball,
  } = world;

  const hud = createScoreboard();
  hud.attachToCanvas(canvas);
  let names = { east: "Magenta", west: "Green" };

  // Bounds once (render → headless)
  const { bounds, zMax } = computeBounds(world);

  // FX manager (centralized)
  const fx = new FXManager(scene, {
    wallZNorth: +zMax,
    wallZSouth: -zMax,
    ballMesh: ball.mesh,
    ballRadius: bounds.ballRadius,
    tableTop: table.tableTop,
  });

  // Visual bounce helper
  const Bounces = createBounces(
    ball.mesh,
    table.tableTop.position.y,
    bounds.ballRadius,
    bounds.halfLengthX,
    left.mesh,
    right.mesh,
  );

  // ruleset + match controller (best-of-5 by default)
  const RULES = tableTennisRules({
    match: {
      bestOf: 5,
      switchEndsEachGame: true,
      decidingGameMidSwapAtPoints: 5,
      alternateInitialServerEachGame: true,
    },
  });

  const initialServer = pickInitialServer(matchSeed);
  const match = createMatchController(bounds, RULES, initialServer);

  // Headless state (boot aligned to chosen initial server)
  let state = createInitialState(bounds, initialServer);

  // Input
  const detachInput = attachLocalInput(canvas);
  scene.onDisposeObservable.add(detachInput);

  // Tiny animator gate
  const paddleAnim = createPaddleAnimator(scene, left.mesh, right.mesh);

  // Intro gate
  let introUntil = 0; // wall-clock ms until which logic is gated
  const loop = createLifecycle(engine, scene, {
    logicHz: 60,
    update: (dtMs) => {
      if (performance.now() < introUntil) {
        // Skip physics while the flicker runs; render still updates via Lifecycle.
        return;
      }
      const dt = Math.min(0.05, dtMs / 1000);

      // 1) Input → paddles
      state = stepPaddles(state, readIntent(), dt);

      // 2) Rally / pauses / serve
      const prevPhase = state.phase;
      const stepped = handleSteps(state, dt);

      // 3) Match controller reacts to scoring / game over / match flow
      const mc = match.afterPhysicsStep(stepped.next);
      state = mc.state;

      if (mc.events.swapSidesNow) {
        // controls follow player
        toggleControlsMirrored();

        // color/skin follows player
        {
          const m = left.mesh.material;
          left.mesh.material = right.mesh.material;
          right.mesh.material = m;
        }

        names = { east: names.west, west: names.east };

        // nice cross-over cue
        paddleAnim.cue(180);
      }

      // 4) Entered serve? Trigger cues (compare with final phase after controller)
      const entered = detectEnteredServe(prevPhase, state.phase);
      if (entered) {
        onEnteredServe(entered, {
          ballMesh: ball.mesh,
          Bounces,
          paddleAnim,
          blockInputFor,
        });
      }

      // 5) HUD
      updateHUD(hud, state, names);

      // 6) Visual bounce Y + project meshes
      const ballY = Bounces.update(state.ball.x, state.ball.vx);
      ball.mesh.position.set(state.ball.x, ballY, state.ball.z);
      if (!paddleAnim.isAnimating()) {
        left.mesh.position.z = state.paddles.P1.z;
        right.mesh.position.z = state.paddles.P2.z;
      }

      // 7) FX from events
      applyFrameEvents(fx, stepped.events, ballY);
    },
  });

  scene.onDisposeObservable.add(() => {
    world.dispose();
    fx.dispose();
    hud.dispose();
  });

  const destroy = () => {
    loop.stop();
    scene.dispose();
    engineDisposable.dispose();
  };

  return {
    start() {
      // Pre-roll: run the flicker before letting physics advance.
      // Hide ball robustly (twice) so we can unhide in stages.
      import("../FX/fxUtils").then(({ incHide }) => {
        incHide(ball.mesh);
        incHide(ball.mesh);
      });

      // Avoid user moving paddles during pre-roll.
      blockInputFor(SERVE_SELECT_TOTAL_MS + 200);
      introUntil = performance.now() + SERVE_SELECT_TOTAL_MS;

      // Begin rendering immediately so the effect is visible.
      loop.start();

      // Play the intro flicker async; when it ends, arm the opening serve.
      void fx.serveSelection(initialServer).then(async () => {
        // Give the ball velocity + correct serve phase
        state = serveFrom(initialServer, state);
        // No extra pause after the intro
        state = { ...state, tPauseBtwPointsMs: 0 };

        // Schedule matching visual bounce path for the chosen side
        const dir = initialServer === "east" ? -1 : 1;
        Bounces.scheduleServe(dir);

        // Fully unhide (we hid twice)
        const { decHide } = await import("../FX");
        decHide(ball.mesh);
        decHide(ball.mesh);
      });
    },
    destroy,
  };
}
