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
    /** Phase 9B (second pass): the user asked for cortexa.md/rakshachakra.md/
     * americanchase.yaml's terminal shells to match whoami.md's own
     * `git log --oneline` box *exactly* — that box's background is the
     * app's already-dominant `#1e1e1e` (Terminal.tsx, contact.sh, every
     * other editor surface), not a bespoke docPanel tone. Was `#161B22`
     * (blue-navy), briefly `#161616` (neutral near-black) in an earlier
     * attempt at the same goal — both superseded by reusing the one value
     * that's actually everywhere already. */
    bg: '#1e1e1e',
    /** The page this family's panels sit on — `ProjectDocumentationViewer.tsx`'s `CORTEXA_BACKGROUND`, darker than `bg` on purpose (see that file's own comment on the panel-vs-page contrast direction). Was independently duplicated as pipeline/tokens.ts's `SURFACE`. */
    page: '#0d0d0d',
    border: 'rgba(255,255,255,.08)',
    text: '#E5E7EB',
    muted: '#9CA3AF',
    /** Phase 9B (third pass, then reverted): was `#38BDF8`, briefly Apple
     * Terminal.app's literal ANSI blue (`#2009DB`, decoded from Apple's real
     * .terminal profile) — reverted back to the app's dominant "prompt
     * blue," now matching `flatCard.accent` below exactly rather than
     * being its own distinct docPanel-family blue. Every green/teal/blue
     * literal across cortexa.md/rakshachakra.md/americanchase.yaml's own
     * terminal files that converged onto the Apple blue in this pass was
     * reverted alongside it. */
    accent: '#569cd6',
    /** Phase 9B (third pass): was `#6EE7B7`, briefly Apple Terminal.app's
     * literal "Pro" profile bright ANSI green (`#00D900`, decoded from
     * Apple's real .terminal colour profile) — that read as too neon, so
     * this settled on `#4CD964`, Apple's own macOS/iOS system green
     * (toggles/success states): still genuinely "an Apple green," just
     * warmer and less saturated than the raw ANSI value. Unlike accent
     * above, a green change was kept here, just tuned rather than reverted. */
    success: '#4CD964',
  },
  /** `TerminalInfoCard.tsx`/`ContributionsTerminal.tsx`'s values — the chromeless flat-card family. */
  flatCard: {
    bg: '#111318',
    border: '#2d2d30',
    accent: '#569cd6',
  },
} as const;
