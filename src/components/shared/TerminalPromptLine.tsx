import React from 'react';
import { motion } from 'motion/react';
import { prefersReducedMotion } from '../../lib/typingReveal';

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";
const BLUE = '#569cd6';

export interface PromptToken {
  text: string;
  color?: string;
  opacity?: number;
}

/**
 * whoami.md's section-header replacement for markdown `##` headings — a
 * `$ command` line, sized to match the page's other prompt lines (e.g.
 * ContributionsTerminal's `arijit@github:~$ ./contributions.sh`) rather
 * than reading as a big standalone title. Still syntax-highlighted per
 * token (see AboutSection.tsx's `cat about.txt` and AboutActivityRow.tsx's
 * `./recent-activity.sh` calls) rather than one flat muted color, plus a
 * left accent bar in the same VS Code blue as `$`. Both the text and the
 * accent animate in on mount (fade + rise, accent trails slightly behind)
 * — never on a scroll trigger, so there's no IntersectionObserver to wire
 * up for what's meant to be a fast, subtle entrance.
 */
export function TerminalPromptLine({ tokens, className = '' }: { tokens: PromptToken[]; className?: string }) {
  const reduceMotion = prefersReducedMotion();
  const textDuration = reduceMotion ? 0 : 0.25;

  return (
    <motion.div
      className={`mt-6 mb-2 flex items-center gap-2 ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: textDuration, ease: 'easeOut' }}
    >
      <motion.span
        className="block w-[2px] self-stretch rounded-full"
        style={{ backgroundColor: BLUE, transformOrigin: 'top' }}
        initial={reduceMotion ? false : { scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : textDuration, ease: 'easeOut' }}
      />
      <div className="text-[12px] font-medium" style={{ fontFamily: ROBOTO_MONO }}>
        <span style={{ color: BLUE }}>$</span>{' '}
        {tokens.map((token, i) => (
          <span key={i} style={{ color: token.color ?? '#ffffff', opacity: token.opacity ?? 1 }}>
            {token.text}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
