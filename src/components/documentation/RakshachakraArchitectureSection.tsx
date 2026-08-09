import React, { useEffect, useState } from 'react';
import { ArchitectureCanvas } from '../architecture/ArchitectureCanvas';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { ACCENT, BORDER, MUTED } from './ProjectTerminalPanel';
import type { VirtualFile } from '../../types';

/**
 * The technical centerpiece of Rakshachakra's page — its real, already-
 * working ArchitectureCanvas (14 nodes, 5 layers; the same shared renderer
 * Cortexa's own architecture.mmd uses), embedded inline here rather than
 * only linked out from Continue Exploring.
 *
 * This is a deliberate difference from Cortexa's own grammar, not an
 * inconsistency: Cortexa's redesign reaches architecture only via `$ tree .`
 * because run-cortexa's session replay is *that* page's centerpiece.
 * Rakshachakra has no replay — no recorded session exists for a demo/
 * prototype — so its real architecture model is the most technically
 * meaningful thing this page actually has (Phase 1 audit: "Cortexa's
 * GRAMMAR is reusable. Cortexa's VISUALIZATION is not automatically
 * reusable"). It stays linked from Continue Exploring too (opens the same
 * file full-screen) — this embed doesn't replace that path, it adds an
 * inline preview of it.
 *
 * No fabricated "resolving layers... resolving dependencies..." loading
 * text: gating the mount on scroll visibility is a real performance choice
 * (ArchitectureCanvas sets up pan/zoom/fit-to-view and isn't free to keep
 * idle off-screen), not a boot sequence pretending to do work — there is
 * nothing true to narrate about what is, once triggered, an instant mount.
 *
 * Gated on its own visibility alone, never chained to an upstream
 * terminal's completion — an earlier version (Phase 2) held this behind a
 * different section's own multi-second typewriter finishing, on the theory
 * that the page should reveal strictly in order. Visually verified that a
 * reader who scrolled straight past that still-typing terminal hit a blank
 * box for several seconds waiting on an animation happening off-screen,
 * exactly the "wait for my portfolio animation to finish" anti-pattern
 * later briefs warned against — the reader had already arrived here, so
 * there was nothing left to sequence. `RakshachakraPipelineTerminal` and
 * `ProjectExploreTerminal` are both independently `useInViewOnce`-gated for
 * the same reason; only `problem.sh → signals.sh → pipeline.sh` (the actual
 * dependency chain) is signal-gated end to end.
 *
 * Fixed height, not `h-full`: ArchitectureCanvas expects a parent with a
 * definite height (it's normally opened as a full editor pane via
 * EditorRenderer's own mermaid branch); embedded in a normally-flowing
 * scrollable doc, it needs an explicit box to size against or it collapses
 * to nothing.
 */
export function RakshachakraArchitectureSection({ file }: { file: VirtualFile }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (inView) setMounted(true);
  }, [inView]);

  return (
    <div ref={ref} className="mt-16 w-full">
      <p className="mb-4 flex items-center gap-2 font-mono text-[13px]">
        <span style={{ color: ACCENT }}>$</span>
        <span style={{ color: MUTED }}>inspect architecture</span>
      </p>
      <div className="w-full overflow-hidden rounded-xl" style={{ height: 600, border: `1px solid ${BORDER}` }}>
        {mounted && <ArchitectureCanvas file={file} />}
      </div>
    </div>
  );
}
