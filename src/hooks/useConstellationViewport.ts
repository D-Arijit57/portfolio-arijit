import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The Tech Stack Constellation's interaction layer — pan, zoom, fit-to-
 * screen, reset, and click-to-focus, plus the native (non-passive) wheel
 * listener React's synthetic onWheel can't provide (a documented React
 * limitation — see facebook/react#14856: React attaches its synthetic
 * wheel listener as passive at the root, so event.preventDefault() inside
 * a plain onWheel prop silently fails, letting the browser's native page
 * scroll fire *alongside* any zoom logic instead of being suppressed by
 * it). Framework-independent of what's actually being rendered — it only
 * needs the layout's world-space bounding box to fit against.
 */

export interface ConstellationViewport {
  x: number;
  y: number;
  scale: number;
}

interface ViewportTransition {
  duration: number;
  ease?: [number, number, number, number];
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
// 1 - 2*0.13 = 0.74 — the graph occupies ~74% of the viewport on the
// constraining axis, squarely in the "70-80% hero" range with comfortable
// margins on all sides.
const FIT_PADDING_RATIO = 0.13;
const CLICK_DRAG_THRESHOLD = 4;
const INSTANT_TRANSITION: ViewportTransition = { duration: 0 };
const FOCUS_TRANSITION: ViewportTransition = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };

export function useConstellationViewport(layout: { width: number; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState<ConstellationViewport>({ x: 0, y: 0, scale: 1 });
  const [viewportTransition, setViewportTransition] = useState<ViewportTransition>(INSTANT_TRANSITION);
  const panState = useRef<{ pointerId: number; startX: number; startY: number; lastX: number; lastY: number } | null>(
    null,
  );
  const hasInteractedRef = useRef(false);

  const resetInteraction = () => {
    hasInteractedRef.current = false;
  };

  const fitToScreen = () => {
    const container = containerRef.current;
    if (!container || layout.width === 0 || layout.height === 0) return;
    const availableWidth = container.clientWidth * (1 - FIT_PADDING_RATIO * 2);
    const availableHeight = container.clientHeight * (1 - FIT_PADDING_RATIO * 2);
    const scale = Math.min(MAX_SCALE, availableWidth / layout.width, availableHeight / layout.height);
    // Layout positions are already shifted so (0,0)-(width,height) is the
    // bounding box — center that box in the container. A floating corner
    // card (the legend/detail card) doesn't reserve dedicated space, so
    // nothing needs to be subtracted here.
    setViewportTransition(INSTANT_TRANSITION);
    setViewport({
      scale,
      x: (container.clientWidth - layout.width * scale) / 2,
      y: (container.clientHeight - layout.height * scale) / 2,
    });
  };

  const fitToScreenManual = () => {
    resetInteraction();
    fitToScreen();
  };

  const resetView = () => {
    const container = containerRef.current;
    if (!container) return;
    resetInteraction();
    setViewportTransition(INSTANT_TRANSITION);
    setViewport({
      scale: 1,
      x: (container.clientWidth - layout.width) / 2,
      y: (container.clientHeight - layout.height) / 2,
    });
  };

  const focusOnNode = (pos: { x: number; y: number }) => {
    const container = containerRef.current;
    if (!container) return;
    hasInteractedRef.current = true;
    const scale = Math.max(viewport.scale, 1.15);
    setViewportTransition(FOCUS_TRANSITION);
    setViewport({
      scale,
      x: container.clientWidth / 2 - pos.x * scale,
      y: container.clientHeight / 2 - pos.y * scale,
    });
  };

  useLayoutEffect(() => {
    // Synchronous (pre-paint) fit — the graph must already be centered on
    // the very first frame the user sees, never a flash of an unfit/
    // default-positioned graph that then snaps into place a frame later.
    fitToScreen();
    // A same-frame measurement can land before the container has reached
    // its final size — mid-flight on the editor pane's own open/close
    // width transition, or before web fonts/sibling panels finish their
    // own layout pass. Re-fitting repeatedly across a short settle window
    // — instead of trusting a single measurement — converges on the
    // correct fit regardless of which of those is the culprit; every call
    // is instant (no animated transition), so there's no visible flicker,
    // and any real user interaction (pan/zoom/click) cancels the rest.
    const raf = requestAnimationFrame(() => {
      if (!hasInteractedRef.current) fitToScreen();
    });
    const settleDelaysMs = [80, 200, 350, 600];
    const timers = settleDelaysMs.map((ms) =>
      window.setTimeout(() => {
        if (!hasInteractedRef.current) fitToScreen();
      }, ms),
    );
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (!hasInteractedRef.current) fitToScreen();
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    (event.target as Element).setPointerCapture(event.pointerId);
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!panState.current || panState.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - panState.current.lastX;
    const dy = event.clientY - panState.current.lastY;
    panState.current.lastX = event.clientX;
    panState.current.lastY = event.clientY;
    hasInteractedRef.current = true;
    setViewportTransition(INSTANT_TRANSITION);
    setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>, onBackgroundClick: () => void) => {
    const pan = panState.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const movedDistance = Math.hypot(event.clientX - pan.startX, event.clientY - pan.startY);
    const clickedNode = (event.target as Element).closest('[data-constellation-node]');
    if (movedDistance < CLICK_DRAG_THRESHOLD && !clickedNode) {
      onBackgroundClick();
    }
    panState.current = null;
  };

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      hasInteractedRef.current = true;
      setViewportTransition(INSTANT_TRANSITION);
      setViewport((v) => {
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * zoomFactor));
        const worldX = (cursorX - v.x) / v.scale;
        const worldY = (cursorY - v.y) / v.scale;
        return { scale: nextScale, x: cursorX - worldX * nextScale, y: cursorY - worldY * nextScale };
      });
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  return {
    containerRef,
    svgRef,
    viewport,
    viewportTransition,
    fitToScreenManual,
    resetView,
    focusOnNode,
    resetInteraction,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
