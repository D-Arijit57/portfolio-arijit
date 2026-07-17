import type { CommandDefinition } from '../types';

export const pwdCommand: CommandDefinition = {
  name: 'pwd',
  description: 'Print the current working directory',
  category: 'workspace',
  execute: (ctx) => ({
    output: [{ type: 'text', text: ctx.cwd }],
  }),
};
