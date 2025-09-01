// src/game/systems/timing/step.ts
import type { GameState } from "../../model/state";
import type { FrameEvents } from "../../model/types";
import { isPauseBtwPoints, isRallyPhase, isServePhase } from "../utils";
import { collideWalls, collidePaddle } from "../physics";
import { maybeScoreAndFreeze } from "../scoring";
import { stepPauseBtwPoints } from "./pause";

export function stepBallAndCollisions(
  state: GameState,
  dt: number,
): { next: GameState; events: FrameEvents } {
  let s = { ...state };
  const events: FrameEvents = {};

  if (s.phase === "gameOver")
    return { next: s, events };

  if (isServePhase(s.phase))
    s = { ...s, phase: "rally" };

  if (isPauseBtwPoints(s.phase))
    return { next: stepPauseBtwPoints(s, dt), events };

  if (isRallyPhase(s.phase)) {
    const w = collideWalls(s, dt);
    s = w.s;
    if (w.wallHit)
      events.wallHit = w.wallHit;

    s = collidePaddle(s, dt);
    s = { ...s, ball: { ...s.ball, x: s.ball.x + s.ball.vx * dt } };

    // If crossed a goal, enter pause between points & emit explosion
    s = maybeScoreAndFreeze(s, events);
  }

  return { next: s, events };
}
