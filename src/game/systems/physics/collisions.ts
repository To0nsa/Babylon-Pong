// src/game/systems/collisions.ts
import type { GameState } from "../../model";
import type { FrameEvents } from "../../model";
import { clampZ } from "../utils";

export function collideWalls(
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

export function collidePaddle(s: GameState, dt: number): GameState {
  let { x, z, vx, vz } = s.ball;
  const nextX = x + vx * dt;

  // Left paddle
  if (vx < 0) {
    const plane = s.bounds.leftPaddleX + s.bounds.ballRadius;
    const crosses = x >= plane && nextX <= plane;
    const withinZ =
      Math.abs(z - s.paddles.P1.z) <=
      s.bounds.paddleHalfDepthZ + s.bounds.ballRadius / 2;
    if (crosses && withinZ) {
      const t = (x - plane) / (x - nextX || 1e-6);
      z = z + vz * dt * t;
      x = plane;
      vx = -vx;
      vz = vz + s.paddles.P1.vz * s.params.zEnglish;
      return { ...s, ball: { x, z: clampZ(s, z), vx, vz } };
    }
  }

  // Right paddle
  if (vx > 0) {
    const plane = s.bounds.rightPaddleX - s.bounds.ballRadius;
    const crosses = x <= plane && nextX >= plane;
    const withinZ =
      Math.abs(z - s.paddles.P2.z) <=
      s.bounds.paddleHalfDepthZ + s.bounds.ballRadius / 2;
    if (crosses && withinZ) {
      const t = (plane - x) / (nextX - x || 1e-6);
      z = z + vz * dt * t;
      x = plane;
      vx = -vx;
      vz = vz + s.paddles.P2.vz * s.params.zEnglish;
      return { ...s, ball: { x, z: clampZ(s, z), vx, vz } };
    }
  }

  return s;
}
