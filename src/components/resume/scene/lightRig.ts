import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import {
  KEY_INTENSITY,
  FILL_INTENSITY,
  RIM_INTENSITY,
  ENV_INTENSITY,
  KEY_ELEVATION_DEG,
  KEY_AZIMUTH_DEG,
  KEY_COLOR,
  FILL_COLOR,
  RIM_COLOR,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  deg,
} from './stageConfig';

/**
 * Sprint 18 (spec §6.1): the studio rig.
 *
 * Three deliberate departures from the reflexive Three.js setup, each one
 * called out in the spec as a "cheap render" tell:
 *
 *   1. Area lights, not point lights (§6.1). A point light produces a
 *      hotspot; a rect area light produces a soft elongated highlight with
 *      a gradient falloff, and that gradient is what "premium" looks like
 *      on a large flat surface.
 *   2. An environment contribution (§5.3). A broad, low-intensity specular
 *      sampled from a soft studio environment is the single thing that
 *      separates "white rectangle" from "sheet of paper".
 *   3. A rim light (§6.1). The cue cheap renders always miss — without it a
 *      pale sheet dissolves into a dark backdrop along its top edge.
 *
 * The environment is assembled procedurally from emissive planes and baked
 * once through PMREMGenerator, rather than shipping an .hdr. Spec §6.1
 * prefers this: it is art-directable in code, costs nothing to download,
 * and only the low frequencies matter for a matte surface anyway.
 */

export interface LightRig {
  group: THREE.Group;
  environment: THREE.Texture;
  /** Spec §7.2: the rig follows the document at ~25% of its rotation, so the specular sweeps. */
  setParallax: (yaw: number, pitch: number) => void;
  setIntensity: (scale: number) => void;
  dispose: () => void;
}

/**
 * Builds the studio environment as a small scene of emissive planes —
 * "lightformers" — and bakes it to a cubemap. A large soft top light, two
 * dimmer side panels, and a dark floor, which is what a real product
 * softbox setup looks like from the subject's point of view.
 */
function bakeEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x0a0a0c);

  const panel = (
    color: number,
    intensity: number,
    width: number,
    height: number,
    position: [number, number, number],
    lookAt: [number, number, number] = [0, 0, 0]
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
    );
    mesh.position.set(...position);
    mesh.lookAt(...lookAt);
    envScene.add(mesh);
    return mesh;
  };

  // Deliberately dim. The environment's job here is the broad *specular*
  // gradient across the sheet (spec §5.3) — not to illuminate it. Letting
  // it carry diffuse as well is what flattens the page: an environment is
  // near-uniform from a flat surface's point of view, so every unit of
  // brightness it adds is a unit that cancels the key's top-to-bottom
  // falloff. Spec §6.3 point 2 wants that falloff at 12-18%, and it can
  // only come from a directional source.
  panel(0xffffff, 0.12, 8, 8, [0, 6, 1]);
  panel(0xdce6ff, 0.08, 5, 7, [-6, 1.5, 3]);
  panel(0xfff8f0, 0.07, 5, 5, [5, 0.5, 3]);
  panel(0xffffff, 0.20, 6, 3, [0, 3, -5]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const target = pmrem.fromScene(envScene, 0.04);

  envScene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
  pmrem.dispose();

  return target.texture;
}

