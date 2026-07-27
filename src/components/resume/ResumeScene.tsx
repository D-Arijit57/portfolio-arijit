import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RESUME_PAGE_WIDTH_PX, RESUME_PAGE_HEIGHT_PX } from './specification/resumeSpec';
import { prefersReducedMotion } from '../../lib/typingReveal';

export interface ResumeSceneHandle {
  /** Eases the camera/orbit back to its dead-on resting view and restores the fit-to-view distance (does not touch the texture). */
  resetView: () => void;
}

interface ResumeSceneProps {
  /** The rasterized resume (see preview/pdfTexture.ts), once ready. null while assembling. */
  canvas: HTMLCanvasElement | null;
  /** Bump whenever `canvas` has been re-rasterized in place and the texture must be rebuilt. */
  version: number;
  /** Sprint 16: true from the moment a build starts until it resolves — drives the Assembling/Resolve reconstruction below, independent of whether `canvas` itself has changed yet. */
  isAssembling: boolean;
}

const PAPER_ASPECT = RESUME_PAGE_HEIGHT_PX / RESUME_PAGE_WIDTH_PX;
const PAPER_WIDTH = 1.5;
const PAPER_HEIGHT = PAPER_WIDTH * PAPER_ASPECT;
const PAPER_DEPTH = 0.012;

// Sprint 12 Phase 3: primary float + a second, non-harmonic-ratio sine (0.37x
// the primary frequency) so the combined motion's apparent period is many
// minutes long instead of the ~14s a single sine repeats at — reads as
// gently existing in the scene rather than an obviously looping animation.
// A tiny rotation.z sway (also off-ratio) sells the same "settled paper"
// feel without adding a third position axis.
const FLOAT_AMPLITUDE = 0.045;
const FLOAT_SPEED = 0.42;
const FLOAT_SECONDARY_RATIO = 0.37;
const FLOAT_SECONDARY_AMPLITUDE = FLOAT_AMPLITUDE * 0.32;
const SWAY_AMPLITUDE = 0.012;
const SWAY_SPEED_RATIO = 0.63;

// Sprint 12 Phase 3: half-lives (seconds), not per-frame factors — a
// `+= (target - current) * 0.06` constant applied once per animation frame
// would visibly ease at a different real-world speed on a 30Hz vs 120Hz
// display. dampen() below scales by `dt` so easing speed is identical
// regardless of refresh rate. Used by Reset View's smooth settle.
const RESET_HALF_LIFE_S = 0.2;
const RESET_EPSILON = 0.001;

// Resume Studio redesign: the paper's own fixed resting tilt (mesh-level,
// independent of camera orbit) — it's never perfectly flat, unlike the old
// hover-parallax system this replaces (which rested at 0,0 the instant the
// cursor left). Midpoints of the requested -12to-18/6to10 degree ranges.
const REST_ROTATION_Y = THREE.MathUtils.degToRad(-15);
const REST_ROTATION_X = THREE.MathUtils.degToRad(8);

// OrbitControls constraints — camera orbits around its dead-on home
// position within these bounds; the paper's own REST_ROTATION_* above is a
// completely separate transform, so the two compose rather than fight.
// "Google Model Viewer, not a free 3D editor": generous enough to feel like
// real interaction, tight enough that the page can never be seen edge-on,
// from directly overhead, or from behind.
const ORBIT_AZIMUTH_RANGE_DEG = 26;
const ORBIT_POLAR_RANGE_DEG = 18;
const ORBIT_MIN_DISTANCE_RATIO = 0.72;
const ORBIT_MAX_DISTANCE_RATIO = 1.45;
const ORBIT_PAN_LIMIT = 0.16;
const ORBIT_DAMPING_FACTOR = 0.08;

// One-time entrance: fade in / translate up / rotate into the resting pose,
// separate from (and independent of) the Assembling/Resolve *content*
// reveal below — this one is about the physical paper object arriving in
// frame, which plays once on mount regardless of how long the content
// itself takes to resolve.
const ENTRANCE_DURATION_S = 0.6; // within the requested 500-700ms
const ENTRANCE_START_Y_OFFSET = -0.18;
const ENTRANCE_START_ROTATION_SCALE = 0.35; // fraction of resting tilt at t=0

