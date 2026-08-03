import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { Spring } from './scene/spring';
import { createGround } from './scene/ground';
import { createBackdrop } from './scene/backdrop';
import { createPaperGeometry } from './scene/paperGeometry';
import { createLightRig } from './scene/lightRig';
import { createShadows } from './scene/shadows';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  CORNER_RADIUS,
  CAMERA_FOV_DEG,
  CAMERA_DISTANCE,
  CAMERA_ELEVATION_DEG,
  CAMERA_TARGET_Y,
  CAMERA_TARGET_X,
  REST_YAW_DEG,
  REST_PITCH_DEG,
  REST_ROLL_DEG,
  GROUND_CLEARANCE,
  PARALLAX_YAW_DEG,
  PARALLAX_PITCH_DEG,
  LIGHT_PARALLAX_FOLLOW,
  PARALLAX_RETURN_MS,
  HOVER_LIFT,
  HOVER_MS,
  ENTRANCE_MS,
  ENTRANCE_STAGGER_MS,
  STATE_TRANSITION_MS,
  REDUCED_MOTION_MS,
  halfLifeFor,
  FOCUS_YAW_DEG,
  FOCUS_PITCH_DEG,
  FOCUS_DOLLY,
  FOCUS_ELEVATION_DEG,
  FOCUS_GRID_FADE,
  INSPECT_AZIMUTH_DEG,
  INSPECT_ELEVATION_MIN_DEG,
  INSPECT_ELEVATION_MAX_DEG,
  INSPECT_ZOOM_STEPS,
  ENV_INTENSITY,
  TONE_MAPPING,
  TONE_MAPPING_EXPOSURE,
  PAPER_ROUGHNESS,
  PAPER_METALNESS,
  PAPER_SHEEN,
  PAPER_EDGE_COLOR,
  PAPER_FACE_COLOR,
  DPR_REST,
  DPR_MOTION,
  RESIZE_DEBOUNCE_MS,
  deg,
} from './scene/stageConfig';

export type StageState = 'staged' | 'focused' | 'inspect';

/** Spec §12.3: named presets, not raw intensity sliders. */
export type LightingPreset = 'studio' | 'soft' | 'contrast';

/**
 * `soft` is 1 — the identity scale, and the one nothing here ever multiplies
 * down from by default. `lightRig`'s own intensities (scene/lightRig.ts)
 * were tuned directly against that unscaled baseline across the Priority 3
 * lighting-hierarchy pass (paper neutrality, the 12-18% falloff, the
 * paper:backdrop contrast ratio), so keeping it at 1 means the default view
 * — before anyone ever opens 3D CONTROLS — renders exactly that calibrated
 * look, labelled correctly as "soft" rather than as "studio".
 *
 * `studio` and `contrast` are brighter alternates a visitor can opt into.
 */
export const LIGHTING_PRESETS: Record<LightingPreset, number> = {
  soft: 1,
  studio: 1.28,
  contrast: 1.6,
};

export interface SceneDiagnostics {
  fps: number;
  drawCalls: number;
  dpr: number;
  textureSize: string;
}

export interface ResumeSceneHandle {
  /** Returns the stage to its hero framing and rest pose (spec §3.4). */
  resetView: () => void;
  /** Spec §9.4: the 3D CONTROLS tab is what unlocks clamped orbit. */
  setState: (state: StageState) => void;
  /** Spec §12.3 "View": stepped zoom only — never wheel-driven (§9.2). */
  stepZoom: (direction: 1 | -1) => void;
  setLightingPreset: (preset: LightingPreset) => void;
  setGridVisible: (visible: boolean) => void;
  setShadowVisible: (visible: boolean) => void;
  getDiagnostics: () => SceneDiagnostics;
}

interface ResumeSceneProps {
  /** The rasterized resume (see preview/pdfTexture.ts), once ready. null while assembling. */
  canvas: HTMLCanvasElement | null;
  /** Bump whenever `canvas` has been re-rasterized in place and the texture must be rebuilt. */
  version: number;
  /** True from the moment a build starts until it resolves. */
  isAssembling: boolean;
  /**
   * Spec §9.5 / §12.1: Reset View is disabled until the view is dirty — a
   * permanently visible reset button advertises that the thing gets broken.
   */
  onDirtyChange?: (dirty: boolean) => void;
  onStateChange?: (state: StageState) => void;
}

