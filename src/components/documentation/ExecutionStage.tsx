import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import { useWireAnchorRef, useWireEdgeStatusSetter, type WireAnchorId, type WireEdgeId } from './CortexaWireContext';

const REVEAL_DELAY_MS = 500;

type Phase = 'idle' | 'connector' | 'revealed';
const PHASE_ORDER: Phase[] = ['idle', 'connector', 'revealed'];

/**
 * Cortexa Workspace Refinement §3–5 — one beat of the page's execution
 * narrative: `children` mounts once the incoming execution wire "arrives"
 * (its own pulsing phase completes) and the section has scrolled into
 * view. No terminal, no command echo, no locally-drawn connector — the
 * previous iteration's small arrow/line lived here directly; that's gone
 * now too, replaced by ExecutionWireLayer, one centralized SVG layer that
 * draws every wire on the page from real DOM geometry. This component's
 * only remaining job is to (a) decide *when* its own stage is allowed to
 * start, and (b) report that timing to the wire layer as `{pulsing,
 * connected}` status on `wireEdgeId` — never to render a wire itself.
 *
 * `anchorIn`/`anchorOut` register this stage's own wrapper div as the wire
 * layer's target-then-source anchor points (`anchorOut` is undefined for a
 * terminal stage like Continue Exploring, which nothing wires onward from).
 * Because both anchors point at the *same* wrapper — whose height grows as
 * `children` reveals internally (e.g. FeatureOutputTerminal typing more
 * lines) — the outgoing wire naturally re-routes to chase that growth, for
 * free, via ExecutionWireLayer's own ResizeObserver.
 *
 * Two things gate when `children` is allowed to mount: `enabled` (the
 * *previous* stage has finished — chained by the caller, so multiple
 * stages stacked close together near the top of the page can't all fire at
 * once just because they're all technically inside the initial viewport)
 * and `useInViewOnce`'s own one-shot scroll-into-view signal (`inView`) —
 * both must be true. Once both are true the stage always finishes playing
 * regardless of further scrolling. Session-gated (hasAnimated/markAnimated,
 * keyed on `sessionKey`) like every other reveal in this workspace: once
 * played this session, a remount renders the finished state immediately
 * with no replay.
 */
export function ExecutionStage({
  sessionKey,
  wireEdgeId,
  anchorIn,
  anchorOut,
  enabled,
  onRevealed,
  children,
}: {
  sessionKey: string;
  wireEdgeId: WireEdgeId;
  anchorIn: WireAnchorId;
  anchorOut?: WireAnchorId;
  enabled: boolean;
  onRevealed?: () => void;
  children: React.ReactNode;
}) {
  const instant = useRef(hasAnimated(sessionKey) || prefersReducedMotion()).current;
  const [phase, setPhase] = useState<Phase>(instant ? 'revealed' : 'idle');
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.15);

  const anchorInRef = useWireAnchorRef(anchorIn);
  const anchorOutRef = useWireAnchorRef(anchorOut ?? anchorIn);
  const setEdgeStatus = useWireEdgeStatusSetter(wireEdgeId);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
      anchorInRef(node);
      if (anchorOut) anchorOutRef(node);
    },
    [ref, anchorInRef, anchorOut, anchorOutRef],
  );

  useEffect(() => {
    if (!instant && enabled && inView) {
      setPhase((p) => (p === 'idle' ? 'connector' : p));
    }
  }, [enabled, inView, instant]);

  useEffect(() => {
    if (phase !== 'connector') return undefined;
    const t = window.setTimeout(() => setPhase('revealed'), REVEAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (!instant && phase === 'revealed') markAnimated(sessionKey);
  }, [phase, instant, sessionKey]);

  useEffect(() => {
    if (phase === 'revealed') onRevealed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    setEdgeStatus({ pulsing: phase === 'connector', connected: phase === 'revealed' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const phaseAtLeast = (target: Phase) => PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);

  return (
    // Cortexa Workspace Refinement: `mt-12` reserves real vertical room for
    // the *incoming* wire to actually draw a visible line — without it, a
    // stage whose own top edge lands exactly where the previous stage's
    // bottom edge ends (zero gap, e.g. Core Features -> Continue Exploring,
    // both un-margined siblings) produces a geometrically valid but
    // zero-length wire path: correct math, invisible result. Applied
    // unconditionally (not just "between stages") so every incoming wire
    // gets the same breathing room, including the first stage's own.
    <div ref={setRefs} className="mt-12">
      {phaseAtLeast('revealed') && (
        <motion.div
          initial={instant ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
