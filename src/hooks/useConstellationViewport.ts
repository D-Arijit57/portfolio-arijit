import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

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

interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Reserved-chrome configuration — the viewport's usable canvas is the
 * container minus whatever persistent floating UI (legend/detail card,
 * the fit/reset toolbar, and any future panel) actually occupies right
 * now. Nothing about a specific panel's size or corner is hardcoded here:
 * each ref just points at a real rendered DOM element, measured fresh on
 * every fit via getBoundingClientRect(). A caller that wants a new
 * floating panel to reserve space adds its ref to this array — nothing
 * else in the fit/center/focus math needs to know that panel exists.
 */
export interface ConstellationViewportOptions {
  reservedChromeRefs?: RefObject<HTMLElement | null>[];
}

// How close (px) a panel's edge must sit to a container edge to be
// treated as anchored to it. Panels are typically pinned via `top-3`/
// `right-3`-style utility classes (a few px of breathing room), so this
// just needs to comfortably clear that gap — it is not a per-panel
// dimension, only the tolerance for "is this panel hugging this edge."
const CHROME_ANCHOR_PROXIMITY_PX = 48;
// Reserved chrome may never claim more than this fraction of either axis
// — a defense-in-depth safety floor on the reservation system itself
// (not a per-panel value), in case some future panel configuration isn't
// cleanly separable on a single axis. With computeReservedInsets now
// reserving only one axis per panel (see its own comment), the ordinary
// case never comes remotely close to this — it exists purely to stop a
// pathological one from collapsing the fit to zero.
const MAX_RESERVED_FRACTION = 0.85;

/**
 * Derives how much of the container's top/right/bottom/left a set of
 * corner-anchored floating panels occupies, purely from their measured
 * geometry — no panel-specific widths/positions are known or assumed.
 *
 * Two axis-aligned rectangles fail to overlap as soon as they're
 * separated along *either one* axis (the separating-axis test) — so a
 * corner panel only ever needs ONE of its two edges reserved, never
 * both. Reserving both (an earlier version of this function did) is
 * pure waste: it doesn't buy any additional collision-safety, it just
 * shrinks the usable box on an axis that didn't need shrinking. This
 * app's canvas is chronically wide-but-short, so the horizontal axis is
 * preferred whenever a panel has a valid horizontal anchor — spending
 * the reservation on the axis with more slack to spare, protecting the
 * one that's already scarce. A panel with no horizontal anchor (e.g. a
 * hypothetical full-width banner) falls back to a vertical reservation,
 * since that's the only separating axis available for it.
 */
function computeReservedInsets(containerRect: DOMRect, panelRects: DOMRect[]): Insets {
  const raw: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const r of panelRects) {
    const distTop = r.top - containerRect.top;
    const distBottom = containerRect.bottom - r.bottom;
    const distLeft = r.left - containerRect.left;
    const distRight = containerRect.right - r.right;
    const hasHorizontalAnchor = distLeft <= CHROME_ANCHOR_PROXIMITY_PX || distRight <= CHROME_ANCHOR_PROXIMITY_PX;

    if (hasHorizontalAnchor) {
      if (distLeft <= distRight) raw.left = Math.max(raw.left, r.right - containerRect.left);
      else raw.right = Math.max(raw.right, containerRect.right - r.left);
    } else if (distTop <= CHROME_ANCHOR_PROXIMITY_PX || distBottom <= CHROME_ANCHOR_PROXIMITY_PX) {
      if (distTop <= distBottom) raw.top = Math.max(raw.top, r.bottom - containerRect.top);
      else raw.bottom = Math.max(raw.bottom, containerRect.bottom - r.top);
    }
  }

  const maxVertical = containerRect.height * MAX_RESERVED_FRACTION;
  const verticalTotal = raw.top + raw.bottom;
  const verticalScale = verticalTotal > maxVertical && verticalTotal > 0 ? maxVertical / verticalTotal : 1;
  const maxHorizontal = containerRect.width * MAX_RESERVED_FRACTION;
  const horizontalTotal = raw.left + raw.right;
  const horizontalScale = horizontalTotal > maxHorizontal && horizontalTotal > 0 ? maxHorizontal / horizontalTotal : 1;

  return {
    top: raw.top * verticalScale,
    bottom: raw.bottom * verticalScale,
    left: raw.left * horizontalScale,
    right: raw.right * horizontalScale,
  };
}

