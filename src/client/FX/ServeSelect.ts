// src/client/FX/ServeSelect.ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Color3 } from "@babylonjs/core/Maths/math";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { FXContext } from "./context";
import { easeOutQuad } from "./fxUtils";
import type { TableEnd } from "../../shared/types";
import { Colors } from "../scene/sceneColor";
import { SERVE_SELECT_TOTAL_MS } from "../../game/constants";

type Side = "left" | "right";

function sideOf(end: TableEnd): Side {
  // east = left, west = right (matches HUD binding)
  return end === "east" ? "left" : "right";
}

export type ServeSelectOptions = {
  /** Duration of each flicker beat (ms). Lower = faster. Default 120. */
  beatMs?: number;
  /** Hold time for the final (chosen) side (ms). Default 1000. */
  holdMs?: number;
  /** Peak alpha for the glow (0..1). Default 0.35. */
  alpha?: number;
};

export function createServeSelectionFX(
  ctx: FXContext,
  tableTop: AbstractMesh,
  options: ServeSelectOptions = {},
) {
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
      { width: sx, depth: sz, height: 0.006 },
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

  const beatMs = Math.max(40, options.beatMs ?? 120); // faster than old 180
  const holdMs = Math.max(0, options.holdMs ?? 1000);
  const peakAlpha = Math.max(0, Math.min(1, options.alpha ?? 0.35));

  function dispose() {
    left.dispose(false, true);
    right.dispose(false, true);
    leftMat.dispose();
    rightMat.dispose();
  }

  async function trigger(targetEnd: TableEnd): Promise<void> {
    const targetSide = sideOf(targetEnd);

    // Total is constant; split into flicker window + final hold.
    const flickerMs = Math.max(0, SERVE_SELECT_TOTAL_MS - holdMs);

    // Compute an odd number of beats so we end on the target side.
    let beats = Math.max(2, Math.floor(flickerMs / beatMs));
    if (beats % 2 === 1) beats--;

    const start = performance.now();
    const sub = scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() - start;

      if (t < flickerMs) {
        // which beat are we on?
        const i = Math.min(beats - 1, Math.floor(t / beatMs));
        const onOppositeFirst = i % 2 === 0; // 0,2,4… = opposite, 1,3,5… = target
        const active: Side = onOppositeFirst
          ? targetSide === "left"
            ? "right"
            : "left"
          : targetSide;

        const within = (t % beatMs) / beatMs; // 0..1 inside the beat
        const pulse = 1.0 - easeOutQuad(1 - within); // quick rise, soft fade
        const alpha = peakAlpha * pulse;

        left.isVisible = right.isVisible = true;
        leftMat.alpha = active === "left" ? alpha : 0.0;
        rightMat.alpha = active === "right" ? alpha : 0.0;
        return;
      }

      // Flicker done → show final side solid, then schedule hide after holdMs.
      scene.onBeforeRenderObservable.remove(sub);
      left.isVisible = right.isVisible = true;
      leftMat.alpha = targetSide === "left" ? peakAlpha : 0.0;
      rightMat.alpha = targetSide === "right" ? peakAlpha : 0.0;

      setTimeout(() => {
        left.isVisible = right.isVisible = false;
        leftMat.alpha = rightMat.alpha = 0;
      }, holdMs);
    });

    // Resolve when the full effect (flicker + hold) elapsed.
    await new Promise<void>((r) => setTimeout(r, SERVE_SELECT_TOTAL_MS + 20));
  }

  return { trigger, dispose };
}
