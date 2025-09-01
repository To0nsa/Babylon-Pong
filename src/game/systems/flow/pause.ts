// src/game/systems/flow/pause.ts
import { MS_PER_S } from "../../constants";
import type { GameState } from "../../model";
import type { TableEnd } from "../../../shared/types";
import { serveFrom } from ".";

function dec(ms: number | undefined, dt: number): number {
  // dt is seconds → convert to ms and clamp
  return Math.max(0, (ms ?? 0) - dt * MS_PER_S);
}

/**
 * Single pause step handling:
 * - pauseBtwPoints: counts down then starts the next serve
 * - pauseBetweenGames: counts down; next game boot is decided by match controller
 * - matchOver: counts down a victory pause; external UI decides what to do next
 */
export function stepPause(s: GameState, dt: number): GameState {
  switch (s.phase) {
    case "pauseBtwPoints": {
      const remaining = dec(s.tPauseBtwPointsMs, dt);
      if (remaining > 0) return { ...s, tPauseBtwPointsMs: remaining };

      // done → serve from queued side (fallback to current server/east)
      const side: TableEnd = s.nextServe ?? s.server ?? "east";
      return serveFrom(side, s);
    }

    case "pauseBetweenGames": {
      const remaining = dec(s.tPauseBtwGamesMs, dt);
      return { ...s, tPauseBtwGamesMs: remaining };
    }

    case "matchOver": {
      const remaining = dec(s.tMatchOverMs, dt);
      return { ...s, tMatchOverMs: remaining };
    }

    default:
      return s;
  }
}