const REDUCE_MOTION = prefersReducedMotion();

// --- assembling / resolve texture states (carried over from Sprint 16) ---
const RESOLVE_MS = 260;
const BREATH_PERIOD_S = 3.6;
const BREATH_MIN_ALPHA = 0.5;
const BREATH_MAX_ALPHA = 0.8;
const DISPLAY_CANVAS_WIDTH = 1024;
const DISPLAY_CANVAS_HEIGHT = Math.round(1024 / (PAGE_WIDTH / PAGE_HEIGHT));
const PAPER_BASE_COLOR_CSS = '#ffffff';
const NOISE_GLYPHS = '01{}[]()<>/\\;:=+-#*'.split('');

function createGlyphNoiseSource(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = DISPLAY_CANVAS_WIDTH;
  canvas.height = DISPLAY_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.font = '18px "Geist Mono", ui-monospace, monospace';
  ctx.fillStyle = 'rgba(20, 20, 20, 0.15)';
  ctx.textBaseline = 'top';
  for (let y = 8; y < canvas.height; y += 26) {
    for (let x = 8; x < canvas.width; x += 22) {
      ctx.fillText(NOISE_GLYPHS[Math.floor(Math.random() * NOISE_GLYPHS.length)], x, y);
    }
  }
  return canvas;
}

