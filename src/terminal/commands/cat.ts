import type { CommandDefinition } from '../types';

const MAX_PREVIEW_CHARS = 2000;

export const catCommand: CommandDefinition = {
  name: 'cat',
  description: 'Print file contents',
  usage: 'cat <file>',
  category: 'workspace',
  execute: (ctx) => {
    const arg = ctx.args[0];
    if (!arg) {
      return { output: [{ type: 'error', text: 'Usage: cat <file>' }] };
    }

    const target = ctx.resolvePath(arg);
    if (!target) {
      return { output: [{ type: 'error', text: `cat: ${arg}: No such file or directory` }] };
    }

    if ('children' in target) {
      return { output: [{ type: 'error', text: `cat: ${arg}: Is a directory` }] };
    }

    const truncated = target.content.length > MAX_PREVIEW_CHARS;
    const text = truncated
      ? `${target.content.slice(0, MAX_PREVIEW_CHARS)}\n... [truncated]`
      : target.content;

    return { output: [{ type: 'text', text }] };
  },
};
