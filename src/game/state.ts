// src/game/state.ts
export type Side = "left" | "right";

export type Paddle = { z: number; vz: number };

export type Ball = {
  x: number;
  z: number;
  vx: number;
  vz: number;
};

export type Phase = "serveLeft" | "serveRight" | "rally" | "pointFreeze" | "gameOver";

export type GameState = {
  paddles: { left: Paddle; right: Paddle };
  ball: Ball;
  scores: { left: number; right: number };
  phase: Phase;

  /** Remaining ms for point freeze (between rallies). */
  tFreezeMs?: number;
  /** Which side will serve next after freeze. */
  nextServe?: Side;

  /** Current server and remaining serves in the current turn. */
  server: Side;
  serviceTurnsLeft: number;

  /** Set when phase === "gameOver". */
  winner?: Side;

  bounds: {
    halfLengthX: number; // table half-length along X
    halfWidthZ: number; // table half-width along Z
    paddleHalfDepthZ: number; // half-size of paddle along Z
    leftPaddleX: number; // world X
    rightPaddleX: number; // world X
    ballRadius: number;
    margin: number;
  };

  params: {
    /** Gameplay/physics knobs */
    paddleSpeed: number;      // m/s
    ballSpeed: number;        // base rally speed (m/s)
    zEnglish: number;         // how much paddle vz affects ball.vz (0..1+)
    restitutionWall: number;

    /** Scoring/service rules (table-tennis style by default) */
    targetScore: number;         // e.g. 11
    winBy: number;               // e.g. 2
    servesPerTurn: number;       // e.g. 2 (pre-deuce)
    deuceServesPerTurn: number;  // e.g. 1 (at deuce)
    /** Deuce threshold; default is targetScore - 1. */
    deuceAt: number;
  };
};

export function createInitialState(bounds: GameState["bounds"]): GameState {
  const targetScore = 11;
  const winBy = 2;
  const servesPerTurn = 2;
  const deuceServesPerTurn = 1;
  const deuceAt = targetScore - 1;

  return {
    paddles: { left: { z: 0, vz: 0 }, right: { z: 0, vz: 0 } },
    ball: { x: 0, z: 0, vx: 0, vz: 0 },
    scores: { left: 0, right: 0 },

    // Boot with left serving first (and 2 serves in this block)
    phase: "serveLeft",
    tFreezeMs: undefined,
    nextServe: undefined,
    server: "left",
    serviceTurnsLeft: servesPerTurn,

    bounds,
    params: {
      // physics/gameplay
      paddleSpeed: 2.4,
      ballSpeed: 2.0,
      zEnglish: 0.75,
      restitutionWall: 1.0,

      // scoring/service rules
      targetScore,
      winBy,
      servesPerTurn,
      deuceServesPerTurn,
      deuceAt,
    },
  };
}
