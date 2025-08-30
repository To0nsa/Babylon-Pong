// src/core/scene/TennisTable.ts
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Colors } from "./Color";

export type TableHandle = {
  root: TransformNode;
  tableDepth: AbstractMesh;
  tableTop: AbstractMesh;
  resizeTexture: (pixels: { width: number; height: number }) => void;
  setTextureScale: (factor: number) => void;
  dispose: () => void;
};

export function addTennisTable(scene: Scene): TableHandle {
  // Dimensions (meters)
  const length = 2.74; // X
  const width = 1.525; // Z
  const depth = 0.05; // Y (fixed default)

  // Line widths (meters)
  const borderW = 0.02;
  const centerWidthW = 0.003;
  const centerLengthW = 0.003;

  // Center mark (meters) — slightly larger than the ball
  const centerMarkRadiusM = 0.04; // tweak if you want bigger/smaller
  const drawCenterMark = true;

  const curTop = Colors.tableTop;
  const curBorder = Colors.tableBorder;

  // Root
  const root = new TransformNode("table-root", scene);

  // Depth box
  const depthBox = MeshBuilder.CreateBox(
    "table-depth",
    { width: length, depth: width, height: depth },
    scene,
  );
  depthBox.position.y = -depth / 2;
  depthBox.parent = root;

  const metalBlack = new PBRMaterial("table-depth-mat", scene);
  metalBlack.metallic = 0.0;
  metalBlack.roughness = 0.9;
  metalBlack.albedoColor = new Color3(0.05, 0.05, 0.06);
  depthBox.material = metalBlack;

  // Top plane
  const top = MeshBuilder.CreateBox(
    "table-top",
    { width: length, depth: width, height: 0.001 },
    scene,
  );
  top.position.y = 0.0005;
  top.parent = root;

  // DynamicTexture (fixed authoring base; can be scaled later)
  const BASE = 2048;
  let TX = BASE,
    TY = BASE;

  let dt = new DynamicTexture(
    "tableTopTexture",
    { width: TX, height: TY },
    scene,
    true,
  );
  dt.hasAlpha = false;

  const topMat = new StandardMaterial("tableTopMat", scene);
  topMat.diffuseTexture = dt;
  topMat.specularColor = Color3.Black();
  top.material = topMat;

  const xScale = () => TX / length; // px per meter in X
  const zScale = () => TY / width; // px per meter in Z

  const repaint = (bg: Color3, border: Color3) => {
    const ctx = dt.getContext();
    const css = (c: Color3) =>
      `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`;

    const borderPx = Math.max(
      1,
      Math.round(borderW * Math.min(xScale(), zScale())),
    );
    const centerWidthPx = Math.max(1, Math.round(centerWidthW * zScale()));
    const centerLengthPx = Math.max(1, Math.round(centerLengthW * xScale()));

    // Base color
    ctx.fillStyle = css(bg);
    ctx.fillRect(0, 0, TX, TY);

    // Lines
    ctx.strokeStyle = ctx.fillStyle = css(border);

    // Outer border
    ctx.lineWidth = borderPx;
    const halfB = borderPx / 2;
    ctx.strokeRect(halfB, halfB, TX - borderPx, TY - borderPx);

    // Middle lines
    const midZ = Math.round(TY / 2 - centerWidthPx / 2);
    ctx.fillRect(0, midZ, TX, centerWidthPx);
    const midX = Math.round(TX / 2 - centerLengthPx / 2);
    ctx.fillRect(midX, 0, centerLengthPx, TY);

    // Flat center circle (planar), drawn above the middle line
    if (drawCenterMark) {
      const radiusPx = Math.max(
        2,
        Math.round(centerMarkRadiusM * Math.min(xScale(), zScale())),
      );
      ctx.beginPath();
      ctx.fillStyle = "rgb(0,0,0)";
      ctx.arc(TX / 2, TY / 2, radiusPx, 0, Math.PI * 2);
      ctx.fill();
    }

    dt.update(false);
  };

  // Initial paint with defaults
  repaint(curTop, curBorder);

  const resizeTexture = (pixels: { width: number; height: number }) => {
    const newTX = Math.max(64, Math.floor(pixels.width));
    const newTY = Math.max(64, Math.floor(pixels.height));
    if (newTX === TX && newTY === TY) return;

    const oldDt = dt;
    TX = newTX;
    TY = newTY;

    dt = new DynamicTexture(
      "tableTopTexture",
      { width: TX, height: TY },
      scene,
      true,
    );
    dt.hasAlpha = false;
    topMat.diffuseTexture = dt;
    repaint(curTop, curBorder);
    oldDt.dispose();
  };

  const setTextureScale = (factor: number) => {
    const f = Math.max(0.25, factor);
    resizeTexture({
      width: Math.round(BASE * f),
      height: Math.round(BASE * f),
    });
  };

  const dispose = () => {
    top.dispose();
    depthBox.dispose();
    topMat.dispose();
    dt.dispose();
    metalBlack.dispose();
    root.dispose();
  };

  return {
    root,
    tableDepth: depthBox,
    tableTop: top,
    resizeTexture,
    setTextureScale,
    dispose,
  };
}
