import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, RotateCcw, Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { ResizeHandle } from '../shared/ResizeHandle';
import { HireMeDocumentView } from './HireMeDocumentView';
import { ResumeStage } from './preview/ResumeStage';
import { SceneControlsPanel } from './preview/SceneControlsPanel';
import { ResumeScene, type ResumeSceneHandle } from './ResumeScene';
import { StageFallback, detectWebGLSupport } from './preview/StageFallback';
import { fetchResumePdf, downloadResumePdf } from './export/fetchResumePdf';
import { renderPdfPageToCanvas } from './preview/pdfTexture';
import { getDefaultResumeVariant } from './variants/resumeRegistry';
import type { VirtualFile } from '../../types';

// Sprint 10F.1: lowered from 640 so the continuous ratio-based resize (which
// already shrinks the 3D preview's rendered scale as the container narrows,
// since ResumeScene's own ResizeObserver reframes the camera) gets more room
// to "reduce preview scale" before the layout collapses to stacked, per the
// brief's "avoid aggressive stacking" requirement.
const STACK_BREAKPOINT_PX = 480;
const MIN_PANEL_PX = 240;

// Sprint 16: replaces the old fixed COMPILING_MS/RENDERING_MS cosmetic
// timers (1100ms of pretending work was happening in two make-believe
// phases). The preview is now lifecycle-driven — this is a floor under the
// *real* fetch+rasterize timeline, not an artificial delay: on a warm cache
// the real work can resolve in under 100ms, and without a floor the
// Assembling state (see ResumeScene.tsx) would just flicker. If the real
// work takes longer than this, the floor does nothing — Assembling simply
// stays active until data genuinely arrives.
const MIN_ASSEMBLING_MS = 450;
const READY_HOLD_MS = 450;

type BuildPhase = 'idle' | 'assembling' | 'ready';

type PreviewTab = 'PREVIEW' | '3D CONTROLS';

const PREVIEW_TABS: PreviewTab[] = ['PREVIEW', '3D CONTROLS'];

// Probed once per session, not per mount — the answer cannot change while
// the page is open, and each probe costs a real (if short-lived) WebGL
// context.
const WEBGL_SUPPORTED = detectWebGLSupport();

const PHASE_LABEL: Record<Exclude<BuildPhase, 'idle'>, string> = {
  assembling: 'Assembling resume...',
  ready: 'Preview ready.',
};

/**
 * Sprint 10F.1: RESUME.md's dedicated two-panel view — a custom editor
 * experience (like profile.md's), not the generic markdown renderer for the
 * page as a whole. RIGHT is the Three.js preview of the actual downloadable
 * resume; this has never changed.
 *
 * hire_me.md: LEFT is a hand-authored, CLI-report-styled artifact — "why
 * hire this engineer" — while the PDF on the right continues answering
 * "what has this engineer done." The two panels are deliberately different
 * artifacts rather than the same content twice. `HireMeDocumentView` renders
 * it through its own line-based terminal parser, not the generic markdown
 * pipeline README.md and other plain docs use — see that file's doc comment.
 *
 * Sprint 12: the resume PDF is a static asset (public/resume/), not a
 * backend-generated document — the dynamic LaTeX/Tectonic pipeline was
 * removed as unnecessary complexity for a portfolio. The preview texture
 * (preview/pdfTexture.ts rendering the static PDF's first page) and the
 * Download button (saving the same static file directly, no fetch) both
 * point at the one file in variants/resumeRegistry.ts's downloadFilename,
 * never a generated or reconstructed document. This side is untouched by
 * RFC-2026 — the left panel's content has no bearing on it, and never did:
 * the only thing that ever crossed from left to right is a reveal-complete
 * *timing* signal, not data (see handleRevealComplete below).
 */
