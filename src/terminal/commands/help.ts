import type { CommandDefinition } from '../types';
import { listCommands } from '../registry';

export const helpCommand: CommandDefinition = {
  name: 'help',
  description: 'List available commands',
  category: 'information',
  execute: () => {
    const commands = listCommands().sort((a, b) => a.name.localeCompare(b.name));
    return {
      output: [
        {
          type: 'table',
          headers: ['Command', 'Description'],
          rows: commands.map((c) => [c.usage ?? c.name, c.description]),
        },
      ],
    };
  },
};
