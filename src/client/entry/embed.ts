// src/embed.ts
import { createEngine } from "../engine";
import { createScene, addTennisTable, addPaddle, addBall } from "../scene";
import { setupCamera } from "../camera";
import { setupLights, createSunShadows } from "../light";
import { createLifecycle } from "../engine/Lifecycle";
import type { PongInstance } from "./types";
import Logger from "../../shared/utils/Logger";

// import { fetchPlayerProfile } from "../api/player";

import { createInitialState } from "../../game/state";
import { stepPaddles } from "../../game/systems/paddle";
import { stepBallAndCollisions } from "../../game/systems/ball";
import { attachLocalInput, readIntent, blockInputFor } from "../input";

import { createBounces } from "../scene/Bounces";

import { FXManager } from "../FX/manager";
import { decHide } from "../FX";

import { Animation } from "@babylonjs/core/Animations/animation";
import { CubicEase, EasingFunction } from "@babylonjs/core/Animations/easing";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Scene } from "@babylonjs/core/scene";

import { createScoreboard } from "../ui";
import "../ui/theme.css";

import "./babylon.sidefx";

Logger.setLevel("debug");

function animateZToZero(scene: Scene, mesh: AbstractMesh, ms = 220) {
  const frameRate = 60;
  const totalFrames = Math.max(1, Math.round((ms / 1000) * frameRate));

  // Build a one-off Animation
  const anim = new Animation(
    "paddleCenterZ",
    "position.z",
    frameRate,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );

  anim.setKeys([
    { frame: 0, value: mesh.position.z },
    { frame: totalFrames, value: 0 },
  ]);

  const ease = new CubicEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  anim.setEasingFunction(ease);

  // Attach and play via scene.beginAnimation
  mesh.animations =
    mesh.animations?.filter((a) => a.name !== "paddleCenterZ") ?? [];
  mesh.animations.push(anim);
  scene.beginAnimation(mesh, 0, totalFrames, false /* loop = false */);
}

export function createPong(canvas: HTMLCanvasElement): PongInstance {
  canvas.tabIndex = 1;

  const { engine, engineDisposable } = createEngine(canvas);
  const { scene } = createScene(engine);
  const { sun } = setupLights(scene);
  setupCamera(scene);

  const table = addTennisTable(scene);
  const left = addPaddle(scene, table, "left");
  const right = addPaddle(scene, table, "right");
  const ball = addBall(scene, table);

  const { sg, addCasters, setReceives } = createSunShadows(sun);
  addCasters(ball.mesh, left.mesh, right.mesh);
  setReceives(table.tableTop, table.tableDepth);

  let animatingPaddlesUntil = 0;

  const hud = createScoreboard();
  hud.attachToCanvas(canvas);

  // ===== Game logic bounds from actual geometry (render -> headless) =====
  const tableBB = table.tableTop.getBoundingInfo().boundingBox;
  const halfLengthX = tableBB.extendSize.x; // along X
  const halfWidthZ = tableBB.extendSize.z; // along Z

  const leftBB = left.mesh.getBoundingInfo().boundingBox;
  const paddleHalfDepthZ = leftBB.extendSize.z; // paddle half-size along Z

  const ballInfo = ball.mesh.getBoundingInfo();
  const ballRadius = ballInfo.boundingSphere.radiusWorld;

  const leftPaddleX = left.mesh.position.x;
  const rightPaddleX = right.mesh.position.x;

  const margin = 0.006;

  const zMax = halfWidthZ - margin - ballRadius;

  // centralize FX creation & triggers
  const fx = new FXManager(scene, {
    wallZTop: +zMax,
    wallZBottom: -zMax,
    ballMesh: ball.mesh,
    ballRadius,
  });

  //
  const Bounces = createBounces(
    ball.mesh,
    table.tableTop.position.y,
    ballRadius,
    halfLengthX,
    left.mesh,
    right.mesh,
  );

  Bounces.scheduleServe(1);
  //

  // Create deterministic headless state
  let state = createInitialState({
    halfLengthX,
    halfWidthZ,
    paddleHalfDepthZ,
    leftPaddleX,
    rightPaddleX,
    ballRadius,
    margin,
  });

  // Kick off an initial rally (straight serve to the right)
  state = {
    ...state,
    phase: "rally",
    ball: {
      ...state.ball,
      x: 0,
      z: 0,
      vx: state.params.ballSpeed,
      vz: 0,
    },
  };

  // Local keyboard input
  const detachInput = attachLocalInput(canvas);
  scene.onDisposeObservable.add(detachInput);

  const { start, stop } = createLifecycle(engine, scene, {
    logicHz: 60,
    hiddenLogicHz: 15,
    update: (dtMs) => {
      const dt = Math.min(0.05, dtMs / 1000);

      // 1) input → paddles
      const intent = readIntent();
      state = stepPaddles(state, intent, dt);

      // 2) ball & collisions (now returns events)
      const stepped = stepBallAndCollisions(state, dt);
      const enteredServePhase =
        (stepped.next.phase === "serveLeft" ||
          stepped.next.phase === "serveRight") &&
        state.phase !== "serveLeft" &&
        state.phase !== "serveRight";

      if (enteredServePhase) {
        const dir = stepped.next.phase === "serveLeft" ? 1 : -1;
        decHide(ball.mesh);
        Bounces.scheduleServe(dir);

        // Animate paddles to center over ~220ms
        animateZToZero(scene, left.mesh, 220);
        animateZToZero(scene, right.mesh, 220);

        // During this window, skip projecting state->mesh for paddles (see step 4)
        const ms = 240; // same as your animation duration (or slightly longer)
        animatingPaddlesUntil = performance.now() + ms;
        blockInputFor(ms);
      }
      state = stepped.next;

      hud.setScores(state.scores.left, state.scores.right);
      hud.setServer(state.server);
      hud.setDeuce(state.scores.left >= 10 && state.scores.right >= 10);

      // 3) visual bounce Y
      const ballY = Bounces.update(state.ball.x, state.ball.vx);

      // 4) project to meshes
      ball.mesh.position.set(state.ball.x, ballY, state.ball.z);

      // If we're currently animating, let the animation drive Z.
      // Otherwise, project logic state to meshes as usual.
      if (performance.now() >= animatingPaddlesUntil) {
        left.mesh.position.z = state.paddles.left.z;
        right.mesh.position.z = state.paddles.right.z;
      }

      // 5) FX on explicit wall hit
      if (stepped.events.wallHit) {
        const { side, x } = stepped.events.wallHit;
        fx.wallPulse(side, x, ballY);
      }

      if (stepped.events.explode) {
        const { x, z } = stepped.events.explode;
        fx.burstAt(x, ballY, z);
      }
    },
  });

  (async () => {
    try {
      //const profile = await fetchPlayerProfile("me");
    } catch (e) {
      Logger.warn("ProfileFetch", "Error while Fetching the profile.", e);
    }
  })();

  scene.onDisposeObservable.add(() => {
    ball.dispose();
    left.dispose();
    right.dispose();
    table.dispose();
    sg.dispose();
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
