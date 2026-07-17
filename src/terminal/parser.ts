import type { ParsedCommand } from './types';

/**
 * Tokenizes a raw submitted line into a command name and arguments.
 * Pure — no registry lookup, no execution, no store access. Naive
 * whitespace splitting, no quoting/escaping support (TERMINAL_DESIGN.md §17
 * technical debt — acceptable for Sprint 5B's command set).
 */
export function parseCommand(raw: string): ParsedCommand {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const [name = '', ...args] = tokens;
  return { name: name.toLowerCase(), args };
}
