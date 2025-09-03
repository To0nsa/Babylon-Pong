// src/client/ui/hudBinding.ts
import type { GameState } from "../../game/model/state";
import type { DomScoreboardAPI } from "../ui/Scoreboard";
import type { TableEnd } from "../../shared/types";

export type NamesByEnd = Record<TableEnd, string>; // { east: string; west: string }

export function updateHUD(
  hud: DomScoreboardAPI,
  s: GameState,
  names?: NamesByEnd,
) {
  // Points → UI slots
  hud.setPoints(s.points.east, s.points.west);

  // Server ring → UI slot
  hud.setServer(s.server === "east" ? "left" : "right");

  // Deuce badge
  hud.setDeuce(
    s.points.east >= s.params.deuceAt && s.points.west >= s.params.deuceAt,
  );

  // Names (optional) → UI slots
  if (names) hud.setPlayerNames(names.east, names.west);
}

