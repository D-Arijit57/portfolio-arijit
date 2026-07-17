import type { CommandDefinition } from '../types';
import { PROMPT_IDENTITY, PROMPT_WORKSPACE } from '../prompt';

export const whoamiCommand: CommandDefinition = {
  name: 'whoami',
  description: 'Print the current identity',
  category: 'information',
  execute: () => ({
    output: [{ type: 'text', text: `${PROMPT_IDENTITY} (${PROMPT_WORKSPACE} workspace)` }],
  }),
};
