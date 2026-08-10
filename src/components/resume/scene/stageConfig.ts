import * as THREE from 'three';

/**
 * Sprint 18 — "Premium 3D Document Preview" spec, Appendix A.
 *
 * Every tunable the stage has, in one place, expressed in the spec's own
 * units. The scene modules read from here and hold no magic numbers of
 * their own, so a critique pass (spec §15 / Appendix B step 8) is a matter
 * of editing this file rather than hunting constants across five modules.
 *
 * UNITS: one world unit == one page height. Every length below is a
 * fraction or multiple of that, exactly as the spec expresses it. This is
 * why the camera distance reads "3.6" and means "3.6 x page height"
 * without a conversion anywhere.
 */

// ---------------------------------------------------------------- page ---

/** A4 aspect. The page is the scene's unit of measure: 1.0 tall by definition. */
export const PAGE_HEIGHT = 1;
export const PAGE_ASPECT = 210 / 297;
export const PAGE_WIDTH = PAGE_HEIGHT * PAGE_ASPECT;

/**
 * Spec §5.1: apparent thickness, not physical. Real 80gsm A4 is 0.03% of
 * its own height — model that and the sheet reads as a decal. 0.8mm on a
 * 297mm page is ~0.27%, which is the "document, not decal" threshold.
 */
// 1.1mm, the upper end of spec §5.1's 0.6-1.2mm band. The hero framing puts
// the page at ~640px tall on screen, so one millimetre is ~2.2px: at 0.8mm
// the edge was a 1.7px sliver that read as an artefact rather than as
// thickness. At 1.1mm it resolves to a legible edge without becoming card
// stock.
export const PAGE_THICKNESS = (1.1 / 297) * PAGE_HEIGHT;
/** Spec §5.1: micro-radius only. Held at the top of the 0.2-0.4mm band so the corner has something to antialias against. */
export const CORNER_RADIUS = (0.4 / 297) * PAGE_HEIGHT;
/**
 * Spec §5.1 allows 0.3-0.8% sag. Raised toward the top of that band: the
 * bow's whole purpose is a specular highlight that sweeps rather than sits,
 * and the closer hero camera makes that sweep more readable, not less.
 */
export const BOW_SAG = 0.007 * PAGE_HEIGHT;

// -------------------------------------------------------------- camera ---

/**
 * Sprint 18.2 — square-on framing.
 *
 * The sheet is now viewed head-on rather than as an angled still-life. That
 * reverses spec §11's yawed hero composition and the reference mockup, and
 * it was a deliberate call: the angle was costing the one acceptance
 * criterion that never passed (§15's "body text legible in the default
 * staged state"). Face-on, the page is not foreshortened, so it fills ~62%
 * of the pane's width instead of ~55%, and its texture is sampled square
 * instead of across a tilted plane.
 *
 * Distance is set so the page fills ~90% of the stage's height with enough
 * headroom that pointer parallax and the hover lift never clip it.
 */
export const CAMERA_FOV_DEG = 28;
export const CAMERA_DISTANCE = 2.15;
/**
 * A few degrees, not zero, and the reason is the floor rather than the page.
 * At exactly 0 the camera sits in the ground plane, which then projects to a
 * single line — the grid and the contact shadow disappear completely. A
 * shallow elevation keeps both readable. Vertical convergence from a
 * slightly high camera reads as natural; it is *yaw* and *roll* that make a
 * square-on page look crooked rather than deliberate.
 */
export const CAMERA_ELEVATION_DEG = 4;
// Spec §3.2 fixes camera azimuth at 0: the camera sits on-axis and the
// *object* provides the yaw. There is deliberately no constant for it —
// placeCamera() has no azimuth term at all, so the invariant is structural
// rather than a value someone could edit.
/** Keeps the page a touch above frame centre so its shadow has room below. */
export const CAMERA_TARGET_Y = 0.012 * PAGE_HEIGHT;

/**
 * Centred. The previous offset existed to make an *angled* composition read
 * as art-directed rather than accidental (spec §11). A square-on document
 * wants the opposite: deliberate symmetry, like a page held up to be read.
 */
export const CAMERA_TARGET_X = 0;

// -------------------------------------------------- object rest pose ---

