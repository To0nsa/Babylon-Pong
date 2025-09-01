// src/game/ball/service.ts
import type { GameState } from "../../model";
import type { TableEnd } from "../../../shared/types";

export function inDeuceMode(s: GameState): boolean {
  const deuceAt = s.params.deuceAt ?? s.params.targetScore - 1;
  return s.points.east >= deuceAt && s.points.west >= deuceAt;
}

/** Table-tennis style service rotation (pre/post deuce). */
export function rotateService(s: GameState): {
  nextServer: TableEnd;
  nextTurns: number;
} {
  if (inDeuceMode(s)) {
    const next = s.server === "east" ? "west" : "east";
    return { nextServer: next, nextTurns: s.params.deuceServesPerTurn };
  }
  if (s.serviceTurnsLeft > 1) {
    return { nextServer: s.server, nextTurns: s.serviceTurnsLeft - 1 };
  }
  return {
    nextServer: s.server === "east" ? "west" : "east",
    nextTurns: s.params.servesPerTurn,
  };
}
