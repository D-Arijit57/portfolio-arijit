import React, { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../../store/useStore';
import { extractFencedBlock } from '../../lib/extractFencedBlock';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import type { GitHubActivityEntry } from '../../types/github';

interface RecentActivityLogProps {
  /** Defaults to the generated GitHub provider's activity file — override only for reuse against a different source. */
  sourceFileId?: string;
}

const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;
const TERMINAL_S = 0.4;
const PAUSE_AFTER_TERMINAL_S = 0.2;
const NODE_S = 0.18;
const CONNECTOR_S = 0.2;
const TEXT_FADE_S = 0.15;
// When node[i] finishes, node[i+1] doesn't start until the connector
// between them has grown — this is the "unlocked one at a time" cadence
// the spec asks for, not every commit fading in independently.
const STEP_S = NODE_S + CONNECTOR_S;
const BASE_DELAY_S = TERMINAL_S + PAUSE_AFTER_TERMINAL_S;
const REVEAL_SESSION_KEY = 'recent-activity-timeline';

/**
 * Dense `git log --oneline`-style reader for real recent GitHub activity —
 * reuses the same already-hydrated `github:activity` content the Explorer
 * and Editor already read (VFS_DESIGN.md §11.5), no separate fetch. `sha`
 * is present when the backend sourced this from real commit search
 * (server/providers/github/githubApiClient.ts's searchRecentCommits) and
 * absent for the Events-API-derived fallback — rendered conditionally so
 * neither data source ever needs a fake placeholder for the other's field.
 *
 * Animated as a connected commit timeline (git log --graph / VS Code
 * Timeline / GitKraken graph pane are the actual references — all vertical
 * columns of dots joined by a line, not a single horizontal strip). Every
 * `animate` target below is a concrete, fully-specified object for both
 * the "waiting" and "revealed" states — never an empty `{}` — so Motion
 * always has an unambiguous value to hold at or move to; that ambiguity
 * (animate to "nothing" while conditions flip) was the suspected cause of
 * the timeline getting stuck after repeated dev-mode hot-reloads.
 *
 * Triggered once by useInViewOnce, never on mount. Plays at most once per
 * session — hasAnimated/markAnimated (src/lib/typingReveal.ts), the same
 * gate AboutSection's typing animation uses — so navigating away from
 * whoami.md and back shows the finished timeline immediately instead of
 * replaying it, while an actual page reload starts fresh. Reduced motion
 * skips straight to the finished state.
 *
 * The `ref` useInViewOnce needs is attached to this outer container
 * unconditionally — including in the "no entries yet" branch below — on
 * purpose. `entries` depends on `file`, which the GitHub provider
 * hydrates into the store asynchronously; if the ref were only attached
 * once entries existed, a render that happened before hydration would
 * mount a ref-less element, and useInViewOnce's effect (which only runs
 * once, on mount) would find `ref.current` null and never get another
 * chance to attach an observer.
 */
export function RecentActivityLog({ sourceFileId = 'github:activity' }: RecentActivityLogProps) {
  const file = useStore((state) => state.workspaceFiles.find((f) => f.id === sourceFileId));
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const reduceMotion = prefersReducedMotion();
  // Read once per mount, same lazy-ref pattern AboutSection uses — the
  // effect below marks the session key the moment inView flips true, and
  // that must not retroactively flip `alreadyPlayed` mid-animation.
  const alreadyPlayed = useRef(hasAnimated(REVEAL_SESSION_KEY)).current;

  useEffect(() => {
    if (inView) markAnimated(REVEAL_SESSION_KEY);
  }, [inView]);

  const entries = useMemo<GitHubActivityEntry[] | null>(() => {
    if (!file) return null;
    const raw = extractFencedBlock(file.content, 'github-recent-activity');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GitHubActivityEntry[];
    } catch {
      return null;
    }
  }, [file]);

  const skip = reduceMotion || alreadyPlayed;
  const revealed = skip || inView;

  return (
    <motion.div
      ref={ref}
      className="my-4 rounded-md border border-[#333333] bg-[#1e1e1e] font-mono text-[12px]"
      initial={skip ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 12 }}
      transition={{ duration: skip ? 0 : TERMINAL_S, ease: EASE_OUT_CUBIC }}
    >
      {!entries || entries.length === 0 ? (
        <div className="p-3 text-[13px] italic text-[#858585]">No recent public activity.</div>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-[#333333] px-3 py-1 text-[#858585]">
            <span className="h-2 w-2 rounded-full bg-[#f14c4c]" />
            <span className="h-2 w-2 rounded-full bg-[#e5e510]" />
            <span className="h-2 w-2 rounded-full bg-[#3fb950]" />
            <span className="ml-2 text-[10px]">git log --oneline</span>
          </div>
          <div className="px-3 py-2">
            {entries.map((entry, i) => {
              const nodeDelay = skip ? 0 : BASE_DELAY_S + i * STEP_S;
              const isLast = i === entries.length - 1;

              return (
                <div key={i} className="flex gap-2" title={entry.repoName}>
                  <div className="relative flex w-2 shrink-0 flex-col items-center">
                    <motion.span
                      className="h-2 w-2 shrink-0 rounded-full bg-[#3fb950]"
                      initial={skip ? false : { opacity: 0, scale: 0.85 }}
                      animate={{ opacity: revealed ? 1 : 0, scale: revealed ? [0.85, 1.15, 1] : 0.85 }}
                      transition={{ duration: skip ? 0 : NODE_S, delay: nodeDelay, ease: 'easeOut' }}
                    />
                    {!isLast && (
                      <motion.span
                        className="w-px flex-1 bg-[#3c3c3c]"
                        style={{ transformOrigin: 'top' }}
                        initial={skip ? false : { scaleY: 0 }}
                        animate={{ scaleY: revealed ? 1 : 0 }}
                        transition={{
                          duration: skip ? 0 : CONNECTOR_S,
                          delay: nodeDelay + NODE_S,
                          ease: 'easeOut',
                        }}
                      />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 items-baseline gap-2 pb-2 leading-tight">
                    <motion.span
                      className="min-w-0 flex-1 truncate"
                      initial={skip ? false : { opacity: 0 }}
                      animate={{ opacity: revealed ? 1 : 0 }}
                      transition={{ duration: skip ? 0 : TEXT_FADE_S, delay: nodeDelay + NODE_S * 0.5 }}
                    >
                      {entry.sha && <span className="mr-2 text-[#4ec9b0]">{entry.sha}</span>}
                      <span className="text-[#cccccc]">{entry.summary}</span>
                    </motion.span>
                    <motion.span
                      className="shrink-0 text-[10px] text-[#858585]"
                      initial={skip ? false : { opacity: 0 }}
                      animate={{ opacity: revealed ? 1 : 0 }}
                      transition={{ duration: skip ? 0 : TEXT_FADE_S, delay: nodeDelay + NODE_S }}
                    >
                      {formatRelativeTime(entry.createdAt)}
                    </motion.span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
