import type { CommandDefinition } from './types';

/**
 * Commands are code, not session data (TERMINAL_DESIGN.md §2, §5, §18.7) —
 * this is a module-level Map, populated once at import time by
 * commands/index.ts, never held as reactive store state.
 */
const commandRegistry = new Map<string, CommandDefinition>();
const aliasMap = new Map<string, string>();

export function registerCommand(def: CommandDefinition): void {
  if (commandRegistry.has(def.name)) {
    throw new Error(`Command "${def.name}" is already registered`);
  }
  commandRegistry.set(def.name, def);
  for (const alias of def.aliases ?? []) {
    aliasMap.set(alias, def.name);
  }
}

export function getCommand(name: string): CommandDefinition | undefined {
  const canonical = aliasMap.get(name) ?? name;
  return commandRegistry.get(canonical);
}

export function listCommands(): CommandDefinition[] {
  return Array.from(commandRegistry.values());
}
