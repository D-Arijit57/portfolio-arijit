import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RESUME_PAGE_WIDTH_PX, RESUME_PAGE_HEIGHT_PX } from './specification/resumeSpec';
import { prefersReducedMotion } from '../../lib/typingReveal';

export interface ResumeSceneHandle {
  /** Recenters tilt/parallax to their resting pose and restores the fit-to-view camera distance (does not touch the texture). */
  resetView: () => void;
}

interface ResumeSceneProps {
  /** The rasterized resume (see preview/pdfTexture.ts). null = not built yet, paper renders blank. */
  canvas: HTMLCanvasElement | null;
  /** Bump whenever `canvas` has been re-rasterized in place and the texture must be rebuilt. */
  version: number;
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

const MAX_TILT = 0.12;
// Sprint 12 Phase 3: half-lives (seconds), not per-frame factors — the old
// `tilt += (target - tilt) * 0.06` constant was applied once per animation
// frame, so the same code visibly eased at a different real-world speed on
// a 30Hz vs 120Hz display. dampen() below scales by `dt` so easing speed is
// identical regardless of refresh rate.
const TILT_HALF_LIFE_S = 0.15;
const DISTANCE_HALF_LIFE_S = 0.25;
const TEXTURE_REVEAL_MS = 380;

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

const BLANK_PAPER_COLOR = new THREE.Color(0xf3f3f3);
const REVEALED_PAPER_COLOR = new THREE.Color(0xffffff);

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
 * textured from the rasterized resume PDF (preview/pdfTexture.ts). Subtle
 * only: slow float, small mouse-parallax tilt, no spin. Pauses its render
 * loop when off-screen or the tab is hidden.
 *
 * Sprint 10F.2: camera distance is never hardcoded — computeFitDistance()
 * (a "contain"-style fit, like CSS object-fit: contain) sizes it so the
 * whole page is always visible, recomputed only on mount, on container
 * resize, and on Reset View — never per-frame. The FOV itself is fixed, so
 * only distance changes; true A4 proportions are never distorted.
 */
export const ResumeScene = React.forwardRef<ResumeSceneHandle, ResumeSceneProps>(function ResumeScene(
  { canvas, version },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetTiltRef = useRef({ x: 0, y: 0 });
  const currentTiltRef = useRef({ x: 0, y: 0 });
  const paperMeshRef = useRef<THREE.Mesh | null>(null);
  const paperMaterialsRef = useRef<THREE.MeshStandardMaterial[] | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
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
  // Sprint 12 Phase 3: armed whenever a new texture is assigned — the
  // animate loop lerps the front material's color from a dim "blank" tone
  // up to full white over TEXTURE_REVEAL_MS, so new content reveals itself
  // instead of popping in on the frame the fetch resolves.
  const textureRevealRef = useRef<{ start: number } | null>(null);

  useImperativeHandle(ref, () => ({
    resetView() {
      targetTiltRef.current = { x: 0, y: 0 };
      const { width, height } = lastSizeRef.current;
      const target = computeFitDistance(width, height);
      targetDistanceRef.current = target;
      if (REDUCE_MOTION && cameraRef.current) {
        cameraRef.current.position.z = target;
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

    // Sprint 12 Phase 3: rebalanced toward the key light (was ambient 0.75 /
    // key 0.55) — ambient nearly matching the key light flattened the
    // paper's sense of depth; a more directional-dominant mix reads as
    // "subtle depth" rather than evenly-lit, while staying soft (no
    // shadow-casting lights, no theatrical contrast).
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.68);
    keyLight.position.set(-1.2, 1.8, 2.2);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.22);
    fillLight.position.set(1.5, -0.6, 1.4);
    scene.add(fillLight);

    // Paper: a thin box so the edge reads as real paper thickness, not a decal.
    const blankMaterial = () => new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.92, metalness: 0 });
    const materials = [blankMaterial(), blankMaterial(), blankMaterial(), blankMaterial(), blankMaterial(), blankMaterial()];
    paperMaterialsRef.current = materials;
    const geometry = new THREE.BoxGeometry(PAPER_WIDTH, PAPER_HEIGHT, PAPER_DEPTH);
    const paper = new THREE.Mesh(geometry, materials);
    paperMeshRef.current = paper;
    scene.add(paper);

    // Soft shadow, static, sits slightly behind/below the paper.
    const shadowTexture = createShadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
    const shadowGeometry = new THREE.PlaneGeometry(PAPER_WIDTH * 1.7, PAPER_HEIGHT * 1.5);
    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.position.set(0.05, -0.08, -PAPER_DEPTH - 0.05);
    scene.add(shadowMesh);

    let elapsed = 0;
    let lastTime = performance.now();

    const frontMaterial = materials[4];

    const animate = () => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      const tilt = currentTiltRef.current;
      const target = targetTiltRef.current;
      tilt.x = dampen(tilt.x, target.x, TILT_HALF_LIFE_S, dt);
      tilt.y = dampen(tilt.y, target.y, TILT_HALF_LIFE_S, dt);

      paper.rotation.x = tilt.x;
      paper.rotation.y = tilt.y;

      if (REDUCE_MOTION) {
        paper.position.y = 0;
      } else {
        paper.rotation.z = Math.sin(elapsed * FLOAT_SPEED * SWAY_SPEED_RATIO + 0.7) * SWAY_AMPLITUDE;
        paper.position.y =
          Math.sin(elapsed * FLOAT_SPEED) * FLOAT_AMPLITUDE +
          Math.sin(elapsed * FLOAT_SPEED * FLOAT_SECONDARY_RATIO + 1.3) * FLOAT_SECONDARY_AMPLITUDE;
      }

      camera.position.z = dampen(camera.position.z, targetDistanceRef.current, DISTANCE_HALF_LIFE_S, dt);

      const reveal = textureRevealRef.current;
      if (reveal) {
        const progress = Math.min(1, (now - reveal.start) / TEXTURE_REVEAL_MS);
        // easeOutCubic — fast start, gentle settle, matches the "weighty" feel elsewhere in this pass.
        const eased = 1 - Math.pow(1 - progress, 3);
        frontMaterial.color.lerpColors(BLANK_PAPER_COLOR, REVEALED_PAPER_COLOR, eased);
        if (progress >= 1) textureRevealRef.current = null;
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

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetTiltRef.current = { x: -ny * MAX_TILT, y: nx * MAX_TILT };
    };
    const handlePointerLeave = () => {
      targetTiltRef.current = { x: 0, y: 0 };
    };
    // Sprint 12 Phase 3: mouse-parallax tilt is ambient motion, not a
    // required control — skip wiring it up at all under reduced motion,
    // consistent with the rest of this app's motion handling.
    if (!REDUCE_MOTION) {
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerleave', handlePointerLeave);
    }

    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      geometry.dispose();
      materials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      shadowTexture.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Texture (re)build — only when the rasterized resume actually changes,
  // never per-frame. Old texture is disposed before the new one is assigned.
  useEffect(() => {
    const materials = paperMaterialsRef.current;
    if (!materials || !canvas) return;

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    // Sharper text at the mouse-parallax tilt's oblique viewing angles —
    // free quality (GPU-native, no extra render pass), capped at whatever
    // this device actually supports.
    texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 1;

    const frontMaterial = materials[4];
    const oldTexture = frontMaterial.map;
    frontMaterial.map = texture;
    // Sprint 12 Phase 3: reveal via the animate loop's color lerp (dim ->
    // white) instead of snapping straight to white — the one moment this
    // pass identified as most noticeably unpolished (content used to just
    // pop in the instant the fetch resolved). Under reduced motion, skip
    // straight to the revealed state.
    if (REDUCE_MOTION) {
      frontMaterial.color.copy(REVEALED_PAPER_COLOR);
      textureRevealRef.current = null;
    } else {
      frontMaterial.color.copy(BLANK_PAPER_COLOR);
      textureRevealRef.current = { start: performance.now() };
    }
    frontMaterial.needsUpdate = true;
    oldTexture?.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, version]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
});
