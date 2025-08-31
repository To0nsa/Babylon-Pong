import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { animateZToZero } from "../visuals";

/** Owns the “center paddles” tween and a simple time window. */
export function createPaddleAnimator(
  scene: Scene,
  left: AbstractMesh,
  right: AbstractMesh,
) {
  let until = 0;

  function cue(ms = 220) {
    animateZToZero(scene, left, ms);
    animateZToZero(scene, right, ms);
    // Give the animation a small grace to fully finish
    until = performance.now() + ms + 20;
    return ms + 20;
  }

  const isAnimating = () => performance.now() < until;

  return { cue, isAnimating };
}
