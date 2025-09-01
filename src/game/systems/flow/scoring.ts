// src/game/systems/flow/scoring.ts
import type { GameState } from "../../model";
import type { FrameEvents } from "../../model";
import {
  PAUSE_BETWEEN_POINTS_MS,
  PAUSE_BETWEEN_GAMES_MS,
} from "../../constants";
import { rotateService, hasGameWinner } from ".";
import type { TableEnd } from "shared/types";

export function maybeScoreAndFreeze(
  s: GameState,
  events: FrameEvents,
): GameState {
  const goalX = s.bounds.halfLengthX + s.bounds.ballRadius;
  const x = s.ball.x;

  if (x <= -goalX) return handlePointScored("east", s, events, goalX);
  if (x >= goalX) return handlePointScored("west", s, events, goalX);
  return s;
}

function handlePointScored(
  tableEnd: TableEnd,
  s: GameState,
  events: FrameEvents,
  goalX: number,
): GameState {
  const freezeX = tableEnd === "east" ? -goalX : goalX;
  const freezeZ = s.ball.z;

  events.explode = { x: freezeX, z: freezeZ };

  const points =
    tableEnd === "east"
      ? { ...s.points, west: s.points.west + 1 }
      : { ...s.points, east: s.points.east + 1 };

  const scored: GameState = {
    ...s,
    points,
    // Freeze ball exactly at the goal for the pause
    ball: { x: freezeX, z: freezeZ, vx: 0, vz: 0 },
  };

  const win = hasGameWinner(scored);
  if (win) {
    // Game won → no serve here; arm between-games pause, record winner
    return {
      ...scored,
      phase: "gameOver",
      gameWinner: win,
      tPauseBtwGamesMs: PAUSE_BETWEEN_GAMES_MS,
      nextServe: undefined,
    };
  }

  // Normal rally end → short pause between points + next serve info
  const { nextServer, nextTurns } = rotateService(scored);
  return {
    ...scored,
    phase: "pauseBtwPoints",
    tPauseBtwPointsMs: PAUSE_BETWEEN_POINTS_MS,
    nextServe: nextServer,
    server: nextServer,
    serviceTurnsLeft: nextTurns,
  };
}
