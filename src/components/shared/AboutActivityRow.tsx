import React from 'react';
import { AboutSection } from './AboutSection';
import { RecentActivityLog } from './RecentActivityLog';
import { TerminalPromptLine } from './TerminalPromptLine';

/**
 * whoami.md's second row — About beside Recent Activity, not About beside
 * the GitHub graph (Layout Refactor iteration 2): both are "the human
 * side" of the page (how I think / what I've actually been building),
 * while GitHub Contributions gets promoted to its own full-width section
 * below. About's column is sized to give its own `max-w-[70ch]` text room
 * to actually reach ~70 characters per line (AboutSection.tsx) rather than
 * wrapping early inside a narrower box; Recent Activity (unmodified — see
 * RecentActivityLog.tsx) takes the rest via `flex-1`. Recent Activity's own
 * `## Recent Activity` markdown heading is gone too, replaced by a
 * `$ ./recent-activity.sh` prompt line (TerminalPromptLine) — the same
 * swap AboutSection made, so whoami.md no longer has any `##` headings
 * left at all, just `$ command` lines introducing each section.
 */
export function AboutActivityRow() {
  return (
    <div className="my-4 flex items-start gap-6">
      <div className="w-[680px] shrink-0">
        <AboutSection />
      </div>
      <div className="min-w-0 flex-1">
        <TerminalPromptLine command="./recent-activity.sh" />
        <div className="mt-2">
          <RecentActivityLog />
        </div>
      </div>
    </div>
  );
}