/** The rectangle the constellation actually has to work with, in
 * container-local coordinates — the container's own box minus whatever
 * reserved chrome insets apply. Every centering computation (fit, reset,
 * focus) targets this box's center, not the raw container's. */
function getUsableBox(containerWidth: number, containerHeight: number, insets: Insets) {
  const width = Math.max(0, containerWidth - insets.left - insets.right);
  const height = Math.max(0, containerHeight - insets.top - insets.bottom);
  return {
    width,
    height,
    centerX: insets.left + width / 2,
    centerY: insets.top + height / 2,
  };
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
// 1 - 2*0.13 = 0.74 — the graph occupies ~74% of the *usable* canvas on
// the constraining axis, squarely in the "70-80% hero" range with
// comfortable margins on all sides.
const FIT_PADDING_RATIO = 0.13;
// The authored layout's bounding box is roughly square, while the actual
// drawable canvas (editor pane minus header/terminal) is a wide letterbox
// shape — pure "contain" fit (scale bound by whichever axis is smaller)
// leaves the composition reading as a small island in empty space on the
// non-constraining axis. This biases toward "cover" (scale bound by the
// LARGER axis) instead, capped so it never crops more than a modest
// fraction beyond the contain scale — a hero visualization is allowed to
// bleed past the frame's top/bottom a little, but shouldn't crop stars
// out of an already-tight composition.
const COVER_BOOST = 0.55;
const CLICK_DRAG_THRESHOLD = 4;
const INSTANT_TRANSITION: ViewportTransition = { duration: 0 };
const FOCUS_TRANSITION: ViewportTransition = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };

export function useConstellationViewport(
  layout: { width: number; height: number },
  options: ConstellationViewportOptions = {},
) {
  const { reservedChromeRefs = [] } = options;
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

  /** Measures the container and every reserved-chrome ref right now and
   * derives the usable box to center/fit against — called fresh from
   * each of fit/reset/focus rather than cached, since which panel is
   * mounted (legend vs. the wider selected-node detail card) can change
   * between calls. */
  const measureUsableBox = () => {
    const container = containerRef.current;
    if (!container) return null;
    const containerRect = container.getBoundingClientRect();
    const panelRects = reservedChromeRefs
      .map((ref) => ref.current?.getBoundingClientRect())
      .filter((rect): rect is DOMRect => !!rect);
    const insets = computeReservedInsets(containerRect, panelRects);
    return { container, usable: getUsableBox(container.clientWidth, container.clientHeight, insets) };
  };

  const fitToScreen = () => {
    if (layout.width === 0 || layout.height === 0) return;
    const measured = measureUsableBox();
    if (!measured) return;
    const { usable } = measured;
    const availableWidth = usable.width * (1 - FIT_PADDING_RATIO * 2);
    const availableHeight = usable.height * (1 - FIT_PADDING_RATIO * 2);
    const containScale = Math.min(availableWidth / layout.width, availableHeight / layout.height);
    const coverScale = Math.max(availableWidth / layout.width, availableHeight / layout.height);
    const scale = Math.min(MAX_SCALE, coverScale, containScale * (1 + COVER_BOOST));
    // Layout positions are already shifted so (0,0)-(width,height) is the
    // bounding box — center that box within the *usable* area, not the
    // raw container, so reserved chrome (the legend/detail card, the
    // toolbar) never visually collides with the composition.
    setViewportTransition(INSTANT_TRANSITION);
    setViewport({
      scale,
      x: usable.centerX - (layout.width * scale) / 2,
      y: usable.centerY - (layout.height * scale) / 2,
    });
  };

  const fitToScreenManual = () => {
    resetInteraction();
    fitToScreen();
  };

  const resetView = () => {
    const measured = measureUsableBox();
    if (!measured) return;
    const { usable } = measured;
    resetInteraction();
    setViewportTransition(INSTANT_TRANSITION);
    setViewport({
      scale: 1,
      x: usable.centerX - layout.width / 2,
      y: usable.centerY - layout.height / 2,
    });
  };

  const focusOnNode = (pos: { x: number; y: number }) => {
    const measured = measureUsableBox();
    if (!measured) return;
    const { usable } = measured;
    hasInteractedRef.current = true;
    const scale = Math.max(viewport.scale, 1.15);
    setViewportTransition(FOCUS_TRANSITION);
    setViewport({
      scale,
      x: usable.centerX - pos.x * scale,
      y: usable.centerY - pos.y * scale,
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
