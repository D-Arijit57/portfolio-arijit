import * as THREE from 'three';
import {
  BACKDROP_CENTER_LUM,
  BACKDROP_CORNER_LUM,
  BACKDROP_HUE,
  VIGNETTE_STRENGTH,
  DITHER_AMOUNT,
} from './stageConfig';

/**
 * Sprint 18 (spec §11, §13.18): the backdrop.
 *
 * A screen-space radial gradient drawn as a full-screen triangle behind
 * everything else — not a skybox, not a CSS layer under a transparent
 * canvas. Drawing it in-scene is what lets the ground's fog match it
 * exactly, which is the whole point of §13.5's "no seam between floor and
 * backdrop".
 *
 * The dithering is not a nicety. A near-black radial gradient across ~700px
 * traverses only a handful of 8-bit levels, so it bands into visible rings
 * on most displays — spec §13.18 lists this as a "looks cheap" tell. One
 * cheap ordered-dither term in the fragment shader removes it entirely, and
 * spec §10.1 point 6 calls it out as the single exception to the
 * no-post-processing rule.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Full-screen quad: bypass the camera entirely so the backdrop is
    // always exactly the viewport, at any aspect or camera state.
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform vec3  uHue;
  uniform float uCenterLum;
  uniform float uCornerLum;
  uniform float uVignette;
  uniform float uDither;
  uniform float uAspect;

  /** Cheap ordered dither — one hash, no texture, enough to break 8-bit banding. */
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  /**
   * Explicit linear -> sRGB encode.
   *
   * A raw ShaderMaterial receives no output transform from Three, so this
   * shader has to perform the one every standard material gets for free.
   * Doing it by hand rather than via #include <colorspace_fragment> because
   * that chunk only calls linearToOutputTexel() — the function itself comes
   * from colorspace_pars_fragment, and including one without the other
   * silently yields no conversion at all.
   *
   * Getting this wrong is not a subtle grading issue: it puts this surface a
   * whole gamma curve away from every lit surface in the scene, which is how
   * a near-black shadow tint ends up rendering brighter than its backdrop.
   */
  vec3 toSRGB(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }

  void main() {
    // Aspect-corrected radial distance, so the falloff stays circular
    // rather than stretching with the panel.
    vec2 centered = (vUv - 0.5) * vec2(uAspect, 1.0);
    float dist = length(centered) / length(vec2(uAspect, 1.0) * 0.5);

    // Gentle radial falloff from centre to corner (spec §11 value structure).
    float lum = mix(uCenterLum, uCornerLum, smoothstep(0.0, 1.0, dist));

    // Vignette on top, at a very large radius so it is never individually
    // perceptible (spec §11).
    lum *= 1.0 - uVignette * smoothstep(0.45, 1.0, dist);

    vec3 color = toSRGB(uHue * lum);
    // Dither *after* encoding, in display space — that is where the banding
    // actually lives, and where one 8-bit step is the quantity being broken up.
    color += (hash(gl_FragCoord.xy) - 0.5) * uDither;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface Backdrop {
  mesh: THREE.Mesh;
  setAspect: (aspect: number) => void;
  dispose: () => void;
}

export function createBackdrop(): Backdrop {
  const geometry = new THREE.PlaneGeometry(1, 1);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uHue: { value: BACKDROP_HUE.clone() },
      uCenterLum: { value: BACKDROP_CENTER_LUM },
      uCornerLum: { value: BACKDROP_CORNER_LUM },
      uVignette: { value: VIGNETTE_STRENGTH },
      uDither: { value: DITHER_AMOUNT },
      uAspect: { value: 1 },
    },
  });

  const mesh = new THREE.Mesh(geometry, material);
  // Drawn first, and never culled — its vertex shader ignores the camera,
  // so Three's frustum test would throw it away at the wrong moments.
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;

  return {
    mesh,
    setAspect(aspect: number) {
      material.uniforms.uAspect.value = aspect;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
