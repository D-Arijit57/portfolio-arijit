import * as THREE from 'three';
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  CONTACT_SHADOW_OPACITY,
  SOFT_SHADOW_OPACITY,
  SHADOW_TINT,
} from './stageConfig';

/**
 * Sprint 18 (spec §4.2, §6.2): the shadow.
 *
 * Two terms, and the pairing is the whole idea. Spec §13.7 names
 * "free-floating paper with a distant blurry shadow" as the single most
 * common failure in this genre, and the reason it fails is that one soft
 * blob can only say "there is a light somewhere" — it cannot say "this
 * object is touching that surface". So:
 *
 *   - a TIGHT, dark contact term hugging the sheet's lower edge, with a
 *     falloff of only a few percent of page height. This is the darkest
 *     value in the entire frame (spec §11 value structure: 3-5% luminance)
 *     and it is what the eye actually reads as contact.
 *   - a WIDE, faint ambient term extending away from the key, at 12-18%
 *     opacity. This is what the eye reads as softness.
 *
 * Both are painted into canvas textures on planes rather than produced by a
 * shadow map. Spec §6.2 is explicit that a raw per-frame directional shadow
 * map is wrong here: it renders hard, aliased and badly biased, which
 * contradicts the soft environment it sits inside — and §10.1 point 3 wants
 * shadows baked anyway, since the scene is essentially static.
 *
 * Spec §6.2 also requires the shadow be tinted toward the backdrop's hue
 * rather than pure black; pure black shadows on a coloured dark background
 * read as cut out.
 */

const TEXTURE_SIZE = 256;

/**
 * The textures below are pure alpha masks — white everywhere, carrying only
 * a falloff in the alpha channel — and the shadow's actual colour lives on
 * the material as a float THREE.Color.
 *
 * That split matters for precision. The tint is a linear value of a few
 * thousandths (see SHADOW_TINT), and an 8-bit canvas quantises that to 0 or
 * 1 out of 255, which is the difference between a believable contact shadow
 * and a black rectangle. Alpha, by contrast, spans the full 0-1 range and
 * quantises fine, and it is never colour-managed on the way to the GPU.
 */
function shadowTextureCss(alpha: number): string {
  return `rgba(255, 255, 255, ${alpha})`;
}

