import React from 'react';

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";

/**
 * A single `$ command` line — whoami.md's replacement for markdown `##`
 * section headings (see AboutSection.tsx, AboutActivityRow.tsx). Same
 * "$" accent color as the identity terminals and the contributions
 * prompt, so every section on the page introduces itself the same way.
 */
export function TerminalPromptLine({ command, className = '' }: { command: string; className?: string }) {
  return (
    <div className={`text-[13px] ${className}`} style={{ fontFamily: ROBOTO_MONO }}>
      <span style={{ color: '#569cd6' }}>$</span> <span style={{ color: '#858585' }}>{command}</span>
    </div>
  );
}
