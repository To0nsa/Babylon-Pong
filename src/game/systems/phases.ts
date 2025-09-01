// src/game/ball/phases.ts
import type { GameState } from "../state";

export function serveFrom(side: "left" | "right", s: GameState): GameState {
  const dir = side === "left" ? 1 : -1;
  const angle = 0;
  return {
    ...s,
    paddles: { left: { z: 0, vz: 0 }, right: { z: 0, vz: 0 } },
    phase: side === "left" ? "serveLeft" : "serveRight",
    tFreezeMs: undefined,
    nextServe: undefined,
    ball: {
      x: 0,
      z: 0,
      vx: dir * s.params.ballSpeed * Math.cos(angle),
      vz: s.params.ballSpeed * Math.sin(angle),
    },
  };
}