/**
 * Square-on. Yaw and roll are both zero by intent, not by omission.
 *
 * Spec §13.4 observes that a rotation under ~8 degrees reads as a rendering
 * mistake rather than a decision — so the choice is between a committed
 * angle and none at all, never something in between. This takes none: the
 * page presents like a document held up to be read.
 *
 * Pitch matches CAMERA_ELEVATION_DEG so the page's face stays perpendicular
 * to the view axis. The camera looks slightly down; leaning the sheet back
 * by the same amount cancels that out, which is what makes it read as
 * genuinely square rather than subtly tipped.
 *
 * Physicality now has to come from the edge thickness, the contact shadow,
 * the bow's swept highlight and the receding floor rather than from the
 * pose. Pointer parallax still swings the sheet a few degrees either side of
 * square, so it moves like an object without resting like a tilted one.
 */
export const REST_YAW_DEG = 0;
export const REST_PITCH_DEG = 4;
export const REST_ROLL_DEG = 0;

/** Spec §4.2: the sheet rests. This is the hair of clearance under its lowest edge. */
export const GROUND_CLEARANCE = 0.01 * PAGE_HEIGHT;

// -------------------------------------------------------------- motion ---

/** Spec §7.2 / Appendix A: pointer parallax range. */
export const PARALLAX_YAW_DEG = 4;
export const PARALLAX_PITCH_DEG = 2.5;
/** Spec §7.2: the light rig follows the object — the specular sweep is what sells it. */
export const LIGHT_PARALLAX_FOLLOW = 0.25;
/** Spec §7.2: full return this long after the pointer leaves the panel. */
export const PARALLAX_RETURN_MS = 600;
/** Spec §7.2 / Appendix A: hover lift, and the shadow tightening that must accompany it. */
export const HOVER_LIFT = 0.0075 * PAGE_HEIGHT;
export const HOVER_MS = 200;
/** Spec §7.2: one orchestrated entrance. */
export const ENTRANCE_MS = 600;
export const ENTRANCE_STAGGER_MS = 80;
/** Spec §3.4 / §9.3: staged <-> focused <-> inspect. */
export const STATE_TRANSITION_MS = 480;
/** Spec §7.4: reduced motion collapses transitions to a short cross-fade. */
export const REDUCED_MOTION_MS = 150;

/**
 * Spec §9.3's focused state existed to rotate an angled sheet back to
 * near-frontal and dolly in, "converting the decorative render into a
 * readable one on demand". Square-on framing does the rotating half by
 * default, so what is left for focus is emphasis rather than rescue.
 *
 * The dolly is correspondingly small. It cannot be large: the resting page
 * already occupies ~92% of the stage's height, so the spec's 12% push would
 * take it past 100% and clip. At 0.95 it gains ~5% and the environment
 * recedes, which is enough to say "the document is the subject now" without
 * breaking the never-clip rule (§15).
 */
export const FOCUS_YAW_DEG = 0;
export const FOCUS_PITCH_DEG = 4;
export const FOCUS_DOLLY = 0.95;
export const FOCUS_ELEVATION_DEG = 4;
export const FOCUS_GRID_FADE = 0.45;

/** Spec §3.4: inspect state orbit clamps. */
export const INSPECT_AZIMUTH_DEG = 25;
export const INSPECT_ELEVATION_MIN_DEG = 2;
export const INSPECT_ELEVATION_MAX_DEG = 35;
export const INSPECT_ZOOM_STEPS = [0.85, 1, 1.15, 1.3] as const;

// ------------------------------------------------------------ lighting ---

/** Spec §6.1 / Appendix A: key : fill : rim == 1.0 : 0.20 : 0.40, environment 0.45. */
export const KEY_INTENSITY = 1;
export const FILL_INTENSITY = 0.2;
export const RIM_INTENSITY = 0.4;
export const ENV_INTENSITY = 0.45;
/** Spec §6.1: key at 45 deg elevation, 30 deg azimuth off the camera axis. */
export const KEY_ELEVATION_DEG = 45;
export const KEY_AZIMUTH_DEG = 30;
/**
 * Spec §6.1: slight warm/cool separation between key and fill. Small enough
 * that it is perceptible on white paper but not nameable.
 */
export const KEY_COLOR = 0xfffefc;
export const FILL_COLOR = 0xeef4ff;
export const RIM_COLOR = 0xffffff;

/**
 * Spec §6.3 point 4: ACES Filmic — the reflexive Three.js default — greys
 * and desaturates near-white values, which is precisely wrong for paper.
 * Neutral tone mapping is the single change that most often fixes "why does
 * my paper look grey".
 */
export const TONE_MAPPING = THREE.NeutralToneMapping;
export const TONE_MAPPING_EXPOSURE = 1.1;

// ------------------------------------------------------------ material ---

