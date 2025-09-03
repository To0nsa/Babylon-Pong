import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Color3 } from "@babylonjs/core/Maths/math";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { FXContext } from "./context";
import { easeOutQuad } from "./fxUtils";
import type { TableEnd } from "../../shared/types";
import { Colors } from "../scene/sceneColor";

type Side = "left" | "right";

function sideOf(end: TableEnd): Side {
  // east = left, west = right (matches HUD binding)
  return end === "east" ? "left" : "right";
}

export function createServeSelectionFX(ctx: FXContext, tableTop: AbstractMesh) {
  const { scene } = ctx;

  // Geometry: two thin overlays hovering over each half of the table top.
  tableTop.computeWorldMatrix(true);
  const bb = tableTop.getBoundingInfo().boundingBox;
  const lengthX = bb.extendSizeWorld.x * 2;
  const widthZ = bb.extendSizeWorld.z * 2;
  const y = tableTop.position.y + 0.003; // tiny lift above top

  const makeHalf = (name: string, sx: number, sz: number, px: number) => {
    const m = MeshBuilder.CreateBox(
      name,
      { width: sx, depth: sz, height: 0.0006 },
      scene,
    );
    m.position.copyFromFloats(px, y, 0);
    m.isPickable = false;
    m.parent = tableTop.parent as any;
    return m;
  };

  // left/right halves
  const halfX = lengthX / 2;
  const left = makeHalf("serveFX-left", halfX, widthZ, -halfX / 2);
  const right = makeHalf("serveFX-right", halfX, widthZ, +halfX / 2);

  const makeMat = (name: string, base: Color3) => {
    const mat = new StandardMaterial(name, scene);
    mat.disableLighting = true;
    mat.diffuseColor.set(0, 0, 0);
    mat.specularColor.set(0, 0, 0);
    mat.emissiveColor = base.clone(); // feed glow layer
    mat.alpha = 0.0;
    mat.alphaMode = Constants.ALPHA_ADD; // bright additive flicker
    mat.backFaceCulling = false;
    mat.separateCullingPass = true;
    return mat;
  };

  const leftMat = makeMat("serveFX-leftMat", Colors.paddleLeft);
  const rightMat = makeMat("serveFX-rightMat", Colors.paddleRight);
  left.material = leftMat;
  right.material = rightMat;

  // Hidden by default
  left.isVisible = right.isVisible = false;

  function dispose() {
    left.dispose(false, true);
    right.dispose(false, true);
    leftMat.dispose();
    rightMat.dispose();
  }

  async function trigger(targetEnd: TableEnd, durationMs = 2000) {
    const targetSide = sideOf(targetEnd);
    const beatMs = 180; // ~11 beats in 2s
    let beats = Math.max(3, Math.floor(durationMs / beatMs));
    if (beats % 2 === 0) beats--; // ensure odd so we end on target side

    const start = performance.now();
    const sub = scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const t = now - start;

      // which beat are we on?
      const i = Math.min(beats - 1, Math.floor(t / beatMs));
      const onOppositeFirst = i % 2 === 0; // 0,2,4… = opposite, 1,3,5… = target
      const active: Side =
        onOppositeFirst
          ? (targetSide === "left" ? "right" : "left")
          : targetSide;

      const within = (t % beatMs) / beatMs; // 0..1 inside the beat
      const pulse = 1.0 - easeOutQuad(1 - within); // quick rise, soft fade
      const alpha = 0.35 * pulse; // emissive glow

      // show/hide and alpha per side
      left.isVisible = right.isVisible = true;
      leftMat.alpha = active === "left" ? alpha : 0.0;
      rightMat.alpha = active === "right" ? alpha : 0.0;

      if (t >= durationMs) {
        scene.onBeforeRenderObservable.remove(sub);
        // leave the last frame lit on the target side (briefly) then clear next tick
        leftMat.alpha = targetSide === "left" ? 0.35 : 0.0;
        rightMat.alpha = targetSide === "right" ? 0.35 : 0.0;
        setTimeout(() => {
          left.isVisible = right.isVisible = false;
          leftMat.alpha = rightMat.alpha = 0;
        }, 40);
      }
    });

    // allow animation to run a frame
    await new Promise<void>((r) => setTimeout(r, durationMs + 60));
  }

  return { trigger, dispose };
}
