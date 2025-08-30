// src/core/scene/Scene.ts
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";

import { addSpaceBackground } from "../scene";
import { Color3 } from "@babylonjs/core";

/**
 * Create a Babylon Scene only.
 * - No objects are created here.
 * - Background color uses provided theme or falls back to DefaultTheme.
 */
export function createScene(engine: Engine) {
  const scene = new Scene(engine);

  addSpaceBackground(scene, {
    starDensity: 0.001, // more stars
    starIntensity: 1.2, // slightly brighter
    backgroundColor: new Color3(0.0, 0.0, 0.03), // deeper blue
    twinkle: true, // keep deterministic
    diameter: 50,
  });

  return { scene };
}
