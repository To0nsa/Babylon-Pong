// src/client/ui/hudBinding.ts
import type { GameState } from "../../game/model/state";
import type { DomScoreboardAPI } from "../ui/Scoreboard";
import type { TableEnd } from "../../shared/types";

export type NamesByEnd = Record<TableEnd, string>;

// Minimal shape we need from the match snapshot
export type MatchSnapshotForHUD = {
  bestOf: number;
  currentGameIndex: number;
  gamesHistory: Array<{
    gameIndex: number;
    east: number;
    west: number;
    winner: TableEnd;
  }>;
};

export function updateHUD(
  hud: DomScoreboardAPI,
  s: GameState,
  names?: NamesByEnd,
  match?: MatchSnapshotForHUD,
) {
  // Points → UI
  hud.setPoints(s.points.east, s.points.west);

  // Server ring → UI
  hud.setServer(s.server === "east" ? "left" : "right");

  // Deuce pill
  hud.setDeuce(
    s.points.east >= s.params.deuceAt && s.points.west >= s.params.deuceAt,
  );

  // Names (optional)
  if (names) hud.setPlayerNames(names.east, names.west);

  // Game boxes (optional but recommended when match info is available)
  if (match) {
    hud.setGames(match.gamesHistory, match.bestOf, match.currentGameIndex);
  }
}
