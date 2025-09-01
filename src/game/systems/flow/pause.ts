// src/game/systems/timing/freeze.ts
import { MS_PER_S } from "../../../game/constants";
import type { TableEnd } from "shared/types";
import type { GameState } from "../../model";
import { serveFrom } from ".";

export function stepPauseBtwPoints(s: GameState, dt: number): GameState {
  // Time bookkeeping (dt is in seconds; convert to ms).
  const currentPauseMs = s.tPauseBtwPointsMs;
  const elapsedMs      = dt * MS_PER_S;
  const remainingMs    = Math.max(currentPauseMs - elapsedMs, 0);

  // Still pausing between points → just update the timer.
  if (remainingMs > 0) {
    return { ...s, tPauseBtwPointsMs: remainingMs };
  }

  // Pause finished → serve from queued side (fallback: current server → "east").
  const serveSide: TableEnd = s.nextServe ?? s.server ?? "east";
  return serveFrom(serveSide, s);
}


