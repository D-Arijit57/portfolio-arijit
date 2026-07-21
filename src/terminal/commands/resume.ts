import type { CommandDefinition } from '../types';

/**
 * Sprint 10F: RESUME.md now exists as a real VFS file, resolving the
 * Sprint 5B judgment call that previously mapped this command to `profile`
 * for lack of dedicated resume content.
 */
export const resumeCommand: CommandDefinition = {
  name: 'resume',
  description: 'Open resume',
  category: 'workspace',
  execute: (ctx) => {
    const target = ctx.resolvePath('resume');
    if (!target || 'children' in target) {
      return { output: [{ type: 'error', text: 'resume: content not found' }] };
    }
    ctx.openFile(target.id);
    return { output: [{ type: 'file-link', fileId: target.id, label: `Opened ${target.name}` }] };
  },
};