export function ResumeWorkspace({ file }: { file: VirtualFile }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ResumeSceneHandle>(null);
  // Sprint 10F.5: resolved once per mount — the one place this workspace
  // decides which resume variant it's showing. Swapping the default in
  // variants/resumeRegistry.ts changes what renders here with no other
  // change needed.
  const resumeVariant = getDefaultResumeVariant();

  const [isNarrow, setIsNarrow] = useState(false);
  // Terminal SVG Integration: 53/47 (was 45/55) — the hire_me.md terminal
  // window is now the hero on this side, and it needs the extra width to
  // read as a real terminal report rather than a cramped inset panel.
  const [ratio, setRatio] = useState(0.53);
  const [phase, setPhase] = useState<BuildPhase>('idle');
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [version, setVersion] = useState(0);
  // Sprint 16: true from mount until the first (or a refreshed) preview is
  // actually ready — ResumeScene reads this to know whether to show the
  // Assembling state, independent of whether `canvas` itself has changed
  // yet. Starts true: before the very first build ever runs, the paper
  // should already read as "assembling," not the old flat blank material.
  const [isAssembling, setIsAssembling] = useState(true);
  // Spec §9.4: PREVIEW is the zero-configuration default; 3D CONTROLS is
  // where expert affordances (and the clamped orbit) live.
  const [tab, setTab] = useState<PreviewTab>('PREVIEW');
  const [viewDirty, setViewDirty] = useState(false);
  const webglSupported = WEBGL_SUPPORTED;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(width > 0 && width < STACK_BREAKPOINT_PX);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleResize = (deltaPx: number) => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 0;
    if (containerWidth <= 0) return;
    const minRatio = Math.min(0.4, MIN_PANEL_PX / containerWidth);
    setRatio((prev) => {
      const next = prev + deltaPx / containerWidth;
      return Math.min(1 - minRatio, Math.max(minRatio, next));
    });
  };

  const runBuildPipeline = useCallback(() => {
    setIsAssembling(true);
    setPhase('assembling');
    const start = performance.now();
    void (async () => {
      // Fetch the static resume PDF and render its first page for the
      // Three.js texture — the only producer of preview pixels, no
      // fallback needed since the static asset is always present.
      const bytes = await fetchResumePdf();
      const rasterized = await renderPdfPageToCanvas(bytes);
      // The floor, not a delay: only waits if the real work above finished
      // faster than MIN_ASSEMBLING_MS. If it took longer, `remaining` is 0
      // and we reveal the instant data is ready — Assembling never
      // outlasts the real wait, and never gets skipped on a fast cache hit.
      const remaining = MIN_ASSEMBLING_MS - (performance.now() - start);
      if (remaining > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remaining));
      }
      setCanvas(rasterized);
      setVersion((v) => v + 1);
      setIsAssembling(false);
      setPhase('ready');
      window.setTimeout(() => setPhase('idle'), READY_HOLD_MS);
    })();
  }, []);

  const handleRevealComplete = useCallback(() => {
    runBuildPipeline();
  }, [runBuildPipeline]);

  const handleDownloadPdf = () => {
    downloadResumePdf(resumeVariant.downloadFilename);
  };

  const handleResetView = () => {
    sceneRef.current?.resetView();
  };

  // Spec §3.4 / §9.4: entering 3D CONTROLS is what unlocks the clamped
  // orbit; leaving it returns the stage to its hero framing, so a visitor
  // can never carry an inspect-state camera back into the default tab.
  const handleTabChange = (next: PreviewTab) => {
    setTab(next);
    sceneRef.current?.setState(next === '3D CONTROLS' ? 'inspect' : 'staged');
  };

  return (
    <div ref={containerRef} className={cn('flex h-full w-full min-h-0 bg-[#1e1e1e]', isNarrow && 'flex-col')}>
      <div
        style={isNarrow ? undefined : { width: `${ratio * 100}%` }}
        className={cn('min-w-0 min-h-0 border-[#333333]', isNarrow ? 'w-full h-1/2 border-b' : 'shrink-0 border-r')}
      >
        <HireMeDocumentView file={file} onRevealComplete={handleRevealComplete} />
      </div>

      {!isNarrow && <ResizeHandle direction="horizontal" onResize={handleResize} />}

      <div className={cn('flex flex-col min-w-0 min-h-0', isNarrow ? 'w-full h-1/2' : 'flex-1')}>
        {/* Sprint 17 (spec §5.1): tab strip above, toolbar below it. The
            two were previously one left-aligned row of equal-weight
            buttons, which gave the pane no sense of what it *is* — the
            tabs name the surface, and the toolbar acts on it. */}
        <div className="flex shrink-0 items-center gap-6 border-b border-[var(--resume-rule)] bg-[#252526] px-4">
          {/* Without WebGL there is no scene to control, and a tab that
              opens an inert panel is worse than no tab. */}
          {(webglSupported ? PREVIEW_TABS : (['PREVIEW'] as PreviewTab[])).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              aria-selected={t === tab}
              className={cn(
                'relative py-2.5 text-[11.5px] font-medium uppercase tracking-[0.12em] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[var(--resume-accent)]',
                t === tab
                  ? 'text-[var(--resume-fg-strong)]'
                  : 'text-[var(--resume-fg-faint)] hover:text-[var(--resume-fg-muted)]'
              )}
            >
              {t}
              {t === tab && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--resume-accent)]" />}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1.5 border-b border-[var(--resume-rule)] bg-[#252526] px-3 py-2">
          <AnimatePresence mode="wait">
            {phase !== 'idle' && (
              <motion.span
                key={phase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mr-auto shrink-0 font-mono text-[11px] text-[var(--resume-fg-muted)]"
              >
                {PHASE_LABEL[phase]}
              </motion.span>
            )}
          </AnimatePresence>
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarButton onClick={runBuildPipeline} icon={<RefreshCw size={13} />} label="Refresh Preview" />
            {/* Sprint 18 (spec §9.5 / §12.1): disabled until the view is
                actually dirty. A permanently live reset button advertises
                that the thing gets broken. */}
            <ToolbarButton
              onClick={handleResetView}
              icon={<RotateCcw size={13} />}
              label="Reset View"
              disabled={!viewDirty}
            />
            {/* The one filled button in this pane — everything else is a
                ghost, so the primary action is unambiguous. */}
            <ToolbarButton onClick={handleDownloadPdf} icon={<Download size={13} />} label="Download PDF" primary />
          </div>
        </div>

        <ResumeStage>
          {/* Spec §8.3: the fallback ladder. WebGL is never on the critical
              path — tier 3/4 renders from the same rasterised page the
              scene would have textured, so the panel is meaningful with a
              blocklisted GPU, a disabled flag, or no WebGL at all. */}
          {webglSupported ? (
            <>
              <ResumeScene
                ref={sceneRef}
                canvas={canvas}
                version={version}
                isAssembling={isAssembling}
                onDirtyChange={setViewDirty}
              />
              {tab === '3D CONTROLS' && <SceneControlsPanel scene={sceneRef} />}
            </>
          ) : (
            <StageFallback canvas={canvas} />
          )}
        </ResumeStage>
      </div>
    </div>
  );
}

/**
 * Sprint 17 (spec §5.1): `primary` is the filled accent treatment, used by
 * exactly one button in this pane (Download PDF). Everything else is a
 * ghost with a hairline border — previously all three were the same filled
 * grey, which made the pane's actual purpose ambiguous.
 */
function ToolbarButton({
  onClick,
  icon,
  label,
  disabled,
  primary,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] outline-none transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
        primary
          ? 'border border-transparent bg-[var(--resume-accent)] text-white hover:bg-[#5b52ea] focus-visible:ring-2 focus-visible:ring-[var(--resume-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252526]'
          : 'border border-[var(--resume-rule)] bg-transparent text-[var(--resume-fg)] hover:border-[#3c3c3c] hover:bg-[#2d2d2d] focus-visible:ring-1 focus-visible:ring-[var(--resume-accent)]'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
