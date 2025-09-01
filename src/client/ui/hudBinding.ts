import type { GameState } from "../../game/model/state";
import type { DomScoreboardAPI } from "../ui/Scoreboard";

type HudView = {
  mirrored: boolean;
  names?: { east: string; west: string };
};

export function updateHUD(
  hud: DomScoreboardAPI,
  s: GameState,
  view: HudView = { mirrored: false},
) {
  const { mirrored, names } = view;

  // Points into left/right slots
  const leftPts  = mirrored ? s.points.west : s.points.east;
  const rightPts = mirrored ? s.points.east : s.points.west;
  hud.setPoints(leftPts, rightPts);

  // Server highlight rectangle (invert when mirrored)
  const serverOnLeft = mirrored ? s.server === "east" : s.server === "west";
  hud.setServer(serverOnLeft ? "left" : "right");

  // Deuce badge unchanged
  hud.setDeuce(s.points.east >= 10 && s.points.west >= 10);

  // left/right computed from ends + mirror
  if (names) {
    const leftName  = mirrored ? names.west : names.east;
    const rightName = mirrored ? names.east : names.west;
    hud.setPlayerNames(leftName, rightName);
  }
}
