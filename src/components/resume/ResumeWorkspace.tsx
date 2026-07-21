import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, RotateCcw, Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { ResizeHandle } from '../shared/ResizeHandle';
import { TypingReveal } from '../shared/TypingReveal';
import { ResumeOverview } from './ResumeOverview';
import { ResumeDocument } from './ResumeDocument';
import { ResumeScene, type ResumeSceneHandle } from './ResumeScene';
import { captureResumeCanvas, downloadResumePdf } from './resumeCapture';
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
 * ResumeOverview, a condensed executive summary (not RESUME.md's prose —
 * see EditorRenderer.tsx's note on why this bypasses the generic per-file
 * wrap), wrapped in this file's own TypingReveal instance so completion can
 * be observed directly. RIGHT is the Three.js "compiled" preview, rebuilt
 * from a hidden ResumeDocument snapshot whenever the build pipeline runs (on
 * first reveal, or on a manual "Refresh Preview"). Both panels, plus
 * RESUME.md's raw markdown and the downloaded PDF, all read the one
 * structured source in content/resume.ts.
 */
export function ResumeWorkspace({ file }: { file: VirtualFile }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captureNodeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ResumeSceneHandle>(null);

  const [isNarrow, setIsNarrow] = useState(false);
  // Sprint 10F.1: 45/55 (was 48/52) — the preview is the hero, per the brief.
  const [ratio, setRatio] = useState(0.45);
  const [phase, setPhase] = useState<BuildPhase>('idle');
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [version, setVersion] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

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
        const node = captureNodeRef.current;
        if (node) {
          const rasterized = await captureResumeCanvas(node);
          setCanvas(rasterized);
          setVersion((v) => v + 1);
        }
        setPhase('ready');
        window.setTimeout(() => setPhase('idle'), READY_HOLD_MS);
      }, RENDERING_MS);
    }, COMPILING_MS);
  }, []);

  const handleRevealComplete = useCallback(() => {
    runBuildPipeline();
  }, [runBuildPipeline]);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const node = captureNodeRef.current;
      const rasterized = canvas ?? (node ? await captureResumeCanvas(node) : null);
      if (rasterized) downloadResumePdf(rasterized);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('flex h-full w-full min-h-0 bg-[#1e1e1e]', isNarrow && 'flex-col')}>
      {/* Off-screen capture target — always mounted so a refresh never races a missing ref. */}
      <div className="fixed -left-[10000px] top-0 pointer-events-none" aria-hidden="true">
        <ResumeDocument ref={captureNodeRef} />
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
