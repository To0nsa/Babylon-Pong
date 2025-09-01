// src/game/systems/timing/freeze.ts
import type { TableEnd } from "shared/types";
import type { GameState } from "../../model";
import { serveFrom } from "../flow";

export function stepFreeze(s: GameState, dt: number): GameState {
  const left = Math.max(0, (s.tPauseBtwPointsMs ?? 0) - dt * 1000);
  if (left > 0) return { ...s, tPauseBtwPointsMs: left };
  const serveSide: TableEnd = s.nextServe ?? s.server ?? "east";
  return serveFrom(serveSide, s);
}
