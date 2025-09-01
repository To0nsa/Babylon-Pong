// src/game/systems/ball.ts
import type { GameState, Side } from "../state";

export type FrameEvents = {
  wallHit?: { side: "top" | "bottom"; x: number; z: number };
  explode?: { x: number; z: number }; // NEW: tell render to play explosion
};

const FREEZE_DURATION_MS = 600; // feel free to tune

/* --------------------------------- utils --------------------------------- */

function clampZ(s: GameState, z: number): number {
  const max = s.bounds.halfWidthZ - s.bounds.margin - s.bounds.ballRadius;
  return Math.max(-max, Math.min(max, z));
}

function isServePhase(p: GameState["phase"]): boolean {
  return p === "serveLeft" || p === "serveRight";
}

function isFreezePhase(p: GameState["phase"]): p is "pointFreeze" {
  return p === "pointFreeze";
}

function inDeuceMode(s: GameState): boolean {
  const deuceAt = s.params.deuceAt ?? s.params.targetScore - 1;
  return s.scores.left >= deuceAt && s.scores.right >= deuceAt;
}

function serveFrom(side: "left" | "right", s: GameState): GameState {
  const dir = side === "left" ? 1 : -1;
  const angle = 0;
  return {
    ...s,
    paddles: {
      left: { z: 0, vz: 0 },
      right: { z: 0, vz: 0 },
    },
    phase: side === "left" ? "serveLeft" : "serveRight",
    tFreezeMs: undefined,
    nextServe: undefined,
    ball: {
      x: 0,
      z: 0,
      vx: dir * s.params.ballSpeed * Math.cos(angle),
      vz: s.params.ballSpeed * Math.sin(angle),
    },
  };
}

/** Table-tennis service rotation:
 * - Before deuce: 2 serves each (e.g., L,L,R,R, …)
 * - From 10–10 onward: alternate every point (L,R,L,R, …)
 */
function rotateService(s: GameState): { nextServer: "left" | "right"; nextTurns: number } {
  if (inDeuceMode(s)) {
    const next = s.server === "left" ? "right" : "left";
    return { nextServer: next, nextTurns: s.params.deuceServesPerTurn };
  }

  if (s.serviceTurnsLeft > 1) {
    return { nextServer: s.server, nextTurns: s.serviceTurnsLeft - 1 };
  }
  return { nextServer: s.server === "left" ? "right" : "left", nextTurns: s.params.servesPerTurn };
}

function hasWinner(s: GameState): Side | null {
  const { left, right } = s.scores;
  const { targetScore, winBy } = s.params;

  const lead = Math.abs(left - right);
  if (left >= targetScore || right >= targetScore) {
    if (lead >= winBy) return left > right ? "left" : "right";
  }
  return null;
}

/* ----------------------------- collisions core ---------------------------- */

function collideWalls(
  s: GameState,
  dt: number,
): { s: GameState; wallHit?: FrameEvents["wallHit"] } {
  let { x, z, vx, vz } = s.ball;

  const nextZ = z + vz * dt;
  const zMax = s.bounds.halfWidthZ - s.bounds.margin - s.bounds.ballRadius;

  let wallHit: FrameEvents["wallHit"] | undefined;

  if (nextZ > zMax && vz > 0) {
    const overshoot = nextZ - zMax;
    z = zMax - overshoot;
    vz = -vz * s.params.restitutionWall;
    wallHit = { side: "top", x, z };
  } else if (nextZ < -zMax && vz < 0) {
    const overshoot = -zMax - nextZ;
    z = -zMax + overshoot;
    vz = -vz * s.params.restitutionWall;
    wallHit = { side: "bottom", x, z };
  } else {
    z = nextZ;
  }

  return { s: { ...s, ball: { x, z, vx, vz } }, wallHit };
}

