import React, { forwardRef } from 'react';

export const ACCENT = '#38BDF8';
export const TEXT = '#E5E7EB';
export const MUTED = '#9CA3AF';
export const SUCCESS = '#6EE7B7';
export const BORDER = 'rgba(255,255,255,.08)';
export const PANEL_BG = '#161B22';
export const PAGE_BACKGROUND = '#0F1117';
const DOT_COLORS = ['#ff5f56', '#ffbd2e', '#27c93f'];

/**
 * The shared terminal shell for the project-page grammar established by
 * Cortexa's redesign and extracted here (Rakshachakra Grammar Extraction,
 * Phase 2) so a second project doc can use the exact same visual system
 * without importing Cortexa's own file. Originally `CortexaTerminalPanel`,
 * which now re-exports this component unchanged — see that file's own
 * comment. Nothing about its rendering changed in the move; every prop,
 * class, and colour below is byte-identical to what it replaced.
 *
 * Structurally modeled on hire_me.md's own terminal (`TerminalWindowSvg`) —
 * same radius, hairline header divider instead of a filled title bar, same
 * traffic-light dot treatment — but in HTML/CSS rather than SVG (this shell
 * needs to hold arbitrary React children, not a fixed set of parsed report
 * lines).
 *
 * `panelRef` is forwarded so a connector/wire system (Cortexa's own
 * `CortexaConnectors`) can measure this panel's on-screen box — the panel
 * itself has no idea a wire exists, and a caller with no wire (Rakshachakra,
 * currently) simply never passes a ref.
 *
 * `dormant` renders the whole shell — chrome, title and traffic lights
 * alike — at low opacity: a process that exists but hasn't been reached by
 * the dependency chain yet. It's a single opacity on the root rather than
 * per-element muting so the panel dims as one object, and the panel stays
 * mounted at full size throughout, which is what keeps the composition
 * stable and any connector from ever needing to re-route.
 */
export const ProjectTerminalPanel = forwardRef<
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
>(function ProjectTerminalPanel(
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