/** Spec §5.2 / Appendix A. */
export const PAPER_ROUGHNESS = 0.9;
export const PAPER_METALNESS = 0;
export const PAPER_SHEEN = 0.15;
/** Spec §5.1: cut fiber scatters differently — warmer and slightly darker than the face. */
export const PAPER_EDGE_COLOR = 0xf1efea;
export const PAPER_FACE_COLOR = 0xffffff;

// --------------------------------------------------------------- floor ---

/** Spec §4.1: ~40 x 40 page-heights, so its own edge is never reachable. */
export const GROUND_SIZE = 40;
/** Spec §4.1: two frequencies — uniform grids read as graph paper, hierarchical ones as architecture. */
export const GRID_FINE_SPACING = 0.5;
export const GRID_MAJOR_EVERY = 5;
/** Spec §11 value structure: fine 12-15%, major 18-22%. */
export const GRID_FINE_OPACITY = 0.13;
export const GRID_MAJOR_OPACITY = 0.2;
/** Spec §4.1 / Appendix A: opacity reaches zero well before the plane's own edge. */
export const GRID_FADE_RADIUS = 0.55 * (GROUND_SIZE / 2);

// ------------------------------------------------------------ backdrop ---

/**
 * Spec §11 value structure. The ~10:1 spread between backdrop and paper is
 * what makes the sheet appear luminous with no emissive surface anywhere.
 */
// LINEAR values — backdrop.ts runs them through the same tone-map and sRGB
// encode as every lit surface, so these are far smaller than the display
// percentages they produce. Calibrated against measured output: ~10%
// behind the sheet and ~5-6% at the corners on screen, which is spec §11's
// stated structure.
export const BACKDROP_CENTER_LUM = 0.021;
export const BACKDROP_CORNER_LUM = 0.008;
/** Slightly blue-black, matching the reference's dark panel. */
export const BACKDROP_HUE = new THREE.Color(0.62, 0.66, 0.78);
/** Spec §11 / §13.18: vignette, and dithering to kill 8-bit banding. */
export const VIGNETTE_STRENGTH = 0.1;
export const DITHER_AMOUNT = 1.5 / 255;

// ------------------------------------------------------------- shadows ---

/**
 * Spec §4.2 / §11: the tight contact term. This must land at 3-5% display
 * luminance — *below* the backdrop corners at 4-7% — because spec §6.3
 * point 3 makes local contrast adjacent to the lower edge the thing that
 * makes the paper look bright. At 0.72 it blended to roughly the same value
 * as the corners and stopped reading as contact at all.
 */
export const CONTACT_SHADOW_OPACITY = 0.74;
/** Spec §4.2: the wide ambient term. */
export const SOFT_SHADOW_OPACITY = 0.15;
/** Spec §6.2: never pure black — tint toward the backdrop hue at 85-90% darkness. */
/**
 * Linear, like everything else the standard materials consume, and tinted
 * toward the backdrop's blue rather than pure black (spec §6.2) — pure
 * black shadows on a coloured dark background read as cut out.
 *
 * The magnitude is not free to choose: it has to encode *below* the local
 * backdrop or the shadow lightens what it falls on. At 0.0092 linear this
 * resolved to ~0.094 on screen against a backdrop of ~0.067 near the
 * sheet's base, so the "shadow" was brightening the ground. 0.0027 lands
 * near 0.035 display, which is spec §11's contact-core band and genuinely
 * darker than everything around it.
 */
export const SHADOW_TINT = new THREE.Color(0.0025, 0.0028, 0.0038);

// --------------------------------------------------------- performance ---

/** Spec §10.1 point 2: cap at 2 (never 3); drop during motion, restore at rest. */
export const DPR_REST = 2;
export const DPR_MOTION = 1.25;
/** Spec §10.1 point 8: an IDE split drag must not re-rasterize per frame. */
export const RESIZE_DEBOUNCE_MS = 100;
// ------------------------------------------------------------- helpers ---

export const deg = THREE.MathUtils.degToRad;

/**
 * Converts one of the millisecond durations above into a spring half-life.
 *
 * A critically damped spring has no fixed "duration" — it approaches rest
 * asymptotically — so the two are related by how many halvings count as
 * settled. Four is the useful figure: the remaining error is under 1/16th,
 * which is imperceptible at these amplitudes. Routing every spring through
 * this keeps the spec's stated durations as the actual source of truth,
 * rather than leaving them as constants beside hand-picked half-lives that
 * drift away from them.
 */
export function halfLifeFor(durationMs: number): number {
  return durationMs / 1000 / 4;
}
