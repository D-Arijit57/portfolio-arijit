import type { CommandDefinition } from '../types';

/**
 * Named shortcut to `open`. No dedicated resume file exists in the VFS
 * seed (server or client) — mapped to the profile page as the closest
 * existing resume-equivalent content. Flagged in the Sprint 5B report as
 * a judgment call, not a silent assumption.
 */
export const resumeCommand: CommandDefinition = {
  name: 'resume',
  description: 'Open resume / profile',
  category: 'workspace',
  execute: (ctx) => {
    const target = ctx.resolvePath('profile');
    if (!target || 'children' in target) {
      return { output: [{ type: 'error', text: 'resume: content not found' }] };
    }
    ctx.openFile(target.id);
    return { output: [{ type: 'file-link', fileId: target.id, label: `Opened ${target.name}` }] };
  },
};
