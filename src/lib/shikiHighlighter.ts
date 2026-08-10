import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { bundledLanguages } from 'shiki/langs';

/**
 * Phase 6: fine-grained Shiki bundle. The old `import { codeToHtml } from
 * 'shiki'` pulled in every bundled grammar (~200+) and every bundled theme
 * (~50+) regardless of use. This module starts the highlighter with zero
 * languages preloaded and loads each one on first actual use — including
 * this workspace's own languages (FileType in types/index.ts is the
 * effective source of truth: markdown, typescript, tsx, javascript,
 * python, json, yaml, toml, shell, mermaid; 'graph' and 'log' never reach
 * Shiki at all — skills.graph renders through the Knowledge Graph
 * registry, startup.log through StartupLogViewer) — via the exact same
 * mechanism GitHub README's unbounded fenced-code languages use below.
 * Only `dark-plus`/`light-plus` are preloaded (see terminal/commands/
 * theme.ts's ALLOWED_THEMES — the only two themes the app ever requests).
 *
 * Every language loads from Shiki's own generated `bundledLanguages`
 * catalog (~200 entries, one `import()` per language with a static string
 * specifier — Rollup code-splits each into its own tiny chunk, so only
 * languages actually requested at runtime, by this workspace's files or a
 * visitor's README fences, ever get fetched). Earlier this module tried to
 * eagerly preload a fixed language list via `import(\`shiki/langs/${id}.mjs\`)`
 * — a *template-literal* dynamic import, which Rollup can't statically
 * resolve into a real chunk the way it can a string-literal one; it was
 * left as a raw runtime `import()` of a bare specifier, which browsers
 * can't resolve at all (no import map), so every highlight call failed
 * and silently fell back to plain, uncolored text. Routing every language
 * through `bundledLanguages`'s string-literal imports avoids that trap
 * entirely. A language genuinely absent from Shiki's catalog throws, same
 * as the old full-bundle codeToHtml did — callers (CodeBlock.tsx) already
 * catch that and fall back to plain, unhighlighted text.
 *
 * Uses the JS regex engine instead of the WASM oniguruma engine — trades
 * a small amount of grammar-edge-case fidelity for dropping onig.wasm
 * (~450KB) from the bundle entirely, which dwarfs any single language's
 * cost. See bundle comparison in the Phase 6 report.
 */
export const SHIKI_THEMES = ['dark-plus', 'light-plus'] as const;
export type ShikiTheme = (typeof SHIKI_THEMES)[number];

function isShikiTheme(theme: string): theme is ShikiTheme {
  return (SHIKI_THEMES as readonly string[]).includes(theme);
}

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedLangs = new Set<string>();

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import('shiki/themes/dark-plus.mjs'), import('shiki/themes/light-plus.mjs')],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

export async function codeToHtml(code: string, options: { lang: string; theme: string }): Promise<string> {
  const highlighter = await getHighlighter();
  const theme = isShikiTheme(options.theme) ? options.theme : 'dark-plus';

  if (!loadedLangs.has(options.lang)) {
    const loader = bundledLanguages[options.lang as keyof typeof bundledLanguages];
    if (!loader) throw new Error(`Shiki: unknown language "${options.lang}"`);
    await highlighter.loadLanguage(loader());
    loadedLangs.add(options.lang);
  }

  return highlighter.codeToHtml(code, { lang: options.lang, theme });
}