const CAMERA_FOV_DEG = 36;
// Target fraction of the constraining viewport dimension the page should
// fill — midpoint of the requested 80-85% range.
const FIT_FRACTION = 0.82;
const FALLBACK_DISTANCE = 2.9;

/** Frame-rate-independent exponential ease: `current` moves toward `target`, closing half the remaining distance every `halfLifeS` seconds regardless of `dt`. */
function dampen(current: number, target: number, halfLifeS: number, dt: number): number {
  const factor = 1 - Math.pow(2, -dt / halfLifeS);
  return current + (target - current) * factor;
}

// Sprint 16: Assembling/Resolve reconstruction — replaces Phase 3's dim->white
// color-lerp entirely (single visual language, not layered). The paper's
// front face is backed by one persistent "display canvas" whose content this
// component composites by hand each frame; the same CanvasTexture/needsUpdate
// mechanism Phase 3 already used, just with richer content than a flat color.
//
// Assembling: a field of faint monospace glyphs — generated once (mount-time,
// not per-frame — a few thousand fillText calls is a one-off cost, not a
// render-loop cost), then only ever re-composited at varying alpha for a
// slow "breathing" pulse. Not code the user could read, not Matrix-style
// rain — a static field standing in for "unresolved information."
//
// Resolve: once real data arrives (and the minimum presentation time in
// ResumeWorkspace.tsx has elapsed), a single ~260ms crossfade blends the
// glyph field into the crisp rasterized resume, holistically (the whole
// page at once, no moving boundary/scanline) — "order emerging from noise."
// After that one crossfade, the front face swaps to a fresh native-resolution
// texture built directly from the real canvas, so final quality/anisotropy
// exactly matches what Phase 3 already guaranteed — the display canvas is
// only ever the source of truth during the transient assembling/resolve
// states, never for the settled final view.
const RESOLVE_MS = 260;
const BREATH_PERIOD_S = 3.6;
const BREATH_MIN_ALPHA = 0.5;
const BREATH_MAX_ALPHA = 0.8;
// 2x the page's own base resolution (resumeSpec.ts) — sharp enough for a
// ~260ms transient blend without being wastefully large; the final settled
// texture is always built from the real, full-resolution rasterized canvas.
const DISPLAY_CANVAS_WIDTH = RESUME_PAGE_WIDTH_PX * 2;
const DISPLAY_CANVAS_HEIGHT = RESUME_PAGE_HEIGHT_PX * 2;
const PAPER_BASE_COLOR_CSS = '#f3f3f3';
const NOISE_GLYPHS = '01{}[]()<>/\\;:=+-#*'.split('');

/** Generated once per mount — a static field of faint monospace glyphs on a transparent background, drawn at a fixed grid so it never needs to be redrawn per frame, only recomposited at varying alpha. */
function createGlyphNoiseSource(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = DISPLAY_CANVAS_WIDTH;
  canvas.height = DISPLAY_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.font = '22px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = 'rgba(20, 20, 20, 0.15)';
  ctx.textBaseline = 'top';
  const cellW = 28;
  const cellH = 32;
  for (let y = 10; y < canvas.height; y += cellH) {
    for (let x = 10; x < canvas.width; x += cellW) {
      ctx.fillText(NOISE_GLYPHS[Math.floor(Math.random() * NOISE_GLYPHS.length)], x, y);
    }
  }
  return canvas;
}

/** Assembling frame: opaque paper-base fill, glyph field composited on top at `alpha` (the "breathing" value). Always fills the base first so the canvas never has a transparent/black gap — the material never runs `transparent: true`. */
function paintAssembling(ctx: CanvasRenderingContext2D, noiseSource: HTMLCanvasElement, alpha: number, w: number, h: number) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAPER_BASE_COLOR_CSS;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = alpha;
  ctx.drawImage(noiseSource, 0, 0, w, h);
  ctx.globalAlpha = 1;
}

