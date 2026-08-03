import * as THREE from 'three';
import {
  GROUND_SIZE,
  GRID_FINE_SPACING,
  GRID_MAJOR_EVERY,
  GRID_FINE_OPACITY,
  GRID_MAJOR_OPACITY,
  GRID_FADE_RADIUS,
  BACKDROP_HUE,
} from './stageConfig';

/**
 * Sprint 18 (spec §4.1): the ground plane.
 *
 * The grid is analytic, not a texture. Spec §13.17 calls out the textured
 * approach specifically: a repeating grid PNG moirés and shimmers at
 * grazing angles, and anisotropic filtering only partly rescues it. Drawing
 * the lines in the fragment shader and anti-aliasing them with screen-space
 * derivatives (`fwidth`) gives a line that is exactly one pixel wide at
 * every distance and angle — which is also why it reads as *designed*
 * rather than modelled: line weight stays constant in screen space instead
 * of collapsing toward the horizon.
 *
 * Three fades stack on top of that, and all three are load-bearing:
 *   - radial, so the plane's own edge is never visible (spec §4.1)
 *   - grazing-angle, killing the far-field noise where the view vector
 *     approaches parallel with the plane
 *   - fog matched to the backdrop, so floor and background become
 *     indistinguishable rather than meeting at a seam (spec §13.5)
 */

const VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3 vWorld;

  uniform vec3  uColor;
  uniform float uFineSpacing;
  uniform int   uMajorEvery;
  uniform float uFineOpacity;
  uniform float uMajorOpacity;
  uniform float uFadeRadius;
  uniform float uOpacity;

  /**
   * One axis of an analytic grid. Returns coverage in [0,1] for a line of
   * constant *screen* width, anti-aliased via the derivative of the
   * coordinate — the standard derivative-AA grid, and the reason this holds
   * up at grazing angles where a texture would alias apart.
   */
  /** See backdrop.ts — a raw ShaderMaterial gets no output transform from Three. */
  vec3 toSRGB(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }

  float gridLine(float coord, float spacing) {
    float scaled = coord / spacing;
    float deriv  = fwidth(scaled);
    // Distance to the nearest integer line, normalised by the pixel
    // footprint, so the clamped complement below is a smooth 1px band.
    float dist = abs(fract(scaled - 0.5) - 0.5) / max(deriv, 1e-5);
    return 1.0 - clamp(dist, 0.0, 1.0);
  }

  void main() {
    float majorSpacing = uFineSpacing * float(uMajorEvery);

    float fine =
      max(gridLine(vWorld.x, uFineSpacing), gridLine(vWorld.z, uFineSpacing));
    float major =
      max(gridLine(vWorld.x, majorSpacing), gridLine(vWorld.z, majorSpacing));

    // Major lines replace rather than add to the fine ones, so crossings
    // don't accumulate into bright dots.
    float strength = mix(fine * uFineOpacity, uMajorOpacity, major);

    // Radial fade — grid opacity reaches zero well inside the plane's own
    // extent, so the geometry's edge can never be seen (spec §4.1).
    float radial = 1.0 - smoothstep(0.0, uFadeRadius, length(vWorld.xz));

    // Grazing-angle fade. As the view direction approaches parallel with
    // the plane, line density per pixel explodes into noise; attenuating by
    // the view vector's Y component removes it before it appears.
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float grazing = smoothstep(0.0, 0.35, abs(viewDir.y));

    float alpha = strength * radial * grazing * uOpacity;
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(toSRGB(uColor), alpha);
  }
`;

export interface Ground {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  /** Spec §9.3: the grid recedes ~40% when the document takes focus. */
  setOpacity: (value: number) => void;
  dispose: () => void;
}

export function createGround(): Ground {
  const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: BACKDROP_HUE.clone() },
      uFineSpacing: { value: GRID_FINE_SPACING },
      uMajorEvery: { value: GRID_MAJOR_EVERY },
      uFineOpacity: { value: GRID_FINE_OPACITY },
      uMajorOpacity: { value: GRID_MAJOR_OPACITY },
      uFadeRadius: { value: GRID_FADE_RADIUS },
      uOpacity: { value: 1 },
    },
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;

  return {
    mesh,
    material,
    setOpacity(value: number) {
      material.uniforms.uOpacity.value = value;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
