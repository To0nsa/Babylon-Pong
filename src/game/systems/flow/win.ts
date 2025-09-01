// src/game/systems/win.ts
import type { GameState } from "../../model";
import type { TableEnd } from "shared/types";

export function hasWinner(s: GameState): TableEnd | null {
  const { east, west } = s.points;
  const { targetScore, winBy } = s.params;
  const lead = Math.abs(east - west);
  if (east >= targetScore || west >= targetScore) {
    if (lead >= winBy) return east > west ? "east" : "west";
  }
  return null;
}