/** Resolve frame: a holistic crossfade — the glyph field fades out while the real rasterized resume fades in, over the whole page at once (no scanline/boundary). */
function paintResolve(
  ctx: CanvasRenderingContext2D,
  noiseSource: HTMLCanvasElement,
  realCanvas: HTMLCanvasElement,
  progress: number,
  w: number,
  h: number
) {
  const eased = 1 - Math.pow(1 - progress, 3);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAPER_BASE_COLOR_CSS;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1 - eased;
  ctx.drawImage(noiseSource, 0, 0, w, h);
  ctx.globalAlpha = eased;
  ctx.drawImage(realCanvas, 0, 0, w, h);
  ctx.globalAlpha = 1;
}

// Sprint 12 Phase 3: the scene's own continuous ambient motion (float, sway,
// mouse-parallax tilt) had no reduced-motion handling at all, unlike every
// other animated surface in this app (TypingReveal, boot sequence,
// ResumeOverview's stagger). Computed once, same "session-local flag, not
// reactive state" pattern those already use.
const REDUCE_MOTION = prefersReducedMotion();

/**
 * "Contain"-style fit, the camera-distance equivalent of CSS
 * object-fit: contain — computes how far back a fixed-FOV perspective
 * camera must sit so the whole A4 page (world units) fits inside
 * FIT_FRACTION of both the container's visible height AND width, whichever
 * is more restrictive, so the page can never be cropped on either axis.
 * The FOV itself never changes — only distance — so true A4 proportions
 * and the perspective "feel" are preserved regardless of viewport size.
 */
function computeFitDistance(containerWidth: number, containerHeight: number): number {
  if (containerWidth <= 0 || containerHeight <= 0) return FALLBACK_DISTANCE;
  const aspect = containerWidth / containerHeight;
  const halfTan = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV_DEG) / 2);
  const distanceForHeight = PAPER_HEIGHT / FIT_FRACTION / (2 * halfTan);
  const distanceForWidth = PAPER_WIDTH / FIT_FRACTION / (2 * halfTan * aspect);
  return Math.max(distanceForHeight, distanceForWidth);
}

/** A soft, blurred drop-shadow baked once into a canvas texture — cheaper than real-time shadow mapping. */
function createShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.35)');
  gradient.addColorStop(0.6, 'rgba(0,0,0,0.15)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(c);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Sprint 10F: hand-rolled Three.js scene (no @react-three/fiber/drei — this
 * codebase's other subsystems, e.g. Terminal/Search/Notifications, are all
 * plain framework-free modules wired through a single hook/component, and a
 * two-mesh paper-plus-shadow scene doesn't need a scene-graph abstraction on
 * top of three itself). Renders a floating A4 "paper" whose front face is
 * textured from the rasterized resume PDF (preview/pdfTexture.ts), always
 * resting at a fixed slight tilt (never perfectly flat). Slow float/sway
 * ambient motion continues regardless of interaction; real rotate/zoom/pan
 * is driven by three's own OrbitControls (see below), constrained to a
 * Google Model Viewer-style range rather than free orbiting. Pauses its
 * render loop when off-screen or the tab is hidden.
 *
 * Sprint 10F.2: camera distance is never hardcoded — computeFitDistance()
 * (a "contain"-style fit, like CSS object-fit: contain) sizes it so the
 * whole page is always visible, recomputed only on mount, on container
 * resize, and on Reset View — never per-frame. The FOV itself is fixed, so
 * only distance changes; true A4 proportions are never distorted.
 *
 * Resume Studio redesign: OrbitControls (three/examples/jsm/controls) is
 * used instead of hand-rolled drag/zoom math — it ships inside the `three`
 * package itself (not a separate scene-graph framework like r3f/drei), so
 * it doesn't conflict with this file's own hand-rolled philosophy; it's
 * just another vanilla three.js object, `.update()`-ed once per frame like
 * everything else here. `maxTargetRadius` (this three version's own built-in
 * pan bound) keeps the page from ever being panned off-screen — no manual
 * clamp code needed.
 */
