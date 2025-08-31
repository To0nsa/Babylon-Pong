// src/client/scene/Scene.ts
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";

import { addSpaceBackground } from "./Background";
import { setupLights } from "./light/Light";
import { createSunShadows } from "./light/Shadows";
import { setupCamera } from "./camera/Camera";
import { addTable, type TableHandle } from "./mesh/Table";
import { addPaddle, type PaddleHandle } from "./mesh/Paddle";
import { addBall, type BallHandle } from "./mesh/Ball";

export type WorldKit = {
  scene: Scene;
  camera: ArcRotateCamera;
  lights: { hemi: HemisphericLight; sun: DirectionalLight };
  shadows: ReturnType<typeof createSunShadows>;
  table: TableHandle;
  paddles: { left: PaddleHandle; right: PaddleHandle };
  ball: BallHandle;
  /** Idempotent cleanup for all owned resources. */
  dispose: () => void;
};

/**
 * Build the full Babylon “world”:
 * - scene, background
 * - camera, lights, shadow generator
 * - table, paddles, ball (with shadow casting / receiving wired)
 */
export function createWorld(engine: Engine): WorldKit {
  const scene = new Scene(engine);

  // Background
  const bg = addSpaceBackground(scene);

  // Camera + lights
  const camera = setupCamera(scene);
  const lights = setupLights(scene); // {hemi, sun}

  // Meshes
  const table = addTable(scene);
  const left = addPaddle(scene, table, "left");
  const right = addPaddle(scene, table, "right");
  const ball = addBall(scene, table);

  // Shadows
  const shadows = createSunShadows(lights.sun);
  shadows.addCasters(ball.mesh, left.mesh, right.mesh);
  shadows.setReceives(table.tableTop, table.tableDepth);

  // Unified disposer
  const dispose = () => {
    try {
      shadows.sg.dispose();
    } catch {}
    try {
      ball.dispose();
      left.dispose();
      right.dispose();
      table.dispose();
    } catch {}
    try {
      bg.dispose();
    } catch {}
    try {
      scene.dispose();
    } catch {}
  };

  // Auto-clean when the scene goes away
  scene.onDisposeObservable.add(() => {
    try {
      shadows.sg.dispose();
    } catch {}
    try {
      ball.dispose();
      left.dispose();
      right.dispose();
      table.dispose();
    } catch {}
    try {
      bg.dispose();
    } catch {}
  });

  return {
    scene,
    camera,
    lights,
    shadows,
    table,
    paddles: { left, right },
    ball,
    dispose,
  };
}