/** A soft elliptical falloff, painted once. */
function createRadialTexture(innerAlpha: number, midStop: number, midAlpha: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;

  const half = TEXTURE_SIZE / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, shadowTextureCss(innerAlpha));
  gradient.addColorStop(midStop, shadowTextureCss(midAlpha));
  gradient.addColorStop(1, shadowTextureCss(0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * The contact term: a narrow band, darkest along its centre line and
 * falling off to either side. Painted as a linear gradient rather than a
 * radial one because contact with a plane is a *line*, not a point.
 *
 * Centre-weighted rather than edge-weighted, and that detail is load-
 * bearing. A PlaneGeometry rotated flat maps v=0 to its near edge, so a
 * gradient that ran dark-to-light from v=0 put its dark core most of a page
 * height *in front of* the sheet — under the camera, off the bottom of the
 * frame — while the sheet's actual base sat in the gradient's faint tail.
 * Anchoring the core at the middle lets the plane be centred on the base
 * itself, where the occlusion belongs.
 *
 * With the hero camera only a couple of degrees above the floor, this reads
 * less as a cast shadow than as ambient occlusion at the join — which is
 * the honest description of what darkens a contact line seen edge-on.
 */
function createContactTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;

  const vertical = ctx.createLinearGradient(0, 0, 0, TEXTURE_SIZE);
  vertical.addColorStop(0, shadowTextureCss(0));
  vertical.addColorStop(0.34, shadowTextureCss(CONTACT_SHADOW_OPACITY * 0.35));
  vertical.addColorStop(0.5, shadowTextureCss(CONTACT_SHADOW_OPACITY));
  vertical.addColorStop(0.66, shadowTextureCss(CONTACT_SHADOW_OPACITY * 0.35));
  vertical.addColorStop(1, shadowTextureCss(0));
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // Horizontal falloff, so the band doesn't end in hard vertical edges.
  ctx.globalCompositeOperation = 'destination-in';
  const horizontal = ctx.createLinearGradient(0, 0, TEXTURE_SIZE, 0);
  horizontal.addColorStop(0, 'rgba(0,0,0,0)');
  horizontal.addColorStop(0.16, 'rgba(0,0,0,1)');
  horizontal.addColorStop(0.84, 'rgba(0,0,0,1)');
  horizontal.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export interface StageShadows {
  group: THREE.Group;
  /**
   * Spec §7.2: hover tightens and darkens the contact term by ~8% while the
   * sheet lifts. Lift without a shadow change reads as a bug (spec §4.2).
   */
  setHover: (amount: number) => void;
  /** Tracks the sheet's lower edge during parallax so contact stays believable. */
  setOffset: (x: number, z: number) => void;
  dispose: () => void;
}

export function createShadows(): StageShadows {
  const group = new THREE.Group();

  // --- wide ambient term ---
  const softTexture = createRadialTexture(SOFT_SHADOW_OPACITY, 0.55, SOFT_SHADOW_OPACITY * 0.45);
  const softMaterial = new THREE.MeshBasicMaterial({
    map: softTexture,
    color: SHADOW_TINT.clone(),
    transparent: true,
    depthWrite: false,
  });
  // Extended in Z rather than X: the hero camera sits only a couple of
  // degrees above the ground, so a plane lying flat is seen almost edge-on
  // and its depth is what buys screen coverage, not its width.
  const softGeometry = new THREE.PlaneGeometry(PAGE_WIDTH * 3.4, PAGE_HEIGHT * 3.2);
  const soft = new THREE.Mesh(softGeometry, softMaterial);
  soft.rotation.x = -Math.PI / 2;
  // Offset away from the key (which sits upper-left-front), so the soft
  // term falls to the right and back, as it physically must.
  soft.position.set(PAGE_WIDTH * 0.22, 0.001, PAGE_HEIGHT * 0.40);
  group.add(soft);

  // --- tight contact term ---
  const contactTexture = createContactTexture();
  const contactMaterial = new THREE.MeshBasicMaterial({
    map: contactTexture,
    color: SHADOW_TINT.clone(),
    transparent: true,
    depthWrite: false,
  });
  // Shallow in Z so the occlusion stays tight to the join rather than
  // spreading into a haze the near-level camera would smear across the floor.
  const contactGeometry = new THREE.PlaneGeometry(PAGE_WIDTH * 1.3, PAGE_HEIGHT * 0.5);
  const contact = new THREE.Mesh(contactGeometry, contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  // Centred on the sheet's own base. Single source of truth for the resting
  // depth — setOffset() below used to hardcode its own value and silently
  // overwrite this one every frame.
  const CONTACT_BASE_Z = 0;
  contact.position.set(0, 0.002, CONTACT_BASE_Z);
  group.add(contact);

  const baseContactOpacity = 1;
  const baseContactScale = 1;

  return {
    group,
    setHover(amount: number) {
      // Tighten (scale down) and darken as the sheet lifts.
      const scale = baseContactScale * (1 - 0.06 * amount);
      contact.scale.set(scale, scale, 1);
      contactMaterial.opacity = baseContactOpacity * (1 + 0.08 * amount);
      softMaterial.opacity = 1 - 0.12 * amount;
    },
    setOffset(x: number, z: number) {
      contact.position.x = x;
      contact.position.z = CONTACT_BASE_Z + z;
    },
    dispose() {
      softGeometry.dispose();
      softMaterial.dispose();
      softTexture.dispose();
      contactGeometry.dispose();
      contactMaterial.dispose();
      contactTexture.dispose();
    },
  };
}
