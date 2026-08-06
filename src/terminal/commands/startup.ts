import type { CommandDefinition } from '../types';

/**
 * WA-08: named shortcut for startup.log, the same "sugar" pattern already
 * used for projects/contact/resume (TERMINAL_DESIGN.md §10). Sprint 10C:
 * calls openToSide() rather than openFile() — startup.log is the one
 * feature that's explicitly allowed to create a split (ARCHITECTURE.md's
 * "split editors exist only when explicitly required"), so running this
 * command opens it beside whatever's currently active instead of replacing
 * it. The split it creates is automatically torn back down by closeFile()
 * once the startup.log tab closes (see useStore's splitTrigger).
 */
export const startupCommand: CommandDefinition = {
  name: 'startup',
  description: 'Open the workspace startup log beside the current file',
  category: 'workspace',
  execute: (ctx) => {
    ctx.openToSide('startup-log');
    return { output: [{ type: 'file-link', fileId: 'startup-log', label: 'Opened startup.log' }] };
  },
};
