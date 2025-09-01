// src/game/ball/scoring.ts
import type { GameState } from "../../model";
import type { FrameEvents } from "../../model";
import { FREEZE_DURATION_MS } from "../../constants";
import { rotateService } from "../flow";
import { hasGameWinner } from "../flow";
import type { TableEnd } from "shared/types";

export function maybeScoreAndFreeze(s: GameState, events: FrameEvents): GameState {
  const goalX = s.bounds.halfLengthX + s.bounds.ballRadius;
  const x = s.ball.x;

  if (x <= -goalX) {
    return handleGoalCross("east", s, events, goalX);
  }
  if (x >= goalX) {
    return handleGoalCross("west", s, events, goalX);
  }
  return s;
}

function handleGoalCross(tableEnd: TableEnd, s: GameState, events: FrameEvents, goalX: number): GameState {
  let freezeX: number;
  if (tableEnd === "east") {
    freezeX = -goalX;
  } else {
    freezeX = goalX;
  }
  const freezeZ = s.ball.z;

  // FX trigger
  events.explode = { x: freezeX, z: freezeZ };

  let points: typeof s.points;
  if (tableEnd === "east") {
    points = { ...s.points, west: s.points.west + 1 };
  } else {
    points = { ...s.points, east: s.points.east + 1 };
  }

  const scored: GameState = {
    ...s,
    points,
    ball: { x: freezeX, z: freezeZ, vx: 0, vz: 0 },
  };

  const win = hasGameWinner(scored);
  if (win) {
    return {
      ...scored,
      phase: "gameOver",
      gameWinner: win,
      tPauseBtwPointsMs: undefined,
      nextServe: undefined,
    };
  }

  const { nextServer, nextTurns } = rotateService(scored);
  return {
    ...scored,
    phase: "pauseBtwPoints",
    tPauseBtwPointsMs: FREEZE_DURATION_MS,
    nextServe: nextServer,
    server: nextServer,
    serviceTurnsLeft: nextTurns,
  };
}
