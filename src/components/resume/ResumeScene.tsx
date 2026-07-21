import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RESUME_PAGE_WIDTH_PX, RESUME_PAGE_HEIGHT_PX } from './ResumeDocument';

export interface ResumeSceneHandle {
  /** Recenters tilt/parallax to their resting pose (does not touch the texture). */
  resetView: () => void;
}

interface ResumeSceneProps {
  /** The rasterized resume (see resumeCapture.ts). null = not built yet, paper renders blank. */
  canvas: HTMLCanvasElement | null;
  /** Bump whenever `canvas` has been re-rasterized in place and the texture must be rebuilt. */
  version: number;
}

const PAPER_ASPECT = RESUME_PAGE_HEIGHT_PX / RESUME_PAGE_WIDTH_PX;
const PAPER_WIDTH = 1.5;
const PAPER_HEIGHT = PAPER_WIDTH * PAPER_ASPECT;
const PAPER_DEPTH = 0.012;

const FLOAT_AMPLITUDE = 0.045;
const FLOAT_SPEED = 0.55;
const MAX_TILT = 0.12;
const TILT_EASE = 0.06;

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
 * textured from the rasterized resume DOM (ResumeDocument.tsx via
 * resumeCapture.ts). Subtle only: slow float, small mouse-parallax tilt, no
 * spin. Pauses its render loop when off-screen or the tab is hidden.
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
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    resetView() {
      targetTiltRef.current = { x: 0, y: 0 };
    },
  }));

  // Scene setup — runs once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 2.9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
    keyLight.position.set(-1.2, 1.8, 2.2);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
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

    const animate = () => {
      if (!runningRef.current) return;
      rafRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      const tilt = currentTiltRef.current;
      const target = targetTiltRef.current;
      tilt.x += (target.x - tilt.x) * TILT_EASE;
      tilt.y += (target.y - tilt.y) * TILT_EASE;

      paper.rotation.x = tilt.x;
      paper.rotation.y = tilt.y;
      paper.position.y = Math.sin(elapsed * FLOAT_SPEED) * FLOAT_AMPLITUDE;

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
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
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
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

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

    const frontMaterial = materials[4];
    const oldTexture = frontMaterial.map;
    frontMaterial.map = texture;
    frontMaterial.color.set(0xffffff);
    frontMaterial.needsUpdate = true;
    oldTexture?.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, version]);

  return <div ref={containerRef} className="h-full w-full" />;
});
