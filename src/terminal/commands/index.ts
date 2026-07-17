import { registerCommand } from '../registry';
import { helpCommand } from './help';
import { clearCommand } from './clear';
import { pwdCommand } from './pwd';
import { lsCommand } from './ls';
import { cdCommand } from './cd';
import { catCommand } from './cat';
import { openCommand } from './open';
import { historyCommand } from './history';
import { whoamiCommand } from './whoami';
import { resumeCommand } from './resume';
import { projectsCommand } from './projects';
import { contactCommand } from './contact';
import { themeCommand } from './theme';

/**
 * The one file touched to add a new command (TERMINAL_DESIGN.md §5, §15).
 * No other layer (Terminal.tsx, executor.ts, the store) needs to change.
 */
export function registerBuiltinCommands(): void {
  registerCommand(helpCommand);
  registerCommand(clearCommand);
  registerCommand(pwdCommand);
  registerCommand(lsCommand);
  registerCommand(cdCommand);
  registerCommand(catCommand);
  registerCommand(openCommand);
  registerCommand(historyCommand);
  registerCommand(whoamiCommand);
  registerCommand(resumeCommand);
  registerCommand(projectsCommand);
  registerCommand(contactCommand);
  registerCommand(themeCommand);
}
