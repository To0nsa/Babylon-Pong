// src/game/state.ts
export type Side = "left" | "right";

export type Paddle = { z: number; vz: number };

export type Ball = {
  x: number;
  z: number;
  vx: number;
  vz: number;
};

export type Phase = "serveLeft" | "serveRight" | "rally" | "pointFreeze";

export type GameState = {
  paddles: { left: Paddle; right: Paddle };
  ball: Ball;
  scores: { left: number; right: number };
  phase: Phase;

  tFreezeMs?: number;
  nextServe?: Side;

  server: Side;
  serviceTurnsLeft: number;

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
    paddleSpeed: number; // m/s
    ballSpeed: number; // base rally speed (m/s)
    zEnglish: number; // how much paddle vz affects ball.vz (0..1+)
    restitutionWall: number;
  };
};

export function createInitialState(bounds: GameState["bounds"]): GameState {
  return {
    paddles: { left: { z: 0, vz: 0 }, right: { z: 0, vz: 0 } },
    ball: { x: 0, z: 0, vx: 0, vz: 0 },
    scores: { left: 0, right: 0 },

    // Boot with left serving first (and 2 serves in this block)
    phase: "serveLeft",
    tFreezeMs: undefined,
    nextServe: undefined,
    server: "left",
    serviceTurnsLeft: 2,

    bounds,
    params: {
      paddleSpeed: 2.4,
      ballSpeed: 2.0,
      zEnglish: 0.75,
      restitutionWall: 1.0,
    },
  };
}
