import React, { forwardRef } from 'react';

const ACCENT = '#38BDF8';
const TEXT = '#E5E7EB';
const BORDER = 'rgba(255,255,255,.08)';
const PANEL_BG = '#161B22';
const DOT_COLORS = ['#ff5f56', '#ffbd2e', '#27c93f'];

/**
 * Cortexa Redesign Phase 1 — the shared terminal shell every shell on the
 * page (`./problem.sh`, `./cortexa.sh`, `./run-cortexa`) is built from, so
 * "every shell should feel like it belongs to the same component system"
 * (the brief's own words) is true by construction rather than by convention.
 * Structurally modeled on hire_me.md's own terminal (`TerminalWindowSvg`) —
 * same radius, hairline header divider instead of a filled title bar, same
 * traffic-light dot treatment — but in HTML/CSS rather than SVG (this shell
 * needs to hold arbitrary React children, not a fixed set of parsed report
 * lines) and recolored to this page's own palette. Dots sit on the right of
 * the header per the reference mockup (hire_me's own are on the left).
 *
 * `panelRef` is forwarded so `CortexaConnectors` can measure this panel's
 * on-screen box to route a static wire to/from it — the panel itself has no
 * idea a wire exists.
 *
 * `dormant` renders the whole shell — chrome, title and traffic lights
 * alike — at low opacity: a process that exists but hasn't been reached by
 * the dependency chain yet. It's a single opacity on the root rather than
 * per-element muting so the panel dims as one object, and the panel stays
 * mounted at full size throughout, which is what keeps the composition
 * stable and the connectors from ever needing to re-route.
 */
export const CortexaTerminalPanel = forwardRef<
  HTMLDivElement,
  {
    fileName: string;
    headerExtra?: React.ReactNode;
    bodyClassName?: string;
    className?: string;
    dormant?: boolean;
    /** Body padding utility. An explicit prop rather than something callers
     * override through `bodyClassName`, because two competing padding
     * utilities on one element resolve by stylesheet order, not class
     * order — which is not something to leave to chance. */
    bodyPadding?: string;
    children: React.ReactNode;
  }
>(function CortexaTerminalPanel(
  { fileName, headerExtra, bodyClassName = '', className = '', dormant = false, bodyPadding = 'p-6', children },
  panelRef,
) {
  return (
    <div
      ref={panelRef}
      className={`overflow-hidden rounded-xl ${className}`}
      style={{
        backgroundColor: PANEL_BG,
        border: `1px solid ${BORDER}`,
        opacity: dormant ? 0.3 : 1,
        transition: 'opacity 250ms ease-out',
      }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <span className="font-mono text-[13px]">
          <span style={{ color: ACCENT }}>$ </span>
          <span style={{ color: TEXT }}>{fileName}</span>
        </span>
        <div className="flex items-center gap-3">
          {headerExtra}
          <div className="flex items-center gap-[6px]">
            {DOT_COLORS.map((color) => (
              <span key={color} className="h-[9px] w-[9px] rounded-full" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>
      <div className={`${bodyPadding} font-mono text-[14px] leading-[1.9] ${bodyClassName}`} style={{ color: TEXT }}>
        {children}
      </div>
    </div>
  );
});
