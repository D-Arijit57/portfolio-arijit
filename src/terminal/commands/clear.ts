import type { CommandDefinition } from '../types';

export const clearCommand: CommandDefinition = {
  name: 'clear',
  description: 'Clear the terminal scrollback',
  category: 'navigation',
  execute: (ctx) => {
    ctx.clearHistory();
    return { output: [] };
  },
};
