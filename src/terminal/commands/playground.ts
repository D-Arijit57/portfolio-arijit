import type { CommandDefinition } from '../types';

/**
 * WA-08: named shortcut for the playground, the same "sugar" pattern already
 * used for projects/contact/resume (TERMINAL_DESIGN.md §10). Sprint 10C:
 * calls openToSide() rather than openFile() — Playground is the one feature
 * that's explicitly allowed to create a split (ARCHITECTURE.md's "split
 * editors exist only when explicitly required"), so running this command
 * opens it beside whatever's currently active instead of replacing it. The
 * split it creates is automatically torn back down by closeFile() once the
 * playground tab closes (see useStore's splitTrigger).
 */
export const playgroundCommand: CommandDefinition = {
  name: 'playground',
  description: 'Open the playground editor beside the current file',
  category: 'workspace',
  execute: (ctx) => {
    ctx.openToSide('playground');
    return { output: [{ type: 'file-link', fileId: 'playground', label: 'Opened playground.py' }] };
  },
};
