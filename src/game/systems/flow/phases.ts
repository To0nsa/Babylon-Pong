// src/game/ball/phases.ts
import type { TableEnd } from "shared/types";
import type { GameState } from "../../model";

export function serveFrom(side: TableEnd, s: GameState): GameState {
  const dir = side === "east" ? 1 : -1;
  const angle = 0;
  return {
    ...s,
    paddles: { P1: { z: 0, vz: 0 }, P2: { z: 0, vz: 0 } },
    phase: side === "east" ? "serveEast" : "serveWest",
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
