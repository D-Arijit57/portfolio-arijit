import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
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
import { parseTerminalContent } from './terminal/parseTerminalLines';
import { CLAIMS, CLAIM_BY_BULLET_INDEX } from './evidence/claims';
import { EvidenceRail } from './evidence/EvidenceRail';
import { EvidenceConnector } from './evidence/EvidenceConnector';
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

/**
 * Phase 9E: the right pane's two views. `EVIDENCE` is the default and the
 * reason this pane exists at rest; `DOCUMENT` is the resume experience,
 * unchanged, moved behind a tab rather than being the pane's whole identity.
 *
 * This replaces the old `PREVIEW` / `3D CONTROLS` pair, which named two modes
 * of a 3D application rather than two things a workspace can show you. The 3D
 * controls did not disappear with that tab — they live inside DOCUMENT now
 * (see the SceneControlsPanel toggle below), which is where a control for the
 * scene belongs.
 */
type RightTab = 'EVIDENCE' | 'DOCUMENT';

const RIGHT_TABS: RightTab[] = ['EVIDENCE', 'DOCUMENT'];

/** Below this the panes are too narrow for an S-curve to read as a connection
 * rather than as a stray diagonal, so the connector switches off and the
 * highlight link carries the relationship on its own.
 *
 * Measured against the *editor pane*, not the viewport: at a 1280px window
 * this container is ~1010px and at 1024px it is ~754px, so 900 puts the cutoff
 * in the gap between those two rather than a few pixels from one of them. An
 * earlier 1000 sat close enough to the 1280 case that a slightly wider Explorer
 * would have silently switched the connector off there. */
