// src/render/background/SpaceBackground.ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { Effect } from "@babylonjs/core/Materials/effect";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";

export interface SpaceBackgroundOptions {
  /** Approx. fraction of pixels that become stars (0.0–1.0). Sensible range: 0.0005–0.01 */
  starDensity?: number;
  /** Multiplier for star brightness */
  starIntensity?: number;
  /** RGB for stars */
  starColor?: Color3;
  /** RGB for “space” */
  backgroundColor?: Color3;
  /** Enable subtle twinkle (time-based); default false for deterministic playback */
  twinkle?: boolean;
  /** Twinkle speed when enabled */
  timeScale?: number;
  /** Diameter of the sky sphere */
  diameter?: number;
}

export function addSpaceBackground(
  scene: Scene,
  opts: SpaceBackgroundOptions = {},
) {
  const {
    starDensity = 0.0025,
    starIntensity = 1.0,
    starColor = new Color3(1, 1, 1),
    backgroundColor = new Color3(0.01, 0.01, 0.02),
    twinkle = false,
    timeScale = 0.25,
    diameter = 1000,
  } = opts;

  // Register minimal shaders (scoped names)
  if (!Effect.ShadersStore["spaceBgVertexShader"]) {
    Effect.ShadersStore["spaceBgVertexShader"] = `
      precision highp float;
      attribute vec3 position;
      uniform mat4 worldViewProjection;
      varying vec3 vDir;
      void main(void) {
        vDir = normalize(position); // direction on unit sphere
        gl_Position = worldViewProjection * vec4(position, 1.0);
      }
    `;
  }

  if (!Effect.ShadersStore["spaceBgFragmentShader"]) {
    Effect.ShadersStore["spaceBgFragmentShader"] = `
      precision highp float;
      varying vec3 vDir;

      uniform vec3 uStarColor;
      uniform vec3 uBgColor;
      uniform float uDensity;
      uniform float uIntensity;
      uniform float uTime;    // seconds, may be 0 for deterministic

      // Hash without branches (deterministic for a given vDir)
      float hash31(vec3 p) {
        // Project to 1D then sine noise
        float h = dot(p, vec3(12.9898, 78.233, 45.164));
        return fract(sin(h) * 43758.5453);
      }

      void main(void) {
        // Base space color
        vec3 col = uBgColor;

        // Star seed: use direction only (stable as camera moves)
        float seed = hash31(normalize(vDir));

        // Star threshold from density: lower density -> rarer stars
        float star = step(1.0 - uDensity, seed);

        // Star “softness”: use a second hash to vary intensity a bit
        float sparkle = hash31(vDir.zxy * 1.7 + 3.14159);

        // Optional tiny twinkle (very subtle)
        float tw = 1.0;
        if (uTime > 0.0) {
          // slow, low-amplitude
          tw = 0.85 + 0.15 * sin(6.28318 * (sparkle + uTime));
        }

        float brightness = star * (0.6 + 0.4 * sparkle) * tw * uIntensity;
        col = mix(col, uStarColor, brightness);

        gl_FragColor = vec4(col, 1.0);
      }
    `;
  }

  const material = new ShaderMaterial(
    "spaceBgMat",
    scene,
    { vertex: "spaceBg", fragment: "spaceBg" },
    {
      attributes: ["position"],
      uniforms: [
        "worldViewProjection",
        "uStarColor",
        "uBgColor",
        "uDensity",
        "uIntensity",
        "uTime",
      ],
      needAlphaBlending: false,
      needAlphaTesting: false,
    },
  );

  material.backFaceCulling = false;
  //material.disableLighting = true;

  material.setColor3("uStarColor", starColor);
  material.setColor3("uBgColor", backgroundColor);
  material.setFloat("uDensity", Math.max(0.0, Math.min(1.0, starDensity)));
  material.setFloat("uIntensity", Math.max(0.0, starIntensity));
  material.setFloat("uTime", 0.0); // 0 by default => deterministic

  const sky = MeshBuilder.CreateSphere(
    "spaceSkySphere",
    { diameter, segments: 32, sideOrientation: 1 /* BACKSIDE */ },
    scene,
  );
  sky.material = material;
  sky.isPickable = false;
  sky.infiniteDistance = true; // keep centered on camera
  sky.doNotSyncBoundingInfo = true;

  let t = 0;
  const obs = scene.onBeforeRenderObservable.add(() => {
    if (!twinkle) return;
    t += scene.getEngine().getDeltaTime() * 0.001 * timeScale;
    material.setFloat("uTime", t);
  });

  const dispose = () => {
    scene.onBeforeRenderObservable.remove(obs);
    sky.dispose(false, true);
    material.dispose(true, true);
  };

  return { sky, material, dispose };
}
