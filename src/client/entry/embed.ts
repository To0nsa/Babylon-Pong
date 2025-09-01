// src/client/entry/embed.ts
import { createEngine, createLifecycle } from "../engine";
import { createWorld } from "../scene";
import type { PongInstance } from "./types";
import Logger from "../../shared/utils/Logger";

import { createInitialState } from "../../game/model/state";
import { bootAsRally } from "../../game";
import { stepPaddles } from "../../game/systems/control/paddle";
import { stepBallAndCollisions } from "../../game";

import { attachLocalInput, readIntent, blockInputFor } from "../input";
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

// NEW: rules + match controller
import { tableTennisRules } from "../../game/rules/presets";
import { createMatchController } from "../../game/match/controller";

Logger.setLevel("debug");

export function createPong(canvas: HTMLCanvasElement): PongInstance {
  canvas.tabIndex = 1;

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

  // Bounds once (render → headless)
  const { bounds, zMax } = computeBounds(world, 0.006);

  // FX manager (centralized)
  const fx = new FXManager(scene, {
    wallZTop: +zMax,
    wallZBottom: -zMax,
    ballMesh: ball.mesh,
    ballRadius: bounds.ballRadius,
  });

  // Visual bounce helper
  const Bounces = createBounces(
    ball.mesh,
    table.tableTop.position.y,
    bounds.ballRadius,
    bounds.halfLengthX,
    left.mesh,
    right.mesh,
    bounds.margin,
  );
  Bounces.scheduleServe(1);

  // Headless state (start in rally for a quick preview; you can switch to pure serve boot)
  let state = bootAsRally(createInitialState(bounds));

  // NEW: ruleset + match controller (best-of-5 by default)
  const RULES = tableTennisRules({
    match: {
      bestOf: 5,
      switchEndsEachGame: true,
      decidingGameMidSwapAtPoints: 5,
      alternateInitialServerEachGame: true,
    },
  });
  const match = createMatchController(
    bounds,
    RULES,
    /* initial server */ "east",
  );

  // Input
  const detachInput = attachLocalInput(canvas);
  scene.onDisposeObservable.add(detachInput);

  // Tiny animator gate
  const paddleAnim = createPaddleAnimator(scene, left.mesh, right.mesh);

  const { start, stop } = createLifecycle(engine, scene, {
    logicHz: 60,
    update: (dtMs) => {
      const dt = Math.min(0.05, dtMs / 1000);

      // 1) Input → paddles
      state = stepPaddles(state, readIntent(), dt);

      // 2) Ball & collisions
      const prevPhase = state.phase;
      const stepped = stepBallAndCollisions(state, dt);

      // 3) Match controller reacts to scoring / game over / match flow
      const { state: controlled } = match.afterPhysicsStep(
        stepped.next,
      );
      state = controlled;

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
      updateHUD(hud, state);

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
    stop();
    scene.dispose();
    engineDisposable.dispose();
  };

  return { start, destroy };
}
