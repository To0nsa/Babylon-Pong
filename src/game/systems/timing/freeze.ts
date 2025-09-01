// src/game/ball/freeze.ts
import type { GameState } from "../model/state";
import { serveFrom } from "./flow/phases";

export function stepFreeze(s: GameState, dt: number): GameState {
  const left = Math.max(0, (s.tFreezeMs ?? 0) - dt * 1000);
  if (left > 0) return { ...s, tFreezeMs: left };
  const serveSide = s.nextServe ?? s.server ?? "left";
  return serveFrom(serveSide, s);
}
