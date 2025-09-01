import type { GameState } from "../../game/model/state";
import type { DomScoreboardAPI } from "../ui/Scoreboard";

export function updateHUD(hud: DomScoreboardAPI, s: GameState) {
  hud.setScores(s.scores.left, s.scores.right);
  hud.setServer(s.server);
  hud.setDeuce(s.scores.left >= 10 && s.scores.right >= 10);
}
