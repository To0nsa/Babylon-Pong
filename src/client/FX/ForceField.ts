// src/client/FX/ForceField.ts
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Vector3 } from "@babylonjs/core/Maths/math";

import type { FXContext } from "./context";
import { FXColors } from "./fxColors";

import type { Side } from "./manager";

/**
 * Hex “shield” pulse on top/bottom walls.
 * - Uses a simple disc tessellation (6) to form a hex; no line meshes or earcut.
 * - Emissive + Fresnel rim for glow-y look.
 */
export function createForceFieldFX(
  ctx: FXContext,
  wallZTop: number,
  wallZBottom: number,
  ballRadius: number,
): {
  trigger: (side: Side, x: number, y: number) => void;
  dispose?: () => void;
} {
  const { scene } = ctx;

  const lifeMs = 400;
  const hexRadius = ballRadius * 1.5;

  function spawnPulse(side: Side, x: number, y: number) {
    const z = side === "top" ? wallZTop : wallZBottom;
    const hexMesh = MeshBuilder.CreateDisc(
      `ff-hex:${side}:${performance.now()}`,
      { radius: hexRadius, tessellation: 6, sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    hexMesh.position.copyFromFloats(x, y, z);
    hexMesh.lookAt(new Vector3(x, y, 0));

    const mat = new StandardMaterial(`ff-hex-core:${side}`, scene);
    mat.disableLighting = true;
    mat.emissiveColor = FXColors.core.scale(0.4);
    mat.diffuseColor.set(0, 0, 0);
    mat.specularColor.set(0, 0, 0);
    mat.alpha = 0.22;
    mat.backFaceCulling = false;
    mat.separateCullingPass = true;

    const fres = new FresnelParameters();
    fres.isEnabled = true;
    fres.power = 2.0;
    fres.bias = 0.2;
    fres.leftColor = FXColors.core.scale(1.8);
    fres.rightColor = FXColors.core.scale(1.8);
    mat.emissiveFresnelParameters = fres;

    hexMesh.material = mat;

    const start = performance.now();
    const startScale = 0.85;
    const endScale = 1.12;

    const sub = scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - start) / lifeMs);
      const s = startScale + (endScale - startScale) * (1 - (1 - t) * (1 - t));
      hexMesh.scaling.set(s, s, 1);
      const k = 1 - t;
      mat.alpha = 0.22 * k * k;

      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(sub);
        hexMesh.dispose(false, true);
        mat.dispose();
      }
    });
  }

  return {
    trigger(side: Side, x: number, y: number) {
      spawnPulse(side, x, y);
    },
    // dispose?: no resources to keep;
  };
}
