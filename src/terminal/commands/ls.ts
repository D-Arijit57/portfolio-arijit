import type { CommandDefinition, OutputEntry } from '../types';

export const lsCommand: CommandDefinition = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [path]',
  category: 'workspace',
  execute: (ctx) => {
    const target = ctx.resolvePath(ctx.args[0] ?? '');

    if (!target) {
      return { output: [{ type: 'error', text: `ls: ${ctx.args[0]}: No such file or directory` }] };
    }

    if (!('children' in target)) {
      return { output: [{ type: 'file-link', fileId: target.id, label: target.name }] };
    }

    if (target.children.length === 0) {
      return { output: [{ type: 'text', text: '(empty)' }] };
    }

    const output: OutputEntry[] = target.children.map((child) =>
      'children' in child
        ? { type: 'text', text: `${child.name}/` }
        : { type: 'file-link', fileId: child.id, label: child.name }
    );

    return { output };
  },
};
