// src/game/systems/win.ts
import type { GameState, Side } from "../../model";

export function hasWinner(s: GameState): Side | null {
  const { left, right } = s.scores;
  const { targetScore, winBy } = s.params;
  const lead = Math.abs(left - right);
  if (left >= targetScore || right >= targetScore) {
    if (lead >= winBy) return left > right ? "left" : "right";
  }
  return null;
}
