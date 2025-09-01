// src/game/systems/step.ts
import type { GameState } from "../state";
import type { FrameEvents } from "./types";
import { isFreezePhase, isServePhase } from "./utils";
import { collideWalls, collidePaddle } from "./collisions";
import { maybeScoreAndFreeze } from "./scoring";
import { stepFreeze } from "./freeze";

export function stepBallAndCollisions(
  state: GameState,
  dt: number,
): { next: GameState; events: FrameEvents } {
  let s = { ...state };
  const events: FrameEvents = {};

  if (s.phase === "gameOver") return { next: s, events };

  if (isServePhase(s.phase)) s = { ...s, phase: "rally" };
  if (isFreezePhase(s.phase)) return { next: stepFreeze(s, dt), events };

  // ----- Normal rally -----
  const w = collideWalls(s, dt);
  s = w.s;
  if (w.wallHit) events.wallHit = w.wallHit;

  s = collidePaddle(s, dt);

  // Integrate X directly here so we can detect crossing this frame
  s = { ...s, ball: { ...s.ball, x: s.ball.x + s.ball.vx * dt } };

  // If crossed a goal, enter freeze & emit explosion
  s = maybeScoreAndFreeze(s, events);

  return { next: s, events };
}