export const ResumeScene = React.forwardRef<ResumeSceneHandle, ResumeSceneProps>(function ResumeScene(
  { canvas, version, isAssembling },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paperMeshRef = useRef<THREE.Mesh | null>(null);
  const paperMaterialsRef = useRef<THREE.MeshStandardMaterial[] | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  // Sprint 10F.2: last-known container size, kept in sync by the
  // ResizeObserver below — Reset View reads this instead of re-measuring
  // the DOM, so recomputing the fit stays a cheap, on-demand calculation
  // rather than something done every frame.
  const lastSizeRef = useRef({ width: 0, height: 0 });
  // Sprint 12 Phase 3: the camera's distance now eases toward this target
  // every frame (see dampen() in the animate loop) instead of being set
  // directly. Resize keeps this equal to the camera's actual position (so
  // dragging the split-pane handle stays perfectly instant/responsive —
  // there's never a gap to close); Reset View is the one thing that
  // deliberately opens a gap, so it's the one place users see a smooth
  // eased "settle" rather than a hard snap.
  const targetDistanceRef = useRef(FALLBACK_DISTANCE);
  // Resume Studio redesign: armed by resetView(); consumed by the animate
  // loop, which dampens camera.position and controls.target back toward
  // their dead-on home values (rather than OrbitControls' own reset(),
  // which snaps instantly — this keeps Reset View's existing smooth-settle
  // feel from Sprint 12 Phase 3). Cleared the moment the user starts a new
  // drag/zoom (an interaction mid-reset should just cancel it, not fight
  // it) and once the camera is close enough to home.
  const resettingRef = useRef(false);

  // Resume Studio redesign: one-time mount entrance (fade/translate/rotate
  // into the resting pose) — independent of the Sprint 16 Assembling/Resolve
  // *content* reveal below, which is about what's drawn on the page, not
  // the page object's own arrival in frame. `null` once the entrance has
  // finished (or immediately under reduced motion).
  const entranceStartRef = useRef<number | null>(null);

  // Sprint 16: reconstruction state — see the block comment above RESOLVE_MS.
  const noiseSourceRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const displayTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const finalTextureRef = useRef<THREE.CanvasTexture | null>(null);
  /** Mirrors the `isAssembling` prop for the animate loop (which lives inside a mount-once effect and can't read fresh props directly) — kept in sync by the props effect below. */
  const assemblingActiveRef = useRef(true);
  /** Armed by the props effect the moment a build resolves; consumed and cleared by the animate loop once the crossfade completes. */
  const resolveRef = useRef<{ start: number; realCanvas: HTMLCanvasElement } | null>(null);

  useImperativeHandle(ref, () => ({
    resetView() {
      const { width, height } = lastSizeRef.current;
      const target = computeFitDistance(width, height);
      targetDistanceRef.current = target;
      if (REDUCE_MOTION) {
        cameraRef.current?.position.set(0, 0, target);
        controlsRef.current?.target.set(0, 0, 0);
        controlsRef.current?.update();
      } else {
        resettingRef.current = true;
      }
    },
  }));

  // Scene setup — runs once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, 1, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Synchronous initial sizing pass (before the first render, before the
    // async ResizeObserver callback fires) so the very first frame already
    // has correct renderer size, camera aspect, and fit distance — no
    // flash of the wrong framing, no need to press Reset View to see the
    // whole page. Mirrors the ResizeObserver callback below exactly.
    const initialRect = container.getBoundingClientRect();
    lastSizeRef.current = { width: initialRect.width, height: initialRect.height };
    if (initialRect.width > 0 && initialRect.height > 0) {
      renderer.setSize(initialRect.width, initialRect.height, true);
      camera.aspect = initialRect.width / initialRect.height;
    }
    const initialDistance = computeFitDistance(initialRect.width, initialRect.height);
    targetDistanceRef.current = initialDistance;
    camera.position.set(0, 0, initialDistance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Resume Studio redesign: constrained OrbitControls — rotate/zoom/pan
    // within a Model-Viewer-style range around the camera's dead-on home
    // position, rather than free orbiting. Damping gives the "premium,
    // eased" feel the brief asks for; skipped under reduced motion (the
    // interaction itself stays available, only the momentum/easing drops),
    // matching every other eased effect in this file.
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = !REDUCE_MOTION;
    controls.dampingFactor = ORBIT_DAMPING_FACTOR;
    controls.minAzimuthAngle = THREE.MathUtils.degToRad(-ORBIT_AZIMUTH_RANGE_DEG);
    controls.maxAzimuthAngle = THREE.MathUtils.degToRad(ORBIT_AZIMUTH_RANGE_DEG);
    controls.minPolarAngle = THREE.MathUtils.degToRad(90 - ORBIT_POLAR_RANGE_DEG);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(90 + ORBIT_POLAR_RANGE_DEG);
    controls.minDistance = initialDistance * ORBIT_MIN_DISTANCE_RATIO;
    controls.maxDistance = initialDistance * ORBIT_MAX_DISTANCE_RATIO;
    controls.enablePan = true;
    controls.panSpeed = 0.5;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.6;
    // "slight pan... prevent losing the document off-screen" — OrbitControls
    // itself clamps the target's distance from `cursor` (default origin)
    // every update() call, so no manual pan-bounds code is needed.
    controls.maxTargetRadius = ORBIT_PAN_LIMIT;
    controls.update();

    // Sprint 12 (post-launch polish): raised across the board — the
    // Phase 3 balance (ambient 0.6 / key 0.68 / fill 0.22) under-lit the
    // front face enough that the paper read as gray/dull rather than
    // bright white, which also flattened the contrast of the dark resume
    // text against it. Ambient carries most of the increase since it's the
    // one uniform, normal-independent term — raising it brightens the
    // whole page evenly rather than adding directional hotspots.
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.78);
    keyLight.position.set(-1.2, 1.8, 2.2);
    scene.add(keyLight);
    // Resume Studio redesign: repositioned from a soft front-fill
    // (1.5, -0.6, 1.4) to sit behind/to the side of the paper — catches the
    // page's edge/bevel as a highlight line rather than softening the front
    // face, satisfying "one key light, one rim light" without a fourth
    // light or a new render pass.
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
    rimLight.position.set(1.6, 0.4, -1.8);
    scene.add(rimLight);

    // Paper: a thin box so the edge reads as real paper thickness, not a decal.
    // roughness lowered slightly (was 0.92) — still a matte paper finish,
    // but less light-absorbing, so the lit front face reads brighter/crisper
    // rather than flat.
    const blankMaterial = () => new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.8, metalness: 0 });
    const materials = [blankMaterial(), blankMaterial(), blankMaterial(), blankMaterial(), blankMaterial(), blankMaterial()];
    paperMaterialsRef.current = materials;
    const geometry = new THREE.BoxGeometry(PAPER_WIDTH, PAPER_HEIGHT, PAPER_DEPTH);
    const paper = new THREE.Mesh(geometry, materials);
    paperMeshRef.current = paper;

    // Resume Studio redesign: the paper's resting pose is never perfectly
    // flat (REST_ROTATION_Y/X) — the old hover-parallax system that used to
    // rest at (0,0) is gone, replaced by OrbitControls above. Under reduced
    // motion, or in the no-entrance case, it starts directly at rest;
    // otherwise it starts lower/less-tilted/transparent and eases in below.
    if (REDUCE_MOTION) {
      paper.rotation.set(REST_ROTATION_X, REST_ROTATION_Y, 0);
    } else {
      paper.rotation.set(REST_ROTATION_X * ENTRANCE_START_ROTATION_SCALE, REST_ROTATION_Y * ENTRANCE_START_ROTATION_SCALE, 0);
      paper.position.y = ENTRANCE_START_Y_OFFSET;
      materials.forEach((m) => {
        m.transparent = true;
        m.opacity = 0;
      });
      entranceStartRef.current = performance.now();
    }
    scene.add(paper);

    // Soft shadow, static, sits slightly behind/below the paper.
    const shadowTexture = createShadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
    const shadowGeometry = new THREE.PlaneGeometry(PAPER_WIDTH * 1.7, PAPER_HEIGHT * 1.5);
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.position.set(0.05, -0.08, -PAPER_DEPTH - 0.05);
    scene.add(shadowMesh);

    // Resume Studio redesign: a subtle floor grid — the "stage" the paper
    // sits on. A dim, low-opacity custom material (not GridHelper's default
    // two-tone colors) so it reads as ambient scene detail, never competing
    // with the paper for attention; no reflections/texture, satisfying
    // "avoid reflective floors" by construction.
    const grid = new THREE.GridHelper(PAPER_WIDTH * 5, 20, 0x333333, 0x2a2a2a);
    const gridMaterial = grid.material as THREE.Material & { opacity: number; transparent: boolean };
    gridMaterial.opacity = 0.18;
    gridMaterial.transparent = true;
    grid.position.y = -PAPER_HEIGHT * 0.62;
    scene.add(grid);

    const frontMaterial = materials[4];

    // Sprint 16: the paper starts in the Assembling state from the very
    // first frame — never the old flat, mapless blank material.
    const noiseSource = createGlyphNoiseSource();
    noiseSourceRef.current = noiseSource;
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = DISPLAY_CANVAS_WIDTH;
    displayCanvas.height = DISPLAY_CANVAS_HEIGHT;
    displayCanvasRef.current = displayCanvas;
    const displayCtx = displayCanvas.getContext('2d');
    displayCtxRef.current = displayCtx;
    const displayTexture = new THREE.CanvasTexture(displayCanvas);
    displayTexture.colorSpace = THREE.SRGBColorSpace;
    displayTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    displayTextureRef.current = displayTexture;
    if (displayCtx) {
      paintAssembling(displayCtx, noiseSource, REDUCE_MOTION ? BREATH_MAX_ALPHA : BREATH_MIN_ALPHA, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
      displayTexture.needsUpdate = true;
    }
    frontMaterial.map = displayTexture;
    frontMaterial.color.set(0xffffff);
    frontMaterial.needsUpdate = true;

    let elapsed = 0;
    let lastTime = performance.now();

    const animate = () => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      // Resume Studio redesign: one-time entrance, else the fixed resting
      // tilt plus the existing float/sway ambient motion layered on top.
      if (entranceStartRef.current !== null) {
        const progress = Math.min(1, (now - entranceStartRef.current) / (ENTRANCE_DURATION_S * 1000));
        const eased = 1 - Math.pow(1 - progress, 3);
        paper.rotation.x = REST_ROTATION_X * (ENTRANCE_START_ROTATION_SCALE + (1 - ENTRANCE_START_ROTATION_SCALE) * eased);
        paper.rotation.y = REST_ROTATION_Y * (ENTRANCE_START_ROTATION_SCALE + (1 - ENTRANCE_START_ROTATION_SCALE) * eased);
        paper.position.y = ENTRANCE_START_Y_OFFSET * (1 - eased);
        paper.rotation.z = 0;
        materials.forEach((m) => {
          m.opacity = eased;
        });
        if (progress >= 1) {
          materials.forEach((m) => {
            m.opacity = 1;
            m.transparent = false;
            m.needsUpdate = true;
          });
          entranceStartRef.current = null;
        }
      } else {
        paper.rotation.x = REST_ROTATION_X;
        paper.rotation.y = REST_ROTATION_Y;
        if (REDUCE_MOTION) {
          paper.position.y = 0;
        } else {
          paper.rotation.z = Math.sin(elapsed * FLOAT_SPEED * SWAY_SPEED_RATIO + 0.7) * SWAY_AMPLITUDE;
          paper.position.y =
            Math.sin(elapsed * FLOAT_SPEED) * FLOAT_AMPLITUDE +
            Math.sin(elapsed * FLOAT_SPEED * FLOAT_SECONDARY_RATIO + 1.3) * FLOAT_SECONDARY_AMPLITUDE;
        }
      }

      // Reset View: dampen camera+target back toward their dead-on home
      // values (rather than OrbitControls' own reset(), which snaps
      // instantly) — preserves the smooth-settle feel Sprint 12 Phase 3
      // established for this button. A fresh drag/zoom cancels it (the
      // 'start' listener below), same as it always could interrupt the old
      // tilt-based Reset View.
      if (resettingRef.current) {
        const homeDistance = targetDistanceRef.current;
        camera.position.x = dampen(camera.position.x, 0, RESET_HALF_LIFE_S, dt);
        camera.position.y = dampen(camera.position.y, 0, RESET_HALF_LIFE_S, dt);
        camera.position.z = dampen(camera.position.z, homeDistance, RESET_HALF_LIFE_S, dt);
        controls.target.x = dampen(controls.target.x, 0, RESET_HALF_LIFE_S, dt);
        controls.target.y = dampen(controls.target.y, 0, RESET_HALF_LIFE_S, dt);
        controls.target.z = dampen(controls.target.z, 0, RESET_HALF_LIFE_S, dt);
        const closeEnough =
          Math.abs(camera.position.x) < RESET_EPSILON &&
          Math.abs(camera.position.y) < RESET_EPSILON &&
          Math.abs(camera.position.z - homeDistance) < RESET_EPSILON &&
          controls.target.length() < RESET_EPSILON;
        if (closeEnough) {
          camera.position.set(0, 0, homeDistance);
          controls.target.set(0, 0, 0);
          resettingRef.current = false;
        }
      }

      controls.update();

      // Sprint 16: Assembling breathing / Resolve crossfade. Mutually
      // exclusive — a resolve in progress always takes priority over the
      // (by then stale) assembling flag.
      const ctx2d = displayCtxRef.current;
      const resolve = resolveRef.current;
      if (ctx2d && resolve) {
        const progress = Math.min(1, (now - resolve.start) / RESOLVE_MS);
        const source = noiseSourceRef.current;
        if (source) {
          paintResolve(ctx2d, source, resolve.realCanvas, progress, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
          displayTextureRef.current!.needsUpdate = true;
        }
        if (progress >= 1) {
          // Crossfade done — swap to a fresh native-resolution texture built
          // directly from the real canvas, matching Phase 3's final quality
          // exactly (the display canvas was only ever a transient blend
          // surface, never the source of truth for the settled view).
          const finalTexture = new THREE.CanvasTexture(resolve.realCanvas);
          finalTexture.needsUpdate = true;
          finalTexture.colorSpace = THREE.SRGBColorSpace;
          finalTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          const old = frontMaterial.map;
          frontMaterial.map = finalTexture;
          frontMaterial.needsUpdate = true;
          if (old && old !== finalTextureRef.current) old.dispose();
          finalTextureRef.current?.dispose();
          finalTextureRef.current = finalTexture;
          resolveRef.current = null;
        }
      } else if (ctx2d && assemblingActiveRef.current && !REDUCE_MOTION) {
        const source = noiseSourceRef.current;
        if (source) {
          const breathT = 0.5 + 0.5 * Math.sin(elapsed * ((2 * Math.PI) / BREATH_PERIOD_S));
          const alpha = BREATH_MIN_ALPHA + (BREATH_MAX_ALPHA - BREATH_MIN_ALPHA) * breathT;
          paintAssembling(ctx2d, source, alpha, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
          displayTextureRef.current!.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };

    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      lastTime = performance.now();
      rafRef.current = requestAnimationFrame(animate);
    };
    const stop = () => {
      runningRef.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 };
      if (width <= 0 || height <= 0) return;
      lastSizeRef.current = { width, height };
      // updateStyle=true (the default) is required: it keeps the canvas's
      // on-page CSS box synced to the container's logical size. Passing
      // false leaves the canvas's CSS size at its width/height attributes,
      // which setPixelRatio scales up by devicePixelRatio — on HiDPI
      // displays the canvas would render up to 2x larger than its
      // container regardless of any camera fit.
      renderer.setSize(width, height, true);
      camera.aspect = width / height;
      // Kept instant (not eased through targetDistanceRef) — while a user
      // drags the split-pane resize handle, the container width changes
      // continuously, and the camera must track it exactly with zero lag.
      // Setting the target to match keeps the per-frame dampen() a no-op
      // afterward, rather than fighting a moving target.
      const distance = computeFitDistance(width, height);
      camera.position.z = distance;
      targetDistanceRef.current = distance;
      camera.updateProjectionMatrix();
      // Zoom limits stay proportional to the current fit distance rather
      // than the distance the panel happened to be when the scene mounted.
      controls.minDistance = distance * ORBIT_MIN_DISTANCE_RATIO;
      controls.maxDistance = distance * ORBIT_MAX_DISTANCE_RATIO;
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !document.hidden) start();
        else stop();
      },
      { threshold: 0.01 }
    );
    intersectionObserver.observe(container);

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // A fresh drag/zoom/pan should cancel an in-flight Reset View rather
    // than fight it — OrbitControls fires 'start' the instant an
    // interaction begins.
    const handleControlsStart = () => {
      resettingRef.current = false;
    };
    controls.addEventListener('start', handleControlsStart);

    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      controls.removeEventListener('start', handleControlsStart);
      controls.dispose();
      geometry.dispose();
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      shadowTexture.dispose();
      grid.geometry.dispose();
      gridMaterial.dispose();
      displayTextureRef.current?.dispose();
      finalTextureRef.current?.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Sprint 16: reacts to the real preview lifecycle (isAssembling/canvas/
  // version) rather than rebuilding a texture on every canvas change alone —
  // this is what lets the animate loop's Resolve crossfade know exactly when
  // a build has genuinely just finished, versus still being in flight.
  useEffect(() => {
    const materials = paperMaterialsRef.current;
    const displayTexture = displayTextureRef.current;
    if (!materials || !displayTexture) return;
    const frontMaterial = materials[4];

    if (isAssembling) {
      // (Re)entering Assembling — e.g. a manual "Refresh Preview" click on
      // top of an already-resolved page. Swap back to the noise-backed
      // display texture and drop whatever final texture was showing.
      assemblingActiveRef.current = true;
      resolveRef.current = null;
      if (frontMaterial.map !== displayTexture) {
        const old = frontMaterial.map;
        frontMaterial.map = displayTexture;
        frontMaterial.needsUpdate = true;
        if (old && old !== finalTextureRef.current) old.dispose();
      }
      const ctx2d = displayCtxRef.current;
      const source = noiseSourceRef.current;
      if (ctx2d && source) {
        paintAssembling(ctx2d, source, REDUCE_MOTION ? BREATH_MAX_ALPHA : BREATH_MIN_ALPHA, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
        displayTexture.needsUpdate = true;
      }
      return;
    }

    if (!canvas) return;
    assemblingActiveRef.current = false;

    if (REDUCE_MOTION) {
      // Instant — skip the crossfade entirely, matching how reduced motion
      // already short-circuits the rest of this scene's animated states.
      const finalTexture = new THREE.CanvasTexture(canvas);
      finalTexture.needsUpdate = true;
      finalTexture.colorSpace = THREE.SRGBColorSpace;
      finalTexture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 1;
      const old = frontMaterial.map;
      frontMaterial.map = finalTexture;
      frontMaterial.needsUpdate = true;
      if (old && old !== finalTextureRef.current) old.dispose();
      finalTextureRef.current?.dispose();
      finalTextureRef.current = finalTexture;
      resolveRef.current = null;
    } else {
      resolveRef.current = { start: performance.now(), realCanvas: canvas };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, version, isAssembling]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
});
