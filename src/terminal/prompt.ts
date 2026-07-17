/**
 * Single source of truth for terminal identity — whoami.ts reads these
 * same constants rather than duplicating the strings, so identity is
 * defined in exactly one place (TERMINAL_DESIGN.md §9).
 */
export const PROMPT_IDENTITY = 'arijit';
export const PROMPT_WORKSPACE = 'portfolio';

/**
 * Formats an absolute VFS path as a shell-style home-relative path —
 * root ('/') displays as '~', everything else as '~' + path.
 */
function formatCwd(cwd: string): string {
  return cwd === '/' ? '~' : `~${cwd}`;
}

/**
 * getPrompt(): string — pure derivation, called on every render, never
 * stored (TERMINAL_DESIGN.md §2, §9). Example: arijit@portfolio:~/projects$
 */
export function getPrompt(cwd: string): string {
  return `${PROMPT_IDENTITY}@${PROMPT_WORKSPACE}:${formatCwd(cwd)}$`;
}
