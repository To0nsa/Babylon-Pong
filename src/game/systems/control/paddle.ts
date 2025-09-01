// src/game/systems/paddle.ts
import type { GameState } from "../../model";
import type { InputIntent } from "../../input";

/** Deterministic, pure step. Units: meters/second, seconds. */
export function stepPaddles(
  s: GameState,
  inpt: InputIntent,
  dt: number,
): GameState {
  const clampZ = (z: number) => {
    const max =
      s.bounds.halfWidthZ - s.bounds.margin - s.bounds.paddleHalfDepthZ;
    return Math.max(-max, Math.min(max, z));
  };

  const speed = s.params.paddleSpeed;

  const leftVz = inpt.leftAxis * speed;
  const rightVz = inpt.rightAxis * speed;

  const leftZ = clampZ(s.paddles.left.z + leftVz * dt);
  const rightZ = clampZ(s.paddles.right.z + rightVz * dt);

  return {
    ...s,
    paddles: {
      left: { z: leftZ, vz: leftVz },
      right: { z: rightZ, vz: rightVz },
    },
  };
}
