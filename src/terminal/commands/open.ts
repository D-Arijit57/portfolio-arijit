import type { CommandDefinition } from '../types';

export const openCommand: CommandDefinition = {
  name: 'open',
  description: 'Open a file in the editor',
  usage: 'open <file>',
  category: 'workspace',
  execute: (ctx) => {
    const arg = ctx.args[0];
    if (!arg) {
      return { output: [{ type: 'error', text: 'Usage: open <file>' }] };
    }

    const target = ctx.resolvePath(arg);
    if (!target) {
      return { output: [{ type: 'error', text: `open: ${arg}: No such file or directory` }] };
    }

    if ('children' in target) {
      return { output: [{ type: 'error', text: `open: ${arg}: Is a directory` }] };
    }

    ctx.openFile(target.id);
    return { output: [{ type: 'file-link', fileId: target.id, label: `Opened ${target.name}` }] };
  },
};
