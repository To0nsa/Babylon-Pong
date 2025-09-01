// src/game/ball/service.ts
import type { GameState, Side } from "../state";

export function inDeuceMode(s: GameState): boolean {
  const deuceAt = s.params.deuceAt ?? s.params.targetScore - 1;
  return s.scores.left >= deuceAt && s.scores.right >= deuceAt;
}

/** Table-tennis style service rotation (pre/post deuce). */
export function rotateService(s: GameState): {
  nextServer: Side;
  nextTurns: number;
} {
  if (inDeuceMode(s)) {
    const next = s.server === "left" ? "right" : "left";
    return { nextServer: next, nextTurns: s.params.deuceServesPerTurn };
  }
  if (s.serviceTurnsLeft > 1) {
    return { nextServer: s.server, nextTurns: s.serviceTurnsLeft - 1 };
  }
  return {
    nextServer: s.server === "left" ? "right" : "left",
    nextTurns: s.params.servesPerTurn,
  };
}
