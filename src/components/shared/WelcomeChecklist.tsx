import React from 'react';
import { TerminalPromptLine } from './TerminalPromptLine';

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";
const MUTED = '#858585';

// Every item points at something that actually exists in this workspace —
// a real file, folder, or terminal command — so following the list never
// dead-ends. Not real interactive checkboxes (the ☐ is plain text): this
// is an invitation to explore, not a task tracker.
const CHECKLIST_ITEMS = [
  'Open whoami.md',
  'Explore projects/',
  'View work_history.yaml',
  'Run help in the terminal',
  'Try the theme command',
];

/**
 * welcome.md's onboarding checklist — replaces the old README's "Getting
 * Started" bullet list. Header reuses TerminalPromptLine (whoami.md's own
 * `##`-heading replacement) rather than a markdown heading, keeping
 * welcome.md's section markers consistent with the rest of the workspace.
 */
export function WelcomeChecklist() {
  return (
    <div className="my-4">
      <TerminalPromptLine
        tokens={[
          { text: './', color: '#6e7681' },
          { text: 'checklist.sh', color: '#ffffff' },
        ]}
      />
      <div style={{ fontFamily: ROBOTO_MONO }}>
        {CHECKLIST_ITEMS.map((item) => (
          <div key={item} className="py-1 text-[13px]">
            <span className="mr-2" style={{ color: MUTED }}>
              ☐
            </span>
            <span style={{ color: '#cccccc' }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
