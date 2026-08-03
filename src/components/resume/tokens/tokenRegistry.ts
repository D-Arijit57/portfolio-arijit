/**
 * Sprint 17 (RESUME.md spec §3): the emphasis system's single source of
 * truth. Replaces the `**bold**` markers that used to live inline in the
 * variant data (components/resume/data/*.ts) and were parsed by
 * content/resume.ts's now-deleted renderInlineMarkdown().
 *
 * The conceit: a resume is a source file, so emphasis reads as *syntax
 * highlighting* — a term's color comes from what kind of thing it is, not
 * from an author deciding to bold it. That means emphasis is declarative
 * and consistent (every mention of "RAG pipeline" is colored identically,
 * everywhere), and tokens can carry an `href` to become workspace
 * navigation targets.
 *
 * Registry discipline (spec §4.1): weight stays 400 — emphasis is carried
 * entirely by hue. Adding `font-semibold` on top makes it read as a
 * marked-up Word document rather than a source file. Keep this under ~20
 * terms per section: if everything lights up, nothing does.
 */

export type TokenRole = 'lang' | 'concept' | 'metric';

export interface TokenMeta {
  role: TokenRole;
  /** Optional workspace target — makes the token a navigation affordance, not just color. */
  href?: string;
}

/**
 * Term -> role + optional target.
 *
 * Roles:
 *   lang    — languages, tools, APIs, concrete named technology
 *   concept — architectures, methodologies, practices
 *   metric  — numbers, deltas, throughput
 *
 * Every key must appear verbatim in the variant data's prose, since
 * matching is exact-substring (see Highlighted.tsx). The reference art
 * direction is roughly 75% lang / 25% concept, with metrics used sparingly.
 */
export const TOKENS: Record<string, TokenMeta> = {
  // --- summary ---
  'C++': { role: 'lang', href: '#skills/cpp' },
  OOP: { role: 'concept' },
  'full-stack': { role: 'concept' },
  'AI-powered applications': { role: 'concept' },
  'LLM primitives': { role: 'concept', href: '#skills/llm' },
  'Transformer architecture': { role: 'concept' },
  'RAG pipelines': { role: 'concept', href: '#projects/cortexa' },
  'RAG pipeline': { role: 'concept', href: '#projects/cortexa' },
  prompting: { role: 'lang' },
  'evaluation mindset': { role: 'concept' },
  // Sorted after 'LLM primitives' by the longest-first rule below, so the
  // two never collide.
  LLMs: { role: 'lang' },

  // --- experience ---
  'OpenAI API': { role: 'lang' },
  LangChain: { role: 'lang' },
  'Node.js/Express': { role: 'lang' },
  '2 hrs/week': { role: 'metric' },
  '5+ production defects': { role: 'metric' },
  '35%': { role: 'metric' },
  '200+': { role: 'metric' },

  // --- projects ---
  'API integrations': { role: 'concept' },
  'Python-based': { role: 'lang' },
  'AWS EC2': { role: 'lang' },
  '4 languages': { role: 'metric' },
  '92% accuracy': { role: 'metric' },
  '95% of sensitive data': { role: 'metric' },
};

/**
 * One alternation, longest-key-first — the ordering is load-bearing, not
 * cosmetic: without it "RAG pipeline" matches first and leaves a stray "s"
 * behind, so "RAG pipelines" would never color as one token. Regex
 * metacharacters in keys ("C++", "35%", "Node.js/Express") are escaped.
 *
 * Built once at module load rather than per render — the registry is
 * static.
 */
export const TOKEN_PATTERN = new RegExp(
  `(${Object.keys(TOKENS)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'g'
);
