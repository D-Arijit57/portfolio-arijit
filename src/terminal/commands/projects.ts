import type { CommandDefinition } from '../types';

/**
 * Named shortcut to `open`, not separate logic (TERMINAL_DESIGN.md §10).
 * Targets the projects README — same mapping the old Terminal.tsx switch
 * statement used for `projects`/`cortexa`.
 */
export const projectsCommand: CommandDefinition = {
  name: 'projects',
  description: 'Open the projects overview',
  category: 'workspace',
  execute: (ctx) => {
    const target = ctx.resolvePath('cortexa_readme');
    if (!target || 'children' in target) {
      return { output: [{ type: 'error', text: 'projects: content not found' }] };
    }
    ctx.openFile(target.id);
    return { output: [{ type: 'file-link', fileId: target.id, label: `Opened ${target.name}` }] };
  },
};
