import type { GameState } from "../../game/model/state";
import type { DomScoreboardAPI } from "../ui/Scoreboard";

export function updateHUD(hud: DomScoreboardAPI, s: GameState) {
  hud.setPoints(s.points.east, s.points.west);
  hud.setServer(s.server);
  hud.setDeuce(s.points.east >= 10 && s.points.west >= 10);
}
