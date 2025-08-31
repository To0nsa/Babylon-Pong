// src/core/scene/TennisTable.ts
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Colors } from "../sceneColor";

export type TableHandle = {
  root: TransformNode;
  tableDepth: AbstractMesh;
  tableTop: AbstractMesh;
  dispose: () => void;
};

export function addTable(scene: Scene): TableHandle {
  // Dimensions (meters)
  const length = 2.74;  // X
  const width  = 1.525; // Z
  const depth  = 0.05;  // Y

  // Line widths (meters)
  const borderW       = 0.02;
  const centerWidthW  = 0.003; // horizontal across X (thickness along Z)
  const centerLengthW = 0.003; // vertical across Z (thickness along X)

  // Root
  const root = new TransformNode("table-root", scene);

  // Table slab (depth)
  const depthBox = MeshBuilder.CreateBox(
    "table-depth",
    { width: length, depth: width, height: depth },
    scene,
  );
  depthBox.position.y = -depth / 2;
  depthBox.parent = root;

  // Matte materials
  const tableDepthMat = new StandardMaterial("table-depth-mat", scene);
  tableDepthMat.diffuseColor  = Colors.tableDepth;
  tableDepthMat.specularColor = Colors.material.specularNone;

  const topMat = new StandardMaterial("tableTopMat", scene);
  topMat.diffuseColor  = Colors.tableTop;
  topMat.specularColor = Colors.material.specularNone;

  const lineMat = new StandardMaterial("tableLineMat", scene);
  lineMat.diffuseColor  = Colors.tableBorder;
  lineMat.specularColor = Colors.material.specularNone;

  // Apply slab material
  depthBox.material = tableDepthMat;

  // Top plane (very thin box for stable bounds)
  const topHeight = 0.001;
  const top = MeshBuilder.CreateBox(
    "table-top",
    { width: length, depth: width, height: topHeight },
    scene,
  );
  top.position.y = topHeight / 2;
  top.parent = root;
  top.material = topMat;

  // === Lines as thin strips (no textures) ===
  const lineY = top.position.y + topHeight / 2; // hover above top

  const makeStrip = (
    name: string,
    sx: number,
    sz: number,
    px: number,
    pz: number,
  ) => {
    const m = MeshBuilder.CreateBox(
      name,
      { width: sx, depth: sz, height: 0.0006 },
      scene,
    );
    m.position.set(px, lineY, pz);
    m.parent = root;
    m.material = lineMat;
    m.isPickable = false;
    return m;
  };

  const halfX = length / 2;
  const halfZ = width / 2;
  const strips: AbstractMesh[] = [
    // perimeter
    makeStrip("border-left",  borderW, width,  -halfX + borderW / 2, 0),
    makeStrip("border-right", borderW, width,   halfX - borderW / 2, 0),
    makeStrip("border-top",   length,  borderW, 0,  halfZ - borderW / 2),
    makeStrip("border-bottom",length,  borderW, 0, -halfZ + borderW / 2),
    // center cross
    makeStrip("center-width",  length,        centerWidthW,  0, 0),
    makeStrip("center-length", centerLengthW, width,         0, 0),
  ];

  // Optional perf: freeze static materials after assignment
  tableDepthMat.freeze();
  topMat.freeze();
  lineMat.freeze();

  const dispose = () => {
    for (const s of strips) s.dispose();
    top.dispose();
    depthBox.dispose();
    lineMat.dispose();
    topMat.dispose();
    tableDepthMat.dispose();
    root.dispose();
  };

  return { root, tableDepth: depthBox, tableTop: top, dispose };
}
