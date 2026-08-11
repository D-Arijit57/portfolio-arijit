import React, { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { ProjectTerminalPanel, TEXT } from './ProjectTerminalPanel';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { useParagraphTypewriter } from '../../hooks/useParagraphTypewriter';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import type { LinkCardItem } from '../../documentation/linkCards';
import { resolveLinkTarget } from '../../documentation/resolveLinkTarget';

const INTERACTIVE_CLASS =
  'bg-transparent border-0 p-0 m-0 font-mono text-[inherit] leading-[inherit] transition-colors hover:text-[#569cd6] hover:underline underline-offset-4 cursor-pointer';

type TreeEntry =
  | { kind: 'root'; line: string }
  | { kind: 'internal'; prefix: string; label: string; line: string; fileId: string }
  | { kind: 'external'; prefix: string; label: string; line: string; href: string }
  // A Continue Exploring target that doesn't resolve to a sibling file and
  // isn't an absolute URL — rendered as inert text rather than dropped, the
  // same "still show it, just without navigation" choice LinkFileList makes
  // via resolveLinkTarget's own 'unresolved' kind.
  | { kind: 'unresolved'; prefix: string; label: string; line: string };

function buildTreeEntries(items: LinkCardItem[], basePath: string): TreeEntry[] {
  const entries: TreeEntry[] = [{ kind: 'root', line: '.' }];
  items.forEach((item, index) => {
    const prefix = index === items.length - 1 ? '└── ' : '├── ';
    const line = `${prefix}${item.title}`;
    const target = resolveLinkTarget(item.href, basePath);
    if (target.kind === 'internal') {
      entries.push({ kind: 'internal', prefix, label: item.title, line, fileId: target.fileId });
    } else if (target.kind === 'external') {
      entries.push({ kind: 'external', prefix, label: item.title, line, href: target.href });
    } else {
      entries.push({ kind: 'unresolved', prefix, label: item.title, line });
    }
  });
  return entries;
}

/**
 * The generic form of `CortexaExploreTerminal.tsx`'s `$ tree .` pattern —
 * a compact terminal listing a document's own "Continue Exploring" links,
 * typed in one entry at a time, each becoming a selectable in-terminal link
 * the moment its own line finishes typing.
 *
 * Deliberately a *new* component rather than a refactor of
 * `CortexaExploreTerminal.tsx` in place: that file's `TREE_ENTRIES` are
 * hardcoded to Cortexa's own three destinations, and Phase 2's regression
 * requirement is that Cortexa stay byte-identical after this extraction —
 * safer to leave a working, approved file untouched than to thread a new
 * generic code path through it. This component reuses the *technique*
 * (`ProjectTerminalPanel`, `useParagraphTypewriter`, `useInViewOnce`) without
 * sharing implementation, and is what any future project doc should import
 * going forward.
 *
 * `items`/`basePath` come straight from a document's own parsed "Continue
 * Exploring" list (`documentation/linkCards.ts`'s `LinkCardItem[]`) — no
 * hardcoded file ids. `resolveLinkTarget` (the same function `LinkFileList`
 * already uses for every non-terminal-grammar doc) decides internal vs.
 * external vs. unresolved generically, so this works for any project's real
 * links with zero code changes.
 */
export function ProjectExploreTerminal({
  items,
  basePath,
  onComplete,
}: {
  items: LinkCardItem[];
  basePath: string;
  onComplete?: () => void;
}) {
  const openFile = useStore((state) => state.openFile);
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const reduceMotion = prefersReducedMotion();
  // basePath (e.g. "/projects/Rakshachakra") is already unique per document,
  // so it doubles as this terminal's own session-gating key — no separate
  // key needs threading through from the caller.
  const sessionKey = `project-explore-terminal:${basePath}`;
  const alreadyPlayed = useRef(hasAnimated(sessionKey)).current;

  useEffect(() => {
    if (inView) markAnimated(sessionKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const skip = reduceMotion || alreadyPlayed;
  const active = skip || inView;

  const entries = useRef(buildTreeEntries(items, basePath)).current;
  const blocks = useRef(entries.map((entry) => [entry.line])).current;
  const { revealedBlocks, isDone } = useParagraphTypewriter(blocks, { active, skip, onComplete });

  return (
    <div ref={ref} className="mt-16 w-full">
      <ProjectTerminalPanel fileName="tree ." bodyClassName="min-h-[140px]">
        {revealedBlocks.map((block, i) => {
          const text = block[0] ?? '';
          const entry = entries[i];
          const isComplete = text === entry.line;
          const showCursor = i === revealedBlocks.length - 1 && active && !skip && !isDone;

          return (
            <p key={entry.line} style={{ color: TEXT }}>
              {entry.kind !== 'root' && isComplete ? (
                <>
                  <span>{entry.prefix}</span>
                  {entry.kind === 'internal' && (
                    <button type="button" onClick={() => openFile(entry.fileId)} className={INTERACTIVE_CLASS} style={{ color: TEXT }}>
                      {entry.label}
                    </button>
                  )}
                  {entry.kind === 'external' && (
                    <a href={entry.href} target="_blank" rel="noreferrer" className={INTERACTIVE_CLASS} style={{ color: TEXT }}>
                      {entry.label}
                    </a>
                  )}
                  {entry.kind === 'unresolved' && <span>{entry.label}</span>}
                </>
              ) : (
                text
              )}
              {showCursor && <span className="typing-reveal-cursor ml-0.5">█</span>}
            </p>
          );
        })}
      </ProjectTerminalPanel>
    </div>
  );
}
