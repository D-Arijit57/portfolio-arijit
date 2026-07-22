import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, RotateCcw, Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { ResizeHandle } from '../shared/ResizeHandle';
import { TypingReveal } from '../shared/TypingReveal';
import { ResumeOverview } from './ResumeOverview';
import { ResumeRenderer } from './renderer/ResumeRenderer';
import { ResumeScene, type ResumeSceneHandle } from './ResumeScene';
import { saveResumePdf } from './export/fetchResumePdf';
import { renderPdfPageToCanvas } from './preview/pdfTexture';
import { loadResumePdfDocument, assertIntact, type ResumePdfDocument } from './document/resumePdfDocument';
// Sprint 11: pre-Sprint-11 HTML/html2canvas/jsPDF pipeline — kept
// deliberately, not dead code. It's the fallback used only if the
// canonical LaTeX PDF can't be fetched (backend down, Tectonic missing in
// whatever environment this deploys to — a real, currently-unresolved risk
// since no LaTeX engine is guaranteed present in production).
import { captureResumeCanvas, downloadResumePdf } from './export/resumeCapture';
import { getDefaultResumeVariant } from './variants/resumeRegistry';
import type { VirtualFile } from '../../types';

// Sprint 10F.1: lowered from 640 so the continuous ratio-based resize (which
// already shrinks the 3D preview's rendered scale as the container narrows,
// since ResumeScene's own ResizeObserver reframes the camera) gets more room
// to "reduce preview scale" before the layout collapses to stacked, per the
// brief's "avoid aggressive stacking" requirement.
const STACK_BREAKPOINT_PX = 480;
const MIN_PANEL_PX = 240;

const COMPILING_MS = 550;
const RENDERING_MS = 550;
const READY_HOLD_MS = 450;

type BuildPhase = 'idle' | 'compiling' | 'rendering' | 'ready';

const PHASE_LABEL: Record<Exclude<BuildPhase, 'idle'>, string> = {
  compiling: 'Compiling updated preview...',
  rendering: 'Rendering resume...',
  ready: 'Preview ready.',
};

/**
 * Sprint 10F.1: RESUME.md's dedicated two-panel view — a custom editor
 * experience (like profile.md's), not the generic markdown renderer. LEFT is
 * ResumeOverview, a condensed executive summary. RIGHT is the Three.js
 * preview.
 *
 * Sprint 11: the canonical rendering pipeline is now
 * server/services/resume/'s LaTeX compiler — both the preview texture
 * (preview/pdfTexture.ts rendering the fetched PDF's first page) and the
 * Download button (saving those exact bytes) are derived from the one PDF
 * the backend produces for the selected variant (variants/resumeRegistry.ts),
 * never two separate implementations. The pre-Sprint-11 HTML/html2canvas/
 * jsPDF path (ResumeRenderer, resumeSpec, export/resumeCapture.ts) remains,
 * deliberately, as a fallback for if the backend or its LaTeX engine is
 * unavailable — not dead code left behind.
 *
 * Sprint 11.4 (Binary Resource Ownership): state holds a `ResumePdfDocument`
 * (document/resumePdfDocument.ts), not a bare `ArrayBuffer`. Its `.bytes` is
 * the untouched original fetch result and is never passed to pdf.js
 * directly (pdf.js transfers/detaches whatever ArrayBuffer it's given,
 * which is exactly what produced Sprint 11.3's 0-byte download —
 * `renderPdfPageToCanvas` now clones internally before touching pdf.js, so
 * this component doesn't need to remember to). The Download path always
 * reads `resumePdf.bytes` — a buffer no other consumer has ever seen.
 */