export function createLightRig(renderer: THREE.WebGLRenderer): LightRig {
  // RectAreaLight needs its BRDF lookup tables initialised once per app.
  RectAreaLightUniformsLib.init();

  const group = new THREE.Group();

  // --- key: the top-to-bottom luminance gradient and the specular streak ---
  // Sized and placed for *falloff*, not just brightness: a large light far
  // away illuminates a small page almost uniformly. Bringing it in close
  // enough that the page's top is meaningfully nearer than its bottom is
  // what produces the luminance gradient spec §6.3 asks for.
  const key = new THREE.RectAreaLight(KEY_COLOR, KEY_INTENSITY * 13, PAGE_WIDTH * 1.05, PAGE_HEIGHT * 0.85);
  const keyElevation = deg(KEY_ELEVATION_DEG);
  const keyAzimuth = deg(KEY_AZIMUTH_DEG);
  const keyDistance = 1.75;
  key.position.set(
    -Math.sin(keyAzimuth) * Math.cos(keyElevation) * keyDistance,
    Math.sin(keyElevation) * keyDistance,
    Math.cos(keyAzimuth) * Math.cos(keyElevation) * keyDistance
  );
  key.lookAt(0, 0, 0);
  group.add(key);

  // --- fill: keeps the shadow side off dead blue-grey, never sculpts ---
  const fill = new THREE.RectAreaLight(FILL_COLOR, FILL_INTENSITY * 1.6, PAGE_WIDTH * 4, PAGE_HEIGHT * 3);
  fill.position.set(2.6, -0.4, 2.4);
  fill.lookAt(0, 0, 0);
  group.add(fill);

  // --- rim: separates the pale sheet from the dark backdrop ---
  const rim = new THREE.RectAreaLight(RIM_COLOR, RIM_INTENSITY * 5, PAGE_WIDTH * 2.4, PAGE_HEIGHT * 0.5);
  rim.position.set(0.2, 1.5, -1.8);
  rim.lookAt(0, 0, 0);
  group.add(rim);

  // --- floor bounce: what makes the sheet's thickness readable ---
  // Every light above is at or above the sheet's own height, so its bottom
  // cut edge — which faces straight down — received nothing at all and went
  // to black. The sheet then ended in a hard silhouette against the floor
  // and read as a plane rather than as a physical object with an edge.
  //
  // A dim upward-facing panel just in front of the base fixes it, and is
  // exactly what a real floor does: bounce a little of the key back up under
  // the sheet. Kept very low — this must lift the edge into visibility, not
  // light the page.
  // Placed almost directly under the base and aimed steeply up, so the
  // downward-facing cut edge sees it nearly head-on while the page's front
  // face only catches it at a grazing angle. That separation is what lets it
  // stay dim enough not to flatten the key's top-to-bottom gradient: at a
  // shallower angle it lit the lower half of the page and collapsed the
  // falloff from 15% to under 3%.
  const bounce = new THREE.RectAreaLight(0xfffcfa, 0.8, PAGE_WIDTH * 1.8, PAGE_HEIGHT * 0.3);
  bounce.position.set(0, -0.34, 0.26);
  bounce.lookAt(0, 0.2, 0);
  group.add(bounce);

  // A very low ambient floor so the sheet's shadow side never crushes to
  // pure black on displays with a lifted black point. Deliberately tiny —
  // form comes from the rig above, not from this.
  const ambient = new THREE.AmbientLight(0xffffff, 0.015);
  group.add(ambient);

  const environment = bakeEnvironment(renderer);

  const baseIntensities = {
    key: key.intensity,
    fill: fill.intensity,
    rim: rim.intensity,
    bounce: bounce.intensity,
    ambient: ambient.intensity,
  };

  return {
    group,
    environment,
    setParallax(yaw: number, pitch: number) {
      // Spec §7.2: the rig rotates with the object, at a fraction of its
      // amount. The specular sweep this produces is what sells the motion —
      // far more than the rotation of the sheet itself.
      group.rotation.y = yaw;
      group.rotation.x = pitch;
    },
    setIntensity(scale: number) {
      key.intensity = baseIntensities.key * scale;
      fill.intensity = baseIntensities.fill * scale;
      rim.intensity = baseIntensities.rim * scale;
      bounce.intensity = baseIntensities.bounce * scale;
      ambient.intensity = baseIntensities.ambient * scale;
    },
    dispose() {
      key.dispose?.();
      fill.dispose?.();
      rim.dispose?.();
      bounce.dispose?.();
      environment.dispose();
    },
  };
}

export { ENV_INTENSITY };