const CONNECTOR_MIN_WIDTH_PX = 900;

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
 * experience (like whoami.md's), not the generic markdown renderer for the
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
  const [containerWidth, setContainerWidth] = useState(0);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  /**
   * Phase 9E: the one piece of shared state the evidence layer needs — the same
   * shape `CortexaExecutionFlow` uses for its decision↔evidence link. Local on
   * purpose: it is interaction state for one file's view, meaningless to the
   * rest of the workspace and therefore not the store's business.
   */
  // Seeded with the first claim, and it never returns to null: one connector is
  // always on screen, so the relationship between the two panes is visible
  // before the visitor touches anything. Hovering moves the line; leaving
  // returns it here rather than clearing it.
  const [activeClaimId, setActiveClaimId] = useState<string>(CLAIMS[0].id);
  // Anchor elements are written by ref callbacks and read during render. They
  // deliberately live in refs with no accompanying state: the anchors attach on
  // mount, long before any hover can happen, and the render that *reads* them
  // is always triggered by `activeClaimId` changing. An earlier version bumped
  // a counter from inside the ref callbacks to force that read — which, since
  // inline ref closures are recreated every render, re-entered the same
  // callbacks and looped until React threw "maximum update depth exceeded".
  const claimAnchorsRef = useRef(new Map<string, HTMLElement | null>());
  const railAnchorsRef = useRef(new Map<string, HTMLElement | null>());

  /**
   * The five claim sentences, read out of hire_me.md's own content rather than
   * copied into the evidence layer. `parseTerminalContent` is the parser the
   * left pane already uses, and `kind === 'bullet'` matches exactly the Recent
   * Highlights lines — so the rail and the report can never disagree about what
   * was claimed, and editing HIRE_ME_REPORT updates both sides at once.
   */
  const claimLabels = useMemo(() => {
    const bullets = parseTerminalContent(file.content).filter((line) => line.kind === 'bullet');
    return new Map(
      CLAIMS.map((claim) => [
        claim.id,
        (bullets[claim.bulletIndex]?.text ?? '').replace(/^•\s*/, '').trim(),
      ]),
    );
  }, [file.content]);
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
  // Phase 9E: EVIDENCE is what this pane opens on — the resume is one tab away,
  // not removed. See RightTab's own comment for why the old pair is gone.
  const [tab, setTab] = useState<RightTab>('EVIDENCE');
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [viewDirty, setViewDirty] = useState(false);
  const webglSupported = WEBGL_SUPPORTED;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(width > 0 && width < STACK_BREAKPOINT_PX);
      setContainerWidth(width);
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

  // Spec §3.4 / §9.4 preserved through the tab rename: the clamped orbit is
  // unlocked by opening the scene controls, and closing them (or leaving
  // DOCUMENT entirely) returns the stage to its hero framing, so an
  // inspect-state camera can never be carried back into the resting view.
  const handleTabChange = (next: RightTab) => {
    setTab(next);
    if (next !== 'DOCUMENT') {
      setShowSceneControls(false);
      sceneRef.current?.setState('staged');
    }
  };

  const handleToggleSceneControls = () => {
    setShowSceneControls((prev) => {
      const next = !prev;
      sceneRef.current?.setState(next ? 'inspect' : 'staged');
      return next;
    });
  };

  const registerClaimAnchor = useCallback((bulletIndex: number, el: HTMLButtonElement | null) => {
    const claim = CLAIM_BY_BULLET_INDEX.get(bulletIndex);
    if (!claim) return;
    // Never clear on detach: React calls an inline ref with null before
    // re-attaching it on the next commit, and dropping the entry there would
    // blank the connector's endpoint for a frame on every unrelated render.
    if (el) claimAnchorsRef.current.set(claim.id, el);
  }, []);

  const registerRailAnchor = useCallback((claimId: string, el: HTMLElement | null) => {
    if (el) railAnchorsRef.current.set(claimId, el);
  }, []);

  const claimBulletIndexes = useMemo(() => CLAIMS.map((c) => c.bulletIndex), []);
  const activeClaim = CLAIMS.find((c) => c.id === activeClaimId) ?? CLAIMS[0];
  const activeBulletIndex = activeClaim.bulletIndex;

  /** Leaving a claim falls back to the default rather than clearing — see the
   * `activeClaimId` declaration for why the pane always keeps one line. */
  const handleClaimHover = useCallback((bulletIndex: number | null) => {
    if (bulletIndex == null) return setActiveClaimId(CLAIMS[0].id);
    setActiveClaimId(CLAIM_BY_BULLET_INDEX.get(bulletIndex)?.id ?? CLAIMS[0].id);
  }, []);

  const handleRailHover = useCallback((claimId: string | null) => {
    setActiveClaimId(claimId ?? CLAIMS[0].id);
  }, []);

  // Stable across renders (the maps are refs), so the connector's measurement
  // effect is not re-run just because a different claim became active.
  const getAnchors = useCallback(
    (claimId: string) => ({
      from: claimAnchorsRef.current.get(claimId) ?? null,
      to: railAnchorsRef.current.get(claimId) ?? null,
    }),
    [],
  );

  const claimColorFor = useCallback(
    (bulletIndex: number) => CLAIM_BY_BULLET_INDEX.get(bulletIndex)?.color ?? '#569cd6',
    [],
  );

  const claimLabelFor = useCallback(
    (bulletIndex: number) => {
      const claim = CLAIM_BY_BULLET_INDEX.get(bulletIndex);
      const label = claim ? claimLabels.get(claim.id) ?? '' : '';
      const count = claim?.references.length ?? 0;
      return `${label} — ${count} supporting ${count === 1 ? 'reference' : 'references'}`;
    },
    [claimLabels],
  );

  // The connector is a desktop enhancement: it needs both panes side by side
  // and enough width for the curve to read. The highlight link works at every
  // size without it, so nothing is lost when this is false.
  const connectorEnabled =
    !isNarrow && tab === 'EVIDENCE' && containerWidth >= CONNECTOR_MIN_WIDTH_PX;

  return (
    <div ref={containerRef} className={cn('relative flex h-full w-full min-h-0 bg-[#1e1e1e]', isNarrow && 'flex-col')}>
      <div
        ref={leftPaneRef}
        style={isNarrow ? undefined : { width: `${ratio * 100}%` }}
        className={cn('min-w-0 min-h-0 border-[#333333]', isNarrow ? 'w-full h-1/2 border-b' : 'shrink-0 border-r')}
      >
        <HireMeDocumentView
          file={file}
          onRevealComplete={handleRevealComplete}
          claims={{
            bulletIndexes: claimBulletIndexes,
            activeBulletIndex,
            onActiveChange: handleClaimHover,
            labelFor: claimLabelFor,
            colorFor: claimColorFor,
            registerAnchor: registerClaimAnchor,
          }}
        />
      </div>

      {!isNarrow && <ResizeHandle direction="horizontal" onResize={handleResize} />}

      <div
        ref={rightPaneRef}
        className={cn('flex flex-col min-w-0 min-h-0', isNarrow ? 'w-full h-1/2' : 'flex-1')}
      >
        {/* Phase 9E: one quiet tab row in the workspace's own grammar — the
            editor's rest/active text colours and a hairline bottom border,
            not the old uppercase/letter-spaced/indigo-underline treatment that
            made this pane read as a second application's chrome. The separate
            toolbar band that used to sit beneath it is gone entirely; its
            actions were rehomed, not removed (see below and EvidenceRail). */}
        <div className="flex shrink-0 items-center gap-5 border-b border-[#333333] bg-[#252526] px-4">
          {RIGHT_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              aria-selected={t === tab}
              role="tab"
              className={cn(
                'relative py-2 font-mono text-[11px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#569cd6]',
                t === tab ? 'text-white' : 'text-[#858585] hover:text-[#cccccc]',
              )}
            >
              {t}
              {t === tab && <span className="absolute inset-x-0 -bottom-px h-px bg-[#569cd6]" />}
            </button>
          ))}
        </div>

        {tab === 'EVIDENCE' ? (
          <EvidenceRail
            claimLabels={claimLabels}
            activeClaimId={activeClaimId}
            onActiveClaimChange={handleRailHover}
            registerAnchor={registerRailAnchor}
            onDownloadPdf={handleDownloadPdf}
            downloadLabel={`Download ${resumeVariant.downloadFilename}`}
          />
        ) : (
          <>
            {/* The build status line the old toolbar carried, kept because it
                reports real work (fetch + rasterize), now sitting on the one
                row this view needs rather than in a band of its own. */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#333333] bg-[#252526] px-3 py-1.5">
              <AnimatePresence mode="wait">
                {phase !== 'idle' && (
                  <motion.span
                    key={phase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mr-auto shrink-0 font-mono text-[11px] text-[#858585]"
                  >
                    {PHASE_LABEL[phase]}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="ml-auto flex items-center gap-1.5">
                <StageAction onClick={runBuildPipeline} icon={<RefreshCw size={12} />} label="Refresh" />
                {/* Sprint 18 (spec §9.5 / §12.1): disabled until the view is
                    actually dirty. A permanently live reset button advertises
                    that the thing gets broken. */}
                <StageAction
                  onClick={handleResetView}
                  icon={<RotateCcw size={12} />}
                  label="Reset"
                  disabled={!viewDirty}
                />
                {webglSupported && (
                  <StageAction
                    onClick={handleToggleSceneControls}
                    label="3D controls"
                    expanded={showSceneControls}
                  />
                )}
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
                  {showSceneControls && <SceneControlsPanel scene={sceneRef} />}
                </>
              ) : (
                <StageFallback canvas={canvas} />
              )}
            </ResumeStage>
          </>
        )}
      </div>

      {/* Rendered last so it paints above both panes; it is inert
          (aria-hidden + pointer-events-none). Draws every claim's line at a
          low resting opacity and brightens the active one, so the set shows
          the shape of the whole relationship while still answering "which one
          am I looking at?". */}
      <EvidenceConnector
        containerRef={containerRef}
        leftPaneRef={leftPaneRef}
        rightPaneRef={rightPaneRef}
        getAnchors={getAnchors}
        activeClaimId={activeClaimId}
        enabled={connectorEnabled}
      />
    </div>
  );
}

/**
 * Phase 9E: replaces `ToolbarButton`. Same three actions, no longer styled as
 * an application toolbar — a text-weight control on the stage's own status
 * row, in the workspace's grey/white register. The old `primary` variant is
 * gone with the filled indigo CTA it existed for: Download PDF now lives in
 * the EVIDENCE pane's pinned footer, where the visitor actually is.
 *
 * `expanded` is passed only by the 3D controls toggle, which is a disclosure
 * rather than a command and therefore needs `aria-expanded`.
 */
function StageAction({
  onClick,
  icon,
  label,
  disabled,
  expanded,
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  disabled?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className={cn(
        'flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] outline-none transition-colors hover:bg-[#2d2d2d] focus-visible:ring-1 focus-visible:ring-[#569cd6] disabled:cursor-not-allowed disabled:opacity-40',
        expanded ? 'text-white' : 'text-[#cccccc]',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
