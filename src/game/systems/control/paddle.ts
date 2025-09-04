// src/game/systems/paddle.ts
import type { GameState } from "@game/model/state";
import type { InputIntent } from "@shared/protocol/input";

/** Deterministic, pure step. Units: meters/second, seconds. */
export function stepPaddles(
  s: GameState,
  inpt: InputIntent,
  dt: number,
): GameState {
  const clampZ = (z: number) => {
    const max = s.bounds.halfWidthZ - s.bounds.paddleHalfDepthZ;
    return Math.max(-max, Math.min(max, z));
  };

  const speed = s.params.paddleSpeed;

  const leftVz = inpt.leftAxis * speed;
  const rightVz = inpt.rightAxis * speed;

  const leftZ = clampZ(s.paddles.P1.z + leftVz * dt);
  const rightZ = clampZ(s.paddles.P2.z + rightVz * dt);

  return {
    ...s,
    paddles: {
      P1: { z: leftZ, vz: leftVz },
      P2: { z: rightZ, vz: rightVz },
    },
  };
}
