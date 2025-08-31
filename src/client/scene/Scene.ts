// src/core/scene/Scene.ts
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";

import { addSpaceBackground } from "../scene";

/**
 * Create a Babylon Scene only.
 */
export function createScene(engine: Engine) {
  const scene = new Scene(engine);
  const bg = addSpaceBackground(scene);
  scene.onDisposeObservable.add(() => bg.dispose());
  return { scene };
}
