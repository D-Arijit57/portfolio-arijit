import type { CommandContext, CommandResult, ParsedCommand } from './types';
import { getCommand } from './registry';

/**
 * Looks up the parsed command in the registry and invokes it. This is the
 * one place an exception thrown by a command handler is caught — no
 * exception from here ever reaches React (TERMINAL_DESIGN.md §13). Knows
 * only the CommandDefinition contract, never what a specific command does.
 */
export async function executeCommand(
  parsed: ParsedCommand,
  ctx: CommandContext
): Promise<CommandResult> {
  const command = getCommand(parsed.name);

  if (!command) {
    return {
      output: [{ type: 'error', text: `command not found: ${parsed.name}` }],
    };
  }

  if (ctx.signal?.aborted) {
    return { output: [{ type: 'text', text: '^C' }] };
  }

  try {
    return await command.execute(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown execution error';
    return {
      output: [{ type: 'error', text: `${parsed.name}: ${message}` }],
    };
  }
}
