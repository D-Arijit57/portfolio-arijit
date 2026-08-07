import React, { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { CortexaTerminalPanel } from './CortexaTerminalPanel';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { useParagraphTypewriter } from '../../hooks/useParagraphTypewriter';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';

const TEXT = '#E5E7EB';

const SESSION_KEY = 'cortexa-explore-terminal';

const INTERACTIVE_CLASS =
  'bg-transparent border-0 p-0 m-0 font-mono text-[inherit] leading-[inherit] transition-colors hover:text-[#38BDF8] hover:underline underline-offset-4 cursor-pointer';

type TreeEntry =
  | { kind: 'root'; line: string }
  | { kind: 'internal'; prefix: string; label: string; line: string; openFileId: string }
  | { kind: 'external'; prefix: string; label: string; line: string; href: string };

// Repo/demo URLs match the only ones that exist for this project (the
// currently-unrendered "Continue Exploring" list in CORTEXA_DOC_MARKDOWN,
// src/content/workspaceSeed.ts) — reused verbatim, not invented.
const TREE_ENTRIES: TreeEntry[] = [
  { kind: 'root', line: '.' },
  { kind: 'internal', prefix: '├── ', label: 'architecture', line: '├── architecture', openFileId: 'cortexa_arch' },
  { kind: 'external', prefix: '├── ', label: 'repository', line: '├── repository', href: 'https://github.com/D-Arijit57' },
  { kind: 'external', prefix: '└── ', label: 'live-demo', line: '└── live-demo', href: 'https://cortexa-eight.vercel.app/' },
];

const TREE_BLOCKS: string[][] = TREE_ENTRIES.map((entry) => [entry.line]);

/**
 * Cortexa Redesign — the page's final section, replacing the removed
 * Architecture section: a single compact `$ tree .` terminal listing where
 * to go next (architecture / repository / live-demo), typed in one entry
 * at a time and each becoming a selectable in-terminal link the moment its
 * own line finishes typing. Reuses every mechanism already established on
 * this page — `CortexaTerminalPanel` (the shared shell), `useParagraphTypewriter`
 * (the same typing engine problem.sh/cortexa.sh/run-cortexa all use), and
 * `useInViewOnce`'s scroll-triggered reveal (the same pattern
 * RecentActivityLog.tsx uses elsewhere in the workspace) — no new
 * animation/typing engine. Rendered as a sibling appended after
 * `CortexaExecutionFlow`, which stays untouched.
 */
export function CortexaExploreTerminal() {
  const openFile = useStore((state) => state.openFile);
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const reduceMotion = prefersReducedMotion();
  const alreadyPlayed = useRef(hasAnimated(SESSION_KEY)).current;

  useEffect(() => {
    if (inView) markAnimated(SESSION_KEY);
  }, [inView]);

  const skip = reduceMotion || alreadyPlayed;
  const active = skip || inView;
  const { revealedBlocks, isDone } = useParagraphTypewriter(TREE_BLOCKS, { active, skip });

  return (
    <div className="mt-16 w-full">
      <CortexaTerminalPanel ref={ref} fileName="tree ." bodyClassName="min-h-[140px]">
        {revealedBlocks.map((block, i) => {
          const text = block[0] ?? '';
          const entry = TREE_ENTRIES[i];
          const isComplete = text === entry.line;
          const showCursor = i === revealedBlocks.length - 1 && active && !skip && !isDone;

          return (
            <p key={entry.line} style={{ color: TEXT }}>
              {entry.kind !== 'root' && isComplete ? (
                <>
                  <span>{entry.prefix}</span>
                  {entry.kind === 'internal' ? (
                    <button type="button" onClick={() => openFile(entry.openFileId)} className={INTERACTIVE_CLASS} style={{ color: TEXT }}>
                      {entry.label}
                    </button>
                  ) : (
                    <a
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer"
                      className={INTERACTIVE_CLASS}
                      style={{ color: TEXT }}
                    >
                      {entry.label}
                    </a>
                  )}
                </>
              ) : (
                text
              )}
              {showCursor && <span className="typing-reveal-cursor ml-0.5">█</span>}
            </p>
          );
        })}
      </CortexaTerminalPanel>
    </div>
  );
}
