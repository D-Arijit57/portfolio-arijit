import React from 'react';
import { TerminalPromptLine } from './TerminalPromptLine';

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";
const MUTED = '#858585';
// Reused, not invented: #4ec9b0 is already RecentActivityLog's commit-sha
// accent — same "this is a literal token, not prose" signal here.
const TEAL = '#4ec9b0';

// Real commands this terminal actually runs (src/terminal/commands/) — not
// invented flavor text, so anyone who tries one gets a real result.
const COMMANDS: { name: string; description: string }[] = [
  { name: 'whoami', description: 'Print the current identity' },
  { name: 'projects', description: 'Open the projects overview' },
  { name: 'resume', description: 'Open resume' },
  { name: 'contact', description: 'Open contact information' },
  { name: 'theme', description: 'Show or change the editor syntax theme' },
  { name: 'help', description: 'List available commands' },
];

/**
 * welcome.md's commands section — replaces the old README's `npm run
 * about` fenced snippet with commands unique to this workspace's own
 * terminal, matching ContributionsTerminal's bordered-surface-as-output
 * treatment rather than a generic markdown code block.
 */
export function WelcomeCommands() {
  return (
    <div className="my-4">
      <TerminalPromptLine tokens={[{ text: 'help' }]} />
      <div
        className="rounded-md border border-[#333333] bg-[#1e1e1e] p-3"
        style={{ fontFamily: ROBOTO_MONO }}
      >
        {COMMANDS.map((cmd) => (
          <div key={cmd.name} className="flex gap-3 py-0.5 text-[12px]">
            <span className="w-24 shrink-0" style={{ color: TEAL }}>
              {cmd.name}
            </span>
            <span style={{ color: MUTED }}>{cmd.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