function collidePaddle(s: GameState, dt: number): GameState {
  let { x, z, vx, vz } = s.ball;
  const nextX = x + vx * dt;

  // Left paddle
  if (vx < 0) {
    const plane = s.bounds.leftPaddleX + s.bounds.ballRadius;
    const crosses = x >= plane && nextX <= plane;
    const withinZ =
      Math.abs(z - s.paddles.left.z) <=
      s.bounds.paddleHalfDepthZ + s.bounds.ballRadius / 2;
    if (crosses && withinZ) {
      const t = (x - plane) / (x - nextX || 1e-6);
      z = z + vz * dt * t;
      x = plane;
      vx = -vx;
      vz = vz + s.paddles.left.vz * s.params.zEnglish;
      return { ...s, ball: { x, z: clampZ(s, z), vx, vz } };
    }
  }

  // Right paddle
  if (vx > 0) {
    const plane = s.bounds.rightPaddleX - s.bounds.ballRadius;
    const crosses = x <= plane && nextX >= plane;
    const withinZ =
      Math.abs(z - s.paddles.right.z) <=
      s.bounds.paddleHalfDepthZ + s.bounds.ballRadius / 2;
    if (crosses && withinZ) {
      const t = (plane - x) / (nextX - x || 1e-6);
      z = z + vz * dt * t;
      x = plane;
      vx = -vx;
      vz = vz + s.paddles.right.vz * s.params.zEnglish;
      return { ...s, ball: { x, z: clampZ(s, z), vx, vz } };
    }
  }

  return s;
}

/* --------------------------- scoring + freeze flow ------------------------ */

function maybeScoreAndFreeze(s: GameState, events: FrameEvents): GameState {
  const goalX = s.bounds.halfLengthX + s.bounds.margin + s.bounds.ballRadius;
  const x = s.ball.x;

  // Right goal crossed -> left scores
  if (x >= goalX) {
    const freezeX = goalX;
    const freezeZ = s.ball.z;
    events.explode = { x: freezeX, z: freezeZ };

    const scored = { ...s, scores: { ...s.scores, left: s.scores.left + 1 } };

    // NEW: check win first
    const win = hasWinner(scored);
    if (win) {
      return {
        ...scored,
        phase: "gameOver",
        winner: win,
        tFreezeMs: undefined,
        nextServe: undefined,
        ball: { x: freezeX, z: freezeZ, vx: 0, vz: 0 },
      };
    }

    // Otherwise: rotate service & freeze between points
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

  // Left goal crossed -> right scores
  if (x <= -goalX) {
    const freezeX = -goalX;
    const freezeZ = s.ball.z;
    events.explode = { x: freezeX, z: freezeZ };

    const scored = { ...s, scores: { ...s.scores, right: s.scores.right + 1 } };

    // NEW: check win first
    const win = hasWinner(scored);
    if (win) {
      return {
        ...scored,
        phase: "gameOver",
        winner: win,
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

function stepFreeze(s: GameState, dt: number): GameState {
  const left = Math.max(0, (s.tFreezeMs ?? 0) - dt * 1000);
  if (left > 0) {
    return { ...s, tFreezeMs: left };
  }
  // After freeze, serve **from the side chosen by rotation**
  const serveSide = s.nextServe ?? s.server ?? "left";
  return serveFrom(serveSide, s);
}

/* ---------------------------------- step ---------------------------------- */

export function stepBallAndCollisions(
  state: GameState,
  dt: number,
): { next: GameState; events: FrameEvents } {
  let s = { ...state };
  const events: FrameEvents = {};

    if (s.phase === "gameOver") {
      return { next: s, events };
    }

  if (isServePhase(s.phase)) {
    s = { ...s, phase: "rally" };
  }

  if (isFreezePhase(s.phase)) {
    return { next: stepFreeze(s, dt), events };
  }

  // ----- Normal rally -----
  const w = collideWalls(s, dt);
  s = w.s;
  if (w.wallHit) events.wallHit = w.wallHit;

  s = collidePaddle(s, dt);

  // Integrate X directly here so we can detect crossing
  s = { ...s, ball: { ...s.ball, x: s.ball.x + s.ball.vx * dt } };

  // If crossed a goal, enter freeze & emit explosion
  s = maybeScoreAndFreeze(s, events);

  return { next: s, events };
}
