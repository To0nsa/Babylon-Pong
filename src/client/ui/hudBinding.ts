import type { GameState } from "../../game/model/state";
import type { DomScoreboardAPI } from "../ui/Scoreboard";

type HudView = {
  /** When true, UI-left shows WEST and UI-right shows EAST. */
  mirrored: boolean;
  /** Canonical names by table end (not by UI slot). */
  names?: { east: string; west: string };
};

export function updateHUD(
  hud: DomScoreboardAPI,
  s: GameState,
  view: HudView,
) {
  const { mirrored, names } = view;

  // Points → UI slots
  let leftPts: number;
  let rightPts: number;
  if (mirrored) {
    leftPts = s.points.west;
    rightPts = s.points.east;
  } else {
    leftPts = s.points.east;
    rightPts = s.points.west;
  }
  hud.setPoints(leftPts, rightPts);

  // Server ring → UI slot
  let serverOnLeft: boolean;
  if (mirrored) {
    serverOnLeft = s.server === "west";
  } else {
    serverOnLeft = s.server === "east";
  }
  hud.setServer(serverOnLeft ? "left" : "right");

  // Deuce badge
  hud.setDeuce(s.points.east >= s.params.deuceAt && s.points.west >= s.params.deuceAt);

  // Names (optional) → UI slots
  if (names) {
    let leftName: string;
    let rightName: string;
    if (mirrored) {
      leftName = names.west;
      rightName = names.east;
    } else {
      leftName = names.east;
      rightName = names.west;
    }
    hud.setPlayerNames(leftName, rightName);
  }
}
