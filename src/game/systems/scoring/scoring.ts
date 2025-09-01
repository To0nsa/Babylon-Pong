// src/game/ball/scoring.ts
import type { GameState } from "../../model";
import type { FrameEvents } from "../../model";
import { FREEZE_DURATION_MS } from "../../constants";
import { rotateService } from "../flow";
import { hasWinner } from "../flow";

export function maybeScoreAndFreeze(
  s: GameState,
  events: FrameEvents,
): GameState {
  const goalX = s.bounds.halfLengthX + s.bounds.margin + s.bounds.ballRadius;
  const x = s.ball.x;

  // Right goal crossed -> left points
  if (x >= goalX) {
    const freezeX = goalX;
    const freezeZ = s.ball.z;
    events.explode = { x: freezeX, z: freezeZ };

    const scored = { ...s, points: { ...s.points, left: s.points.east + 1 } };

    const win = hasWinner(scored);
    if (win) {
      return {
        ...scored,
        phase: "gameOver",
        gameWinner: win,
        tFreezeMs: undefined,
        nextServe: undefined,
        ball: { x: freezeX, z: freezeZ, vx: 0, vz: 0 },
      };
    }

    const { nextServer, nextTurns } = rotateService(scored);
    return {
      ...scored,
      phase: "pointFreeze",
      tFreezeMs: FREEZE_DURATION_MS,
      nextServe: nextServer,
      server: nextServer,
      serviceTurnsLeft: nextTurns,
      ball: { x: freezeX, z: freezeZ, vx: 0, vz: 0 },
    };
  }

  // Left goal crossed -> right points
  if (x <= -goalX) {
    const freezeX = -goalX;
    const freezeZ = s.ball.z;
    events.explode = { x: freezeX, z: freezeZ };

    const scored = { ...s, points: { ...s.points, west: s.points.west + 1 } };

    const win = hasWinner(scored);
    if (win) {
      return {
        ...scored,
        phase: "gameOver",
        gameWinner: win,
        tFreezeMs: undefined,
        nextServe: undefined,
        ball: { x: freezeX, z: freezeZ, vx: 0, vz: 0 },
      };
    }

    const { nextServer, nextTurns } = rotateService(scored);
    return {
      ...scored,
      phase: "pointFreeze",
      tFreezeMs: FREEZE_DURATION_MS,
      nextServe: nextServer,
      server: nextServer,
      serviceTurnsLeft: nextTurns,
      ball: { x: freezeX, z: freezeZ, vx: 0, vz: 0 },
    };
  }

  return s;
}
