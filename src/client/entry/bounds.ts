import type { WorldKit } from "../scene";
import type { GameState } from "../../game/state";

/** Read Babylon geometry once and derive headless bounds + zMax for FX. */
export function computeBounds(world: WorldKit, margin = 0.006): {
  bounds: GameState["bounds"];
  zMax: number;
} {
  const { table, paddles: { left, right }, ball } = world;

  const tableBB = table.tableTop.getBoundingInfo().boundingBox;
  const halfLengthX = tableBB.extendSize.x;
  const halfWidthZ  = tableBB.extendSize.z;

  const leftBB = left.mesh.getBoundingInfo().boundingBox;
  const paddleHalfDepthZ = leftBB.extendSize.z;

  const ballInfo   = ball.mesh.getBoundingInfo();
  const ballRadius = ballInfo.boundingSphere.radiusWorld;

  const leftPaddleX  = left.mesh.position.x;
  const rightPaddleX = right.mesh.position.x;

  const zMax = halfWidthZ - margin - ballRadius;

  const bounds: GameState["bounds"] = {
    halfLengthX,
    halfWidthZ,
    paddleHalfDepthZ,
    leftPaddleX,
    rightPaddleX,
    ballRadius,
    margin,
  };

  return { bounds, zMax };
}
