// src/client/scene/Ball.ts
import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Colors } from "./Color";

export type BallHandle = {
  root: TransformNode;
  mesh: AbstractMesh;
  recolor: (color: Color3) => void;
  dispose: () => void;
};

export function addBall(
  scene: Scene,
  table: { root: TransformNode; tableTop: AbstractMesh },
): BallHandle {
  const color = Colors.ball;
  const radius = 0.03;

  const root = new TransformNode("ball-root", scene);
  root.parent = table.root;

  const y = table.tableTop.position.y - 30;
  const mesh = MeshBuilder.CreateSphere(
    "ball",
    { diameter: radius * 2, segments: 16 },
    scene,
  );
  mesh.position.set(0, y, 0);
  mesh.parent = root;

  const mat = new StandardMaterial("ball-mat", scene);
  mat.diffuseColor = color.clone();
  mat.specularColor = new Color3(0.02, 0.02, 0.02);
  mesh.material = mat;

  const recolor = (c: Color3) => {
    mat.diffuseColor.copyFrom(c);
  };

  const dispose = () => {
    mesh.dispose();
    mat.dispose();
    root.dispose();
  };

  return { root, mesh, recolor, dispose };
}
