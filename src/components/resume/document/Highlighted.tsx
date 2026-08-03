import React from 'react';
import { TOKENS, TOKEN_PATTERN, type TokenRole } from '../tokens/tokenRegistry';

/**
 * Sprint 17 (RESUME.md spec §4.1): the emphasis engine. A single
 * longest-match-first pass over the token registry, replacing every
 * `**bold**` that used to live in the resume prose.
 *
 * Deliberately not a markdown parser and not a generic highlighter: it
 * matches known terms from a curated registry, so emphasis is a property
 * of the vocabulary rather than of the sentence an author happened to
 * write. Every mention of a term colors identically everywhere it appears.
 *
 * Weight is never raised (spec §4.1) — hue carries the emphasis. The
 * underline appears only on hover, so the resting state reads as code
 * rather than as a page full of links.
 */

const ROLE_CLASS: Record<TokenRole, string> = {
  lang: 'text-[var(--tok-lang)]',
  concept: 'text-[var(--tok-concept)]',
  metric: 'text-[var(--tok-metric)]',
};

const BASE_CLASS = 'decoration-current/30 underline-offset-2 transition-colors hover:underline';

export function Highlighted({ text }: { text: string }) {
  // String.split with a capturing group returns the captures interleaved
  // with the surrounding plain text, so one pass yields the full sequence.
  // The pattern's `g` flag is inert here (split doesn't use lastIndex), so
  // sharing the module-level regex across calls is safe.
  return (
    <>
      {text.split(TOKEN_PATTERN).map((part, i) => {
        const token = TOKENS[part];
        if (!token) return <React.Fragment key={i}>{part}</React.Fragment>;

        const className = `${ROLE_CLASS[token.role]} ${BASE_CLASS}`;
        return token.href ? (
          <a key={i} href={token.href} className={`${className} cursor-pointer`}>
            {part}
          </a>
        ) : (
          <span key={i} className={className}>
            {part}
          </span>
        );
      })}
    </>
  );
}
