import type { VirtualFile, VirtualFolder } from '../types';

/**
 * Domain types for the Terminal subsystem. Frozen shape per TERMINAL_DESIGN.md
 * §16, with two additive capabilities on CommandContext (`history`, theme
 * getters/setters) needed by the `history`/`theme` commands that §16 named
 * but didn't fully specify a mechanism for — see the Sprint 5B report.
 */

export type ExecutionStatus = 'idle' | 'executing';

export type CommandCategory = 'navigation' | 'workspace' | 'information' | 'backend' | 'ai';

export interface ParsedCommand {
  name: string;
  args: string[];
}

export type OutputEntry =
  | { type: 'text'; text: string }
  | { type: 'error'; text: string }
  | { type: 'file-link'; fileId: string; label: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface HistoryEntry {
  id: string;
  command: string;
  cwd: string;
  output: OutputEntry[];
  timestamp: number;
}

export interface CommandContext {
  args: string[];
  raw: string;
  cwd: string;
  history: string[];
  openFile: (id: string) => void;
  resolvePath: (path: string) => VirtualFile | VirtualFolder | undefined;
  setCwd: (path: string) => void;
  clearHistory: () => void;
  getEditorTheme: () => string;
  setEditorTheme: (theme: string) => void;
  signal?: AbortSignal;
}

export interface CommandResult {
  output: OutputEntry[];
  newCwd?: string;
}

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  category: CommandCategory;
  execute: (ctx: CommandContext) => CommandResult | Promise<CommandResult>;
}
