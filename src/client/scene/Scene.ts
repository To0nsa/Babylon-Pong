// src/core/scene/Scene.ts
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";

import { addSpaceBackground } from "../scene";

/**
 * Create a Babylon Scene only.
 * - No objects are created here.
 * - Background color uses provided theme or falls back to DefaultTheme.
 */
export function createScene(engine: Engine) {
  const scene = new Scene(engine);

  addSpaceBackground(scene);

  return { scene };
}