export function ResumeWorkspace({ file }: { file: VirtualFile }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captureNodeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ResumeSceneHandle>(null);
  // Sprint 10F.5: resolved once per mount — the one place this workspace
  // decides which resume variant it's showing. Swapping the default in
  // variants/resumeRegistry.ts changes what renders here with no other
  // change needed.
  const resumeVariant = getDefaultResumeVariant();

  const [isNarrow, setIsNarrow] = useState(false);
  // Sprint 10F.1: 45/55 (was 48/52) — the preview is the hero, per the brief.
  const [ratio, setRatio] = useState(0.45);
  const [phase, setPhase] = useState<BuildPhase>('idle');
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [version, setVersion] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  // Sprint 11.4: the canonical PDF as an explicit document (bytes +
  // variant + hash + fetch time), once loaded — Download saves
  // `resumePdf.bytes` directly (no regeneration) when present and current.
  // Null while unfetched, or when the fallback path below had to be used
  // instead.
  const [resumePdf, setResumePdf] = useState<ResumePdfDocument | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

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
    setPhase('compiling');
    window.setTimeout(() => {
      setPhase('rendering');
      window.setTimeout(async () => {
        // Sprint 11: canonical path — fetch the LaTeX-compiled PDF from the
        // backend and render its first page for the Three.js texture. Both
        // this preview and the Download button end up consuming the exact
        // same PDF bytes, produced by exactly one pipeline
        // (server/services/resume/).
        //
        // Sprint 11.4: `doc.bytes` is never passed to renderPdfPageToCanvas
        // directly as "the" reference to keep around — it's passed once,
        // and that function now clones before it ever reaches pdf.js, so
        // `doc.bytes` remains intact for setResumePdf below regardless.
        try {
          const doc = await loadResumePdfDocument(resumeVariant.id, 'Preview');
          const rasterized = await renderPdfPageToCanvas(doc.bytes);
          setResumePdf(doc);
          setUsedFallback(false);
          setCanvas(rasterized);
          setVersion((v) => v + 1);
        } catch (err) {
          console.warn('Canonical LaTeX resume PDF unavailable, falling back to HTML rendering:', err);
          const node = captureNodeRef.current;
          if (node) {
            const rasterized = await captureResumeCanvas(node);
            setResumePdf(null);
            setUsedFallback(true);
            setCanvas(rasterized);
            setVersion((v) => v + 1);
          }
        }
        setPhase('ready');
        window.setTimeout(() => setPhase('idle'), READY_HOLD_MS);
      }, RENDERING_MS);
    }, COMPILING_MS);
  }, [resumeVariant.id]);

  const handleRevealComplete = useCallback(() => {
    runBuildPipeline();
  }, [runBuildPipeline]);

  const handleDownloadPdf = async () => {
    console.log('[Download] Button clicked');
    console.log('[Download] Selected variant', {
      id: resumeVariant.id,
      displayName: resumeVariant.displayName,
      downloadFilename: resumeVariant.downloadFilename,
    });
    setIsDownloading(true);
    try {
      // Sprint 11: the file downloaded here must already exist — no
      // html2canvas, no jsPDF reconstruction. If the build pipeline above
      // already loaded the canonical PDF for THIS variant, save those
      // exact bytes.
      //
      // Sprint 11.4: the `resumePdf.variantId` check is the ownership
      // model made concrete for a future multi-variant switch — a document
      // loaded for a different variant must never be reused here, even
      // though only one variant exists today. assertIntact() is the
      // regression guard for the exact bug this sprint fixes: if any
      // future change ever again lets a detached buffer reach this point,
      // this throws instead of silently saving a 0-byte file.
      const usingCached = Boolean(resumePdf && !usedFallback && resumePdf.variantId === resumeVariant.id);
      console.log('[Download] Using cached PDF?', usingCached);
      if (usingCached && resumePdf) {
        assertIntact(resumePdf);
        console.log('[Download] Blob SHA-256', { sha256: resumePdf.sha256 });
        saveResumePdf(resumePdf.bytes, resumeVariant.downloadFilename);
        return;
      }
      try {
        const doc = await loadResumePdfDocument(resumeVariant.id, 'Download');
        assertIntact(doc);
        console.log('[Download] Blob SHA-256', { sha256: doc.sha256 });
        saveResumePdf(doc.bytes, resumeVariant.downloadFilename);
        setResumePdf(doc);
        setUsedFallback(false);
        return;
      } catch (err) {
        console.warn('[Download] Canonical LaTeX resume PDF unavailable, falling back to HTML rendering:', err);
      }
      // Fallback path — only reached if the canonical PDF couldn't be
      // fetched at all (backend down, LaTeX engine missing).
      const node = captureNodeRef.current;
      const rasterized = canvas ?? (node ? await captureResumeCanvas(node) : null);
      if (rasterized) downloadResumePdf(rasterized, resumeVariant.downloadFilename);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('flex h-full w-full min-h-0 bg-[#1e1e1e]', isNarrow && 'flex-col')}>
      {/* Off-screen capture target — always mounted so a refresh never races a missing ref. */}
      <div className="fixed -left-[10000px] top-0 pointer-events-none" aria-hidden="true">
        <ResumeRenderer ref={captureNodeRef} data={resumeVariant.data} />
      </div>

      <div
        style={isNarrow ? undefined : { width: `${ratio * 100}%` }}
        className={cn('min-w-0 min-h-0 border-[#333333]', isNarrow ? 'w-full h-1/2 border-b' : 'shrink-0 border-r')}
      >
        <TypingReveal fileId={file.id} contentLength={file.content.length} onRevealComplete={handleRevealComplete}>
          <ResumeOverview onDownloadPdf={handleDownloadPdf} isDownloading={isDownloading} />
        </TypingReveal>
      </div>

      {!isNarrow && <ResizeHandle direction="horizontal" onResize={handleResize} />}

      <div className={cn('flex flex-col min-w-0 min-h-0', isNarrow ? 'w-full h-1/2' : 'flex-1')}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 border-b border-[#333333] bg-[#252526] shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarButton onClick={runBuildPipeline} icon={<RefreshCw size={13} />} label="Refresh Preview" />
            <ToolbarButton onClick={() => sceneRef.current?.resetView()} icon={<RotateCcw size={13} />} label="Reset View" />
            <ToolbarButton onClick={handleDownloadPdf} icon={<Download size={13} />} label={isDownloading ? 'Preparing...' : 'Download PDF'} disabled={isDownloading} />
          </div>
          <AnimatePresence mode="wait">
            {phase !== 'idle' && (
              <motion.span
                key={phase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] text-[#858585] font-mono shrink-0"
              >
                {PHASE_LABEL[phase]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-h-0 relative">
          <ResumeScene ref={sceneRef} canvas={canvas} version={version} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  label,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#cccccc] bg-[#2d2d2d] hover:bg-[#3c3c3c] disabled:opacity-50 disabled:cursor-not-allowed border border-[#3c3c3c] rounded-sm transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
