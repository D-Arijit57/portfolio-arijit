import type { CommandDefinition } from '../types';

/** Named shortcut to `open`, targeting contact.sh (TERMINAL_DESIGN.md §10). */
export const contactCommand: CommandDefinition = {
  name: 'contact',
  description: 'Open contact information',
  category: 'workspace',
  execute: (ctx) => {
    const target = ctx.resolvePath('contact_sh');
    if (!target || 'children' in target) {
      return { output: [{ type: 'error', text: 'contact: content not found' }] };
    }
    ctx.openFile(target.id);
    return { output: [{ type: 'file-link', fileId: target.id, label: `Opened ${target.name}` }] };
  },
};