function paintAssembling(ctx: CanvasRenderingContext2D, noise: HTMLCanvasElement, alpha: number) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAPER_BASE_COLOR_CSS;
  ctx.fillRect(0, 0, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
  ctx.globalAlpha = alpha;
  ctx.drawImage(noise, 0, 0, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
  ctx.globalAlpha = 1;
}

function paintResolve(
  ctx: CanvasRenderingContext2D,
  noise: HTMLCanvasElement,
  real: HTMLCanvasElement,
  progress: number
) {
  const eased = 1 - Math.pow(1 - progress, 3);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAPER_BASE_COLOR_CSS;
  ctx.fillRect(0, 0, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
  ctx.globalAlpha = 1 - eased;
  ctx.drawImage(noise, 0, 0, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
  ctx.globalAlpha = eased;
  ctx.drawImage(real, 0, 0, DISPLAY_CANVAS_WIDTH, DISPLAY_CANVAS_HEIGHT);
  ctx.globalAlpha = 1;
}

/**
 * Sprint 18 — "Premium 3D Document Preview" spec.
 *
 * A staged product still-life (spec §1.1), not a document viewer and not a
 * 3D workspace. Three things follow from that framing and shape everything
 * in this file:
 *
 * 1. **The camera never moves; the object does** (spec §3.3). The vignette,
 *    the backdrop gradient, the grid's fade, and both shadow terms were all
 *    art-directed relative to one camera. Moving it drags every one of them
 *    out of alignment and eventually finds the edge of the set. So pointer
 *    parallax rotates the sheet, and the light rig follows at 25% so the
 *    specular sweeps — which, per spec §7.2, is what actually sells the
 *    motion.
 *
 * 2. **Nothing renders when nothing is happening** (spec §10.1). This is
 *    the single highest-leverage decision in the file. A still-life has no
 *    reason to run at 60fps; the loop is invalidation-driven, so idle GPU
 *    cost is genuinely zero. Everything that animates therefore has to
 *    declare when it is still moving — hence Spring.isSettled.
 *
 * 3. **Freedom is withheld on purpose** (spec §9.2). A scene lit and
 *    composed for one angle looks wrong from every other angle, so free
 *    orbit exists only inside the `inspect` state, clamped, and the canvas
 *    never captures wheel events.
 *
 * Deliberate architectural note: the spec §8.2 recommends React Three Fiber
 * plus drei. This file stays hand-rolled imperative Three.js, matching the
 * convention every other subsystem in this codebase follows and avoiding a
 * full rewrite plus two large dependencies. Nothing the spec asks for
 * visually requires r3f — RectAreaLight, PMREMGenerator, ShaderMaterial and
 * NeutralToneMapping are all core Three. See PREVIEW_SPEC_DEVIATIONS.md.
 */
export const ResumeScene = React.forwardRef<ResumeSceneHandle, ResumeSceneProps>(function ResumeScene(
  { canvas, version, isAssembling, onDirtyChange, onStateChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Imperative handles into the mounted scene, populated by the setup effect.
  const apiRef = useRef<{
    resetView: () => void;
    setState: (state: StageState) => void;
    stepZoom: (direction: 1 | -1) => void;
    setLightingPreset: (preset: LightingPreset) => void;
    setGridVisible: (visible: boolean) => void;
    setShadowVisible: (visible: boolean) => void;
    getDiagnostics: () => SceneDiagnostics;
    applyTexture: (canvas: HTMLCanvasElement | null, assembling: boolean) => void;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    resetView: () => apiRef.current?.resetView(),
    setState: (state: StageState) => apiRef.current?.setState(state),
    stepZoom: (direction: 1 | -1) => apiRef.current?.stepZoom(direction),
    setLightingPreset: (preset: LightingPreset) => apiRef.current?.setLightingPreset(preset),
    setGridVisible: (visible: boolean) => apiRef.current?.setGridVisible(visible),
    setShadowVisible: (visible: boolean) => apiRef.current?.setShadowVisible(visible),
    getDiagnostics: () =>
      apiRef.current?.getDiagnostics() ?? { fps: 0, drawCalls: 0, dpr: 0, textureSize: '—' },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ------------------------------------------------------------ renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_REST));
    // Spec §6.3 point 4: neutral, not ACES — ACES greys and desaturates
    // near-white values, which is exactly wrong for paper.
    renderer.toneMapping = TONE_MAPPING;
    renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    // Spec §9.6: the canvas is decorative; all content lives in the left
    // pane and the PDF.
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'pan-y';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, 1, 0.1, 100);

    // ------------------------------------------------------------ backdrop
    const backdrop = createBackdrop();
    scene.add(backdrop.mesh);

    // -------------------------------------------------------------- ground
    const ground = createGround();
    scene.add(ground.mesh);

    // ------------------------------------------------------------- shadows
    const shadows = createShadows();
    scene.add(shadows.group);

    // ------------------------------------------------------------ lighting
    const lightRig = createLightRig(renderer);
    scene.add(lightRig.group);
    scene.environment = lightRig.environment;
    scene.environmentIntensity = ENV_INTENSITY;

    // --------------------------------------------------------------- paper
    const paper = createPaperGeometry(CORNER_RADIUS);

    const faceMaterial = new THREE.MeshPhysicalMaterial({
      color: PAPER_FACE_COLOR,
      roughness: PAPER_ROUGHNESS,
      metalness: PAPER_METALNESS,
      // Spec §5.2: a small neutral sheen approximates paper fibre's
      // retroreflection at grazing angles.
      sheen: PAPER_SHEEN,
      sheenColor: new THREE.Color(0xffffff),
      sheenRoughness: 0.8,
      envMapIntensity: ENV_INTENSITY,
    });
    // Spec §5.1: the cut edge scatters differently from the printed face —
    // warmer and a few percent darker. A small detail, disproportionately
    // convincing.
    const edgeMaterial = new THREE.MeshPhysicalMaterial({
      color: PAPER_EDGE_COLOR,
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: ENV_INTENSITY * 0.8,
    });

    const sheet = new THREE.Mesh(paper.geometry, [faceMaterial, edgeMaterial]);
    // Spec §4.2: the sheet rests. Its lowest edge sits a hair above the
    // ground, and the pitch makes that edge the contact edge.
    const documentGroup = new THREE.Group();
    documentGroup.add(sheet);
    documentGroup.position.y = PAGE_HEIGHT / 2 + GROUND_CLEARANCE;
    scene.add(documentGroup);

    // --------------------------------------------------- assembling states
    const noiseSource = createGlyphNoiseSource();
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = DISPLAY_CANVAS_WIDTH;
    displayCanvas.height = DISPLAY_CANVAS_HEIGHT;
    const displayCtx = displayCanvas.getContext('2d');
    const displayTexture = new THREE.CanvasTexture(displayCanvas);
    displayTexture.colorSpace = THREE.SRGBColorSpace;
    displayTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    displayTexture.flipY = true;
    if (displayCtx) paintAssembling(displayCtx, noiseSource, BREATH_MIN_ALPHA);
    faceMaterial.map = displayTexture;
    faceMaterial.needsUpdate = true;

    let finalTexture: THREE.CanvasTexture | null = null;
    let resolveStart: number | null = null;
    let resolveCanvas: HTMLCanvasElement | null = null;
    let assemblingActive = true;

    // ---------------------------------------------------- camera placement
    /**
     * Spec §3.2: placement is expressed in object-relative spherical terms,
     * so the framing survives any change to page size. Azimuth stays 0 —
     * the camera is on-axis and the *object* provides the yaw.
     */
    /**
     * The sheet rests on the ground, so its own centre sits half a page
     * height up — the camera target is that centre, raised a further 5% of
     * page height (spec §3.2) so the lower edge and its shadow get room and
     * the composition sits slightly high in frame (spec §11).
     */
    const targetY = () => PAGE_HEIGHT / 2 + GROUND_CLEARANCE + CAMERA_TARGET_Y;

    const placeCamera = (elevationDeg: number, distanceScale: number) => {
      const elevation = deg(elevationDeg);
      const distance = CAMERA_DISTANCE * distanceScale;
      const y = targetY();
      const x = CAMERA_TARGET_X;
      camera.position.set(x, y + Math.sin(elevation) * distance, Math.cos(elevation) * distance);
      camera.lookAt(x, y, 0);
    };

    // ------------------------------------------------------------- springs
    // Every half-life derives from a duration the spec states (Appendix A),
    // so the timings in stageConfig are the real source of truth.
    //
    // Spec §7.4 shortens state transitions under reduced motion rather than
    // removing them — 150ms reads as an instant change while still keeping
    // the scene's states continuous, which is what stops a collapsed
    // section or a tab switch from looking like a rendering glitch.
    const parallaxHalfLife = halfLifeFor(PARALLAX_RETURN_MS);
    const transitionHalfLife = halfLifeFor(REDUCE_MOTION ? REDUCED_MOTION_MS : STATE_TRANSITION_MS);

    const yaw = new Spring(deg(REST_YAW_DEG), REDUCE_MOTION ? transitionHalfLife : parallaxHalfLife);
    const pitch = new Spring(deg(REST_PITCH_DEG), REDUCE_MOTION ? transitionHalfLife : parallaxHalfLife);
    const lift = new Spring(0, halfLifeFor(HOVER_MS));
    // Spec §7.4: reduced motion keeps the entrance as an opacity fade and
    // drops its transforms — so the spring still runs (it drives opacity),
    // and the scale term below is what gets skipped.
    const entrance = new Spring(0, halfLifeFor(REDUCE_MOTION ? REDUCED_MOTION_MS : ENTRANCE_MS));
    const gridFade = new Spring(1, transitionHalfLife);
    const cameraElevation = new Spring(CAMERA_ELEVATION_DEG, transitionHalfLife);
    const cameraDolly = new Spring(1, transitionHalfLife);
    // Inspect-mode orbit, driven by drag and clamped hard (spec §3.4).
    const orbitAzimuth = new Spring(0, transitionHalfLife);
    const orbitElevation = new Spring(0, transitionHalfLife);

    let stageState: StageState = 'staged';
    let dirty = false;
    let zoomIndex = INSPECT_ZOOM_STEPS.indexOf(1);
    let shadowsEnabled = true;
    let pointerInside = false;
    let pointerX = 0;
    let pointerY = 0;
    let parallaxReturnTimer: number | null = null;

    const markDirty = (next: boolean) => {
      if (dirty === next) return;
      dirty = next;
      onDirtyChange?.(next);
    };

    // ------------------------------------------------- render on demand
    let running = false;
    let rafId: number | null = null;
    let lastTime = performance.now();
    let elapsed = 0;
    let visible = true;

    /** Anything still in motion? Drives whether another frame is scheduled. */
    const isAnimating = () =>
      !yaw.isSettled ||
      !pitch.isSettled ||
      !lift.isSettled ||
      !entrance.isSettled ||
      !gridFade.isSettled ||
      !cameraElevation.isSettled ||
      !cameraDolly.isSettled ||
      !orbitAzimuth.isSettled ||
      !orbitElevation.isSettled ||
      resolveStart !== null ||
      (assemblingActive && !REDUCE_MOTION);

    const invalidate = () => {
      if (!visible || running) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    };

    const frame = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      const animating = isAnimating();

      // Spec §10.1 point 2: drop DPR during motion, restore for the resting
      // frame. Users scrutinise the still frame, not the moving one.
      const targetDpr = Math.min(window.devicePixelRatio, animating ? DPR_MOTION : DPR_REST);
      if (Math.abs(renderer.getPixelRatio() - targetDpr) > 0.01) {
        renderer.setPixelRatio(targetDpr);
        const rect = container.getBoundingClientRect();
        if (rect.width > 0) renderer.setSize(rect.width, rect.height, true);
      }

      yaw.step(dt);
      pitch.step(dt);
      lift.step(dt);
      entrance.step(dt);
      gridFade.step(dt);
      cameraElevation.step(dt);
      cameraDolly.step(dt);
      orbitAzimuth.step(dt);
      orbitElevation.step(dt);

      // --- object pose ---
      const e = entrance.value;
      const eased = 1 - Math.pow(1 - e, 3);
      documentGroup.rotation.y = yaw.value;
      documentGroup.rotation.x = pitch.value;
      documentGroup.rotation.z = deg(REST_ROLL_DEG);
      documentGroup.position.y = PAGE_HEIGHT / 2 + GROUND_CLEARANCE + lift.value;
      // Spec §7.2: entrance arrives from 97% scale — but §7.4 drops the
      // entrance *transforms* under reduced motion and keeps only the
      // opacity fade, so the scale term is skipped rather than the whole
      // entrance.
      documentGroup.scale.setScalar(REDUCE_MOTION ? 1 : 0.97 + 0.03 * eased);

      // Spec §7.2: shadow fades up 100ms behind the sheet; grid comes first.
      const shadowReveal = THREE.MathUtils.clamp((e - ENTRANCE_STAGGER_MS / ENTRANCE_MS) / 0.8, 0, 1);
      shadows.group.visible = shadowsEnabled && shadowReveal > 0.01;
      shadows.setHover(lift.value / HOVER_LIFT);
      // Contact tracks the sheet's lower edge as it parallaxes.
      shadows.setOffset(Math.sin(yaw.value) * PAGE_WIDTH * 0.1, 0);
      shadows.group.scale.setScalar(0.9 + 0.1 * shadowReveal);

      faceMaterial.opacity = eased;
      edgeMaterial.opacity = eased;
      faceMaterial.transparent = eased < 1;
      edgeMaterial.transparent = eased < 1;

      // --- light rig follows the object (spec §7.2) ---
      lightRig.setParallax(
        (yaw.value - deg(REST_YAW_DEG)) * LIGHT_PARALLAX_FOLLOW,
        (pitch.value - deg(REST_PITCH_DEG)) * LIGHT_PARALLAX_FOLLOW
      );

      // --- ground ---
      ground.setOpacity(gridFade.value * Math.min(1, e * 1.6));

      // --- camera (fixed, except along authored rails) ---
      placeCamera(cameraElevation.value, cameraDolly.value);
      if (stageState === 'inspect') {
        // Clamped orbit, and only here (spec §3.4 / §9.2).
        const az = orbitAzimuth.value;
        const el = cameraElevation.value + orbitElevation.value;
        const distance = CAMERA_DISTANCE * cameraDolly.value;
        const elevation = deg(el);
        const y = targetY();
        camera.position.set(
          CAMERA_TARGET_X + Math.sin(az) * Math.cos(elevation) * distance,
          y + Math.sin(elevation) * distance,
          Math.cos(az) * Math.cos(elevation) * distance
        );
        camera.lookAt(CAMERA_TARGET_X, y, 0);
      }

      // --- texture states ---
      if (displayCtx && resolveStart !== null && resolveCanvas) {
        const progress = Math.min(1, (now - resolveStart) / RESOLVE_MS);
        paintResolve(displayCtx, noiseSource, resolveCanvas, progress);
        displayTexture.needsUpdate = true;
        if (progress >= 1) {
          const next = new THREE.CanvasTexture(resolveCanvas);
          next.colorSpace = THREE.SRGBColorSpace;
          next.anisotropy = renderer.capabilities.getMaxAnisotropy();
          next.needsUpdate = true;
          finalTexture?.dispose();
          finalTexture = next;
          faceMaterial.map = next;
          faceMaterial.needsUpdate = true;
          resolveStart = null;
          resolveCanvas = null;
        }
      } else if (displayCtx && assemblingActive && !REDUCE_MOTION) {
        const breath = 0.5 + 0.5 * Math.sin(elapsed * ((2 * Math.PI) / BREATH_PERIOD_S));
        paintAssembling(displayCtx, noiseSource, BREATH_MIN_ALPHA + (BREATH_MAX_ALPHA - BREATH_MIN_ALPHA) * breath);
        displayTexture.needsUpdate = true;
      }

      renderer.render(scene, camera);

      // Spec §12.3 "Diagnostics": measured over a rolling window rather
      // than from the last frame delta, which on an on-demand renderer is
      // meaningless (idle gaps would read as 0.1fps).
      frameCount += 1;
      if (now - fpsWindowStart >= 500) {
        measuredFps = Math.round((frameCount * 1000) / (now - fpsWindowStart));
        frameCount = 0;
        fpsWindowStart = now;
      }

      if (isAnimating()) {
        rafId = requestAnimationFrame(frame);
      } else {
        // Spec §10.1: settle at full DPR, draw one last crisp frame, then
        // stop entirely. Idle GPU work is zero from here.
        running = false;
        rafId = null;
        const restDpr = Math.min(window.devicePixelRatio, DPR_REST);
        if (Math.abs(renderer.getPixelRatio() - restDpr) > 0.01) {
          renderer.setPixelRatio(restDpr);
          const rect = container.getBoundingClientRect();
          if (rect.width > 0) renderer.setSize(rect.width, rect.height, true);
          renderer.render(scene, camera);
        }
      }
    };

    // --------------------------------------------------------- interaction
    const setParallaxFromPointer = () => {
      if (stageState !== 'staged' || REDUCE_MOTION) return;
      yaw.set(deg(REST_YAW_DEG + pointerX * PARALLAX_YAW_DEG));
      pitch.set(deg(REST_PITCH_DEG - pointerY * PARALLAX_PITCH_DEG));
      invalidate();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

      if (stageState === 'inspect' && dragging) {
        const dx = (event.clientX - dragStartX) / rect.width;
        const dy = (event.clientY - dragStartY) / rect.height;
        orbitAzimuth.set(
          THREE.MathUtils.clamp(dragBaseAzimuth + dx * 1.2, -deg(INSPECT_AZIMUTH_DEG), deg(INSPECT_AZIMUTH_DEG))
        );
        orbitElevation.set(
          THREE.MathUtils.clamp(
            dragBaseElevation + dy * 40,
            INSPECT_ELEVATION_MIN_DEG - CAMERA_ELEVATION_DEG,
            INSPECT_ELEVATION_MAX_DEG - CAMERA_ELEVATION_DEG
          )
        );
        markDirty(true);
        invalidate();
        return;
      }

      setParallaxFromPointer();
    };

    const handlePointerEnter = () => {
      pointerInside = true;
      if (parallaxReturnTimer !== null) {
        window.clearTimeout(parallaxReturnTimer);
        parallaxReturnTimer = null;
      }
      if (!REDUCE_MOTION && stageState === 'staged') {
        lift.set(HOVER_LIFT);
        invalidate();
      }
    };

    const handlePointerLeave = () => {
      pointerInside = false;
      lift.set(0);
      // Spec §7.2: full return to rest 600ms after the pointer leaves. The
      // spring itself settles faster than that; the timer is what
      // guarantees the pose is exactly rest rather than wherever the last
      // pointer sample left it.
      if (parallaxReturnTimer !== null) window.clearTimeout(parallaxReturnTimer);
      parallaxReturnTimer = window.setTimeout(() => {
        if (stageState === 'staged') {
          yaw.set(deg(REST_YAW_DEG));
          pitch.set(deg(REST_PITCH_DEG));
          invalidate();
        }
      }, PARALLAX_RETURN_MS);
      if (stageState === 'staged') {
        yaw.set(deg(REST_YAW_DEG));
        pitch.set(deg(REST_PITCH_DEG));
      }
      invalidate();
    };

    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragBaseAzimuth = 0;
    let dragBaseElevation = 0;

    const handlePointerDown = (event: PointerEvent) => {
      if (stageState !== 'inspect') return;
      dragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragBaseAzimuth = orbitAzimuth.target;
      dragBaseElevation = orbitElevation.target;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    const applyState = (next: StageState) => {
      stageState = next;
      onStateChange?.(next);

      if (next === 'focused') {
        yaw.set(deg(FOCUS_YAW_DEG));
        pitch.set(deg(FOCUS_PITCH_DEG));
        cameraDolly.set(FOCUS_DOLLY);
        cameraElevation.set(FOCUS_ELEVATION_DEG);
        gridFade.set(FOCUS_GRID_FADE);
        lift.set(0);
        markDirty(true);
      } else if (next === 'inspect') {
        yaw.set(deg(REST_YAW_DEG));
        pitch.set(deg(REST_PITCH_DEG));
        cameraDolly.set(1);
        cameraElevation.set(CAMERA_ELEVATION_DEG);
        gridFade.set(1);
        // Entering inspect clears any orbit the last visit left behind, and
        // is not itself "dirty": simply opening the tab has not moved
        // anything, so Reset View stays disabled until the user actually
        // orbits, zooms, or changes a scene toggle (spec §9.5).
        orbitAzimuth.set(0);
        orbitElevation.set(0);
        markDirty(false);
      } else {
        yaw.set(deg(REST_YAW_DEG));
        pitch.set(deg(REST_PITCH_DEG));
        cameraDolly.set(1);
        cameraElevation.set(CAMERA_ELEVATION_DEG);
        gridFade.set(1);
        orbitAzimuth.set(0);
        orbitElevation.set(0);
        markDirty(false);
      }

      // No jump-to-target branch here: under reduced motion every spring
      // above was already constructed with the §7.4 short half-life, so the
      // transition resolves in ~150ms without special-casing it — and
      // without the hard snap that reads as a glitch.
      invalidate();
    };

    const handleClick = () => {
      if (stageState === 'inspect') return;
      applyState(stageState === 'focused' ? 'staged' : 'focused');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stageState === 'focused') applyState('staged');
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerenter', handlePointerEnter);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    // Spec §9.2 / §13.22: the canvas must not capture wheel events. There is
    // deliberately no wheel listener here at all — scroll belongs to the
    // page, and stealing it inside an app panel is a usability defect.

    // ------------------------------------------------------------- sizing
    let resizeTimer: number | null = null;
    const applySize = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, true);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      backdrop.setAspect(width / height);
      invalidate();
    };

    const initialRect = container.getBoundingClientRect();
    applySize(initialRect.width, initialRect.height);
    placeCamera(CAMERA_ELEVATION_DEG, 1);

    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      // Spec §10.1 point 8: an IDE split drag must not thrash the canvas.
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => applySize(rect.width, rect.height), RESIZE_DEBOUNCE_MS);
    });
    resizeObserver.observe(container);

    // Spec §10.1 point 5: suspend when off-screen or the tab is hidden.
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries[0]?.isIntersecting) && !document.hidden;
        if (visible) invalidate();
      },
      { threshold: 0.01 }
    );
    intersectionObserver.observe(container);

    const handleVisibility = () => {
      visible = !document.hidden;
      if (visible) invalidate();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ------------------------------------------------------------ entrance
    // Runs in both cases — under reduced motion it is a short opacity fade
    // with no transform (spec §7.4), not a skipped entrance.
    entrance.set(1);
    invalidate();

    // --------------------------------------------------- diagnostics
    let frameCount = 0;
    let fpsWindowStart = performance.now();
    let measuredFps = 0;

    apiRef.current = {
      resetView: () => {
        zoomIndex = INSPECT_ZOOM_STEPS.indexOf(1) >= 0 ? INSPECT_ZOOM_STEPS.indexOf(1) : 1;
        // Restores the hero framing without yanking the user out of the tab
        // they are in. Resetting straight to `staged` while the 3D CONTROLS
        // tab was open silently disabled the orbit the panel was still
        // inviting them to use.
        applyState(stageState === 'focused' ? 'staged' : stageState);
      },
      setState: applyState,
      stepZoom: (direction) => {
        // Spec §12.3: stepped zoom, discrete and bounded — never continuous
        // and never bound to the wheel.
        zoomIndex = THREE.MathUtils.clamp(zoomIndex + direction, 0, INSPECT_ZOOM_STEPS.length - 1);
        cameraDolly.set(1 / INSPECT_ZOOM_STEPS[zoomIndex]);
        markDirty(INSPECT_ZOOM_STEPS[zoomIndex] !== 1);
        invalidate();
      },
      setLightingPreset: (preset) => {
        lightRig.setIntensity(LIGHTING_PRESETS[preset]);
        // 'soft' is the default the scene already renders unasked, so
        // choosing it back is not a dirty state — same reasoning as any
        // other control returning to its starting value.
        markDirty(preset !== 'soft');
        invalidate();
      },
      setGridVisible: (value) => {
        ground.mesh.visible = value;
        markDirty(!value);
        invalidate();
      },
      setShadowVisible: (value) => {
        shadowsEnabled = value;
        shadows.group.visible = value;
        markDirty(!value);
        invalidate();
      },
      getDiagnostics: () => ({
        fps: measuredFps,
        drawCalls: renderer.info.render.calls,
        dpr: Number(renderer.getPixelRatio().toFixed(2)),
        textureSize: finalTexture?.image
          ? `${(finalTexture.image as HTMLCanvasElement).width}×${(finalTexture.image as HTMLCanvasElement).height}`
          : `${DISPLAY_CANVAS_WIDTH}×${DISPLAY_CANVAS_HEIGHT}`,
      }),
      applyTexture: (source, assembling) => {
        if (assembling) {
          assemblingActive = true;
          resolveStart = null;
          resolveCanvas = null;
          if (faceMaterial.map !== displayTexture) {
            faceMaterial.map = displayTexture;
            faceMaterial.needsUpdate = true;
          }
          if (displayCtx) {
            paintAssembling(displayCtx, noiseSource, REDUCE_MOTION ? BREATH_MAX_ALPHA : BREATH_MIN_ALPHA);
            displayTexture.needsUpdate = true;
          }
          invalidate();
          return;
        }
        if (!source) return;
        assemblingActive = false;
        if (REDUCE_MOTION) {
          const next = new THREE.CanvasTexture(source);
          next.colorSpace = THREE.SRGBColorSpace;
          next.anisotropy = renderer.capabilities.getMaxAnisotropy();
          next.needsUpdate = true;
          finalTexture?.dispose();
          finalTexture = next;
          faceMaterial.map = next;
          faceMaterial.needsUpdate = true;
        } else {
          resolveStart = performance.now();
          resolveCanvas = source;
          if (faceMaterial.map !== displayTexture) {
            faceMaterial.map = displayTexture;
            faceMaterial.needsUpdate = true;
          }
        }
        invalidate();
      },
    };

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      if (parallaxReturnTimer !== null) window.clearTimeout(parallaxReturnTimer);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);

      // Spec §10.1 point 4 / §13.31: explicit disposal. Refresh Preview
      // without it grows VRAM until the context is lost.
      apiRef.current = null;
      paper.dispose();
      faceMaterial.dispose();
      edgeMaterial.dispose();
      displayTexture.dispose();
      finalTexture?.dispose();
      ground.dispose();
      backdrop.dispose();
      shadows.dispose();
      lightRig.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feeds the preview lifecycle into the mounted scene.
  useEffect(() => {
    apiRef.current?.applyTexture(canvas, isAssembling);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, version, isAssembling]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
});
