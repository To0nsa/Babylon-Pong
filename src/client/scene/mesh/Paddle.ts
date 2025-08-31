// src/core/scene/Paddle.ts
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Colors } from "../sceneColor";

export type PaddleHandle = {
  root: TransformNode;
  mesh: AbstractMesh;
  /** Dynamically update the paddle color (used by centralized theming). */
  recolor: (color: Color3) => void;
  dispose: () => void;
};

/**
 * Creates a paddle and auto-positions it against the given table’s top mesh.
 * The paddle is parented to the table root so it follows any table transform.
 * - Boots with DefaultTheme; later recolored by applyTheme(PlayerTheme).
 */
export function addPaddle(
  scene: Scene,
  table: { root: TransformNode; tableTop: AbstractMesh },
  side: "left" | "right",
): PaddleHandle {
  // Fixed geometry defaults
  const margin = 0.006; // small gap from the edge
  const size = { width: 0.035, height: 0.15, depth: 0.3 };

  // Themed boot color
  const color = side === "left" ? Colors.paddleLeft : Colors.paddleRight;

  // Parent for easy cleanup & to inherit table transforms
  const root = new TransformNode(`paddleRoot:${side}`, scene);
  root.parent = table.root;

  // Build paddle mesh
  const mesh = MeshBuilder.CreateBox(
    `paddle:${side}`,
    { width: size.width, height: size.height, depth: size.depth },
    scene,
  );
  mesh.parent = root;

  // Material (color only)
  const mat = new StandardMaterial(`paddleMat:${side}`, scene);
  mat.diffuseColor = color.clone();
  mat.specularColor = Color3.Black();
  mesh.material = mat;

  // Read table dimensions from the actual mesh bounds
  const bb = table.tableTop.getBoundingInfo().boundingBox;
  const halfLenX = bb.extendSize.x; // half of table length (X axis)
  const tableTopY = table.tableTop.position.y;

  // Push paddle against left/right inner edge, with margin
  const sign = side === "left" ? -1 : 1;
  const x = sign * (halfLenX - margin - size.width / 2);

  // Sit on top of the table
  const y = tableTopY + size.height / 2;

  mesh.position.set(x, y, 0);

  // Expose recolor for centralized theming
  const recolor = (c: Color3) => {
    mat.diffuseColor.copyFrom(c);
  };

  return {
    root,
    mesh,
    recolor,
    dispose: () => {
      mesh.dispose();
      mat.dispose();
      root.dispose();
    },
  };
}
