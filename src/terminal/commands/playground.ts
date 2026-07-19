import type { CommandDefinition } from '../types';

/**
 * WA-08: named shortcut to `open`, the same "sugar" pattern already used
 * for projects/contact/resume (TERMINAL_DESIGN.md §10). Restoring after a
 * close needs no special-casing beyond this — WA-01's pane-selection
 * strategy already reuses whichever pane is empty, so if the playground's
 * pane collapsed (WA-07) this naturally reopens it there and the split
 * layout re-expands on its own.
 */
export const playgroundCommand: CommandDefinition = {
  name: 'playground',
  description: 'Reopen the playground editor',
  category: 'workspace',
  execute: (ctx) => {
    ctx.openFile('playground');
    return { output: [{ type: 'file-link', fileId: 'playground', label: 'Reopened playground.py' }] };
  },
};
