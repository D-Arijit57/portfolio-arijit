import type { CommandDefinition } from '../types';

/**
 * Category B store command (Sprint 5B §6) — reads/writes the editor's
 * Shiki syntax-highlighting theme via the setEditorTheme capability. Does
 * not touch IDE chrome/layout — scoped to the one cosmetic knob that
 * already existed as a hardcoded literal in ShikiEditor.tsx.
 */
const ALLOWED_THEMES = ['dark-plus', 'light-plus'];

export const themeCommand: CommandDefinition = {
  name: 'theme',
  description: 'Show or change the editor syntax theme',
  usage: `theme [${ALLOWED_THEMES.join('|')}]`,
  category: 'navigation',
  execute: (ctx) => {
    const arg = ctx.args[0];

    if (!arg) {
      return { output: [{ type: 'text', text: `Current theme: ${ctx.getEditorTheme()}` }] };
    }

    if (!ALLOWED_THEMES.includes(arg)) {
      return {
        output: [
          { type: 'error', text: `theme: unknown theme "${arg}". Available: ${ALLOWED_THEMES.join(', ')}` },
        ],
      };
    }

    ctx.setEditorTheme(arg);
    return { output: [{ type: 'text', text: `Theme set to ${arg}` }] };
  },
};
