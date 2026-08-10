/**
 * Phase 3 (Terminal + Visual Consistency): the shared DNA every terminal-
 * style surface in the workspace draws from — traffic-light chrome, the
 * two established terminal-shell palettes, and the prompt-symbol grammar.
 * This is deliberately small. It does not replace each surface's own
 * component (a "document terminal" and a "dock terminal" still render
 * completely different markup) and it does not chase every hex literal in
 * the app — only the values that were already identical across multiple
 * files, or that this pass corrected onto an already-established value.
 *
 * `docPanel` is `documentation/ProjectTerminalPanel.tsx`'s own palette
 * (Cortexa's redesign, extended to Rakshachakra and the American Chase
 * pipeline terminals) — the workspace's dominant, most-consumed terminal
 * family. `flatCard` is `TerminalInfoCard.tsx`/`ContributionsTerminal.tsx`'s
 * chromeless "single continuous surface" family. Both predate this file;
 * nothing here is a new palette, only a named home for values that used to
 * live as duplicated literals in every consumer.
 */

export const CHROME = {
  radius: {
    /** `rounded-xl` — the two-shell docPanel family, TerminalWindowSvg's `rx`. */
    panel: 12,
    /** `rounded-md` — flatCard family, CodeBlock. */
    flat: 6,
  },
  dots: {
    /** Standard macOS traffic-light red/amber/green, consistent everywhere already. */
    colors: ['#ff5f56', '#ffbd2e', '#27c93f'] as const,
    size: 9,
    gap: 6,
  },
  /** The typing-reveal caret's shared class (`src/index.css`) — named here so a future terminal reaches for one class rather than re-inventing the blink. */
  cursorClass: 'typing-reveal-cursor',
} as const;

export const TYPE = {
  /** Panel header / `$ filename` title row. */
  title: 'font-mono text-[13px]',
  /** Primary "cat file" style body — the docPanel family's dominant scale. */
  body: 'font-mono text-[14px] leading-[1.9]',
  /** Dense structured rows — decision/signal tables. */
  row: 'font-mono text-[13px] leading-[1.55]',
  /** Muted metadata, counts, labels. */
  meta: 'font-mono text-[11px]',
} as const;

export const PROMPT = {
  /** Interactive/command surfaces — the large majority. */
  shell: '$',
  /** System/process status lines (boot sequence). Not a prompt substitute. */
  status: '>',
  /** A real extracted value or state transition (constraint/signal terminals). */
  transition: '→',
} as const;

export const PALETTE = {
  /** `documentation/ProjectTerminalPanel.tsx`'s values verbatim — the Cortexa/Rakshachakra/American Chase terminal family. */
  docPanel: {
    bg: '#161B22',
    /** The page this family's panels sit on — `ProjectDocumentationViewer.tsx`'s `CORTEXA_BACKGROUND`, darker than `bg` on purpose (see that file's own comment on the panel-vs-page contrast direction). Was independently duplicated as pipeline/tokens.ts's `SURFACE`. */
    page: '#0F1117',
    border: 'rgba(255,255,255,.08)',
    text: '#E5E7EB',
    muted: '#9CA3AF',
    accent: '#38BDF8',
    success: '#6EE7B7',
  },
  /** `TerminalInfoCard.tsx`/`ContributionsTerminal.tsx`'s values — the chromeless flat-card family. */
  flatCard: {
    bg: '#111318',
    border: '#2d2d30',
    accent: '#569cd6',
  },
} as const;
