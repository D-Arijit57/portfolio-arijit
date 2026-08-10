/**
 * Suspense fallback for the lazy-loaded ResumeWorkspace (Phase 6: the
 * Three.js/pdfjs-dist bundle only downloads once hire_me.md is opened).
 * Deliberately NOT the real TerminalWindowSvg — it needs parsed terminal
 * content/props this fallback has no reason to fake. Instead it echoes
 * that component's own chrome constants (dot colors/positions, radius,
 * centered title, Roboto Mono) closely enough to read as "the same window,
 * still arriving" rather than a generic loading screen. Swapped out
 * instantly once the real chunk mounts — no crossfade, matching this
 * codebase's established instant-swap convention (see EditorArea.tsx).
 */
export function ResumeWorkspaceFallback() {
  return (
    <div className="flex h-full w-full min-h-0 items-center justify-center bg-[#1e1e1e]">
      <div
        className="w-full max-w-[640px] mx-6 overflow-hidden rounded-xl border"
        style={{ backgroundColor: '#111318', borderColor: '#2d2d30' }}
      >
        <div
          className="relative flex h-10 items-center border-b px-[22px]"
          style={{ borderColor: '#2d2d30' }}
        >
          <div className="flex items-center gap-[9px]">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#ff5f56' }} />
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#ffbd2e' }} />
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#27c93f' }} />
          </div>
          <span
            className="absolute inset-x-0 text-center text-[13px]"
            style={{ color: '#cccccc', fontFamily: "'Roboto Mono', ui-monospace, SFMono-Regular, monospace" }}
          >
            Hiring Evaluation
          </span>
        </div>
        <div className="px-7 py-8">
          <span
            className="text-[15px]"
            style={{ color: '#8b949e', fontFamily: "'Roboto Mono', ui-monospace, SFMono-Regular, monospace" }}
          >
            Loading resume workspace...
          </span>
          <span className="typing-reveal-cursor ml-1 text-[15px] text-white">█</span>
        </div>
      </div>
    </div>
  );
}
