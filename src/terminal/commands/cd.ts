import type { CommandDefinition } from '../types';

export const cdCommand: CommandDefinition = {
  name: 'cd',
  description: 'Change the current working directory',
  usage: 'cd [path]',
  category: 'workspace',
  execute: (ctx) => {
    const arg = ctx.args[0] ?? '/';
    const target = ctx.resolvePath(arg);

    if (!target) {
      return { output: [{ type: 'error', text: `cd: ${arg}: No such file or directory` }] };
    }

    if (!('children' in target)) {
      return { output: [{ type: 'error', text: `cd: ${arg}: Not a directory` }] };
    }

    ctx.setCwd(target.path);
    return { output: [], newCwd: target.path };
  },
};
