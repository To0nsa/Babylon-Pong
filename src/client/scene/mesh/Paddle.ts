// src/core/scene/Paddle.ts
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Colors } from "../sceneColor";

export type PaddleHandle = {
  root: TransformNode;
  mesh: AbstractMesh;
  dispose: () => void;
};

export const PADDLE_SIZE = Object.freeze({
  width: 0.035,
  height: 0.15,
  depth: 0.3,
});
export const PADDLE_MARGIN = 0.006;

export function addPaddle(
  scene: Scene,
  table: { root: TransformNode; tableTop: AbstractMesh },
  side: "left" | "right",
): PaddleHandle {
  // Parent
  const root = new TransformNode(`paddleRoot:${side}`, scene);
  root.parent = table.root;

  // Mesh
  const mesh = MeshBuilder.CreateBox(
    `paddle:${side}`,
    { ...PADDLE_SIZE },
    scene,
  );
  mesh.parent = root;
  mesh.isPickable = false;

  // Matte material (color from centralized palette)
  const mat = new StandardMaterial(`paddleMat:${side}`, scene);
  mat.diffuseColor =
    (side === "left" ? Colors.paddleLeft : Colors.paddleRight).clone();
  mat.specularColor = Colors.material.specularNone;
  mesh.material = mat;
  mat.freeze();

  // Place against inner edge with a margin; sit on top of the table
  const halfLenX = table.tableTop.getBoundingInfo().boundingBox.extendSize.x;
  const sign = side === "left" ? -1 : 1;
  mesh.position.set(
    sign * (halfLenX - PADDLE_MARGIN - PADDLE_SIZE.width / 2),
    table.tableTop.position.y + PADDLE_SIZE.height / 2,
    0,
  );

  const dispose = () => {
    mesh.dispose();
    mat.dispose();
    root.dispose();
  };

  return { root, mesh, dispose };
}
