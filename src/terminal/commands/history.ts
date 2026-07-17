import type { CommandDefinition } from '../types';

export const historyCommand: CommandDefinition = {
  name: 'history',
  description: 'Show recent command history',
  usage: 'history [count]',
  category: 'information',
  execute: (ctx) => {
    let count = ctx.history.length;

    if (ctx.args[0] !== undefined) {
      const parsed = Number(ctx.args[0]);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { output: [{ type: 'error', text: 'Usage: history [count]' }] };
      }
      count = parsed;
    }

    const entries = ctx.history.slice(-count);
    if (entries.length === 0) {
      return { output: [{ type: 'text', text: '(no history yet)' }] };
    }

    const startIndex = ctx.history.length - entries.length + 1;
    return {
      output: [
        {
          type: 'table',
          headers: ['#', 'Command'],
          rows: entries.map((cmd, i) => [String(startIndex + i), cmd]),
        },
      ],
    };
  },
};
