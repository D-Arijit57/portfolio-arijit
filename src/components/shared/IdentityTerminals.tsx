import React from 'react';
import { TerminalInfoCard } from './TerminalInfoCard';

/**
 * whoami.md's header widget — replaces the old single wide identity card
 * and the sidebar's separate Availability card with one paired row of two
 * shell panes: `$ whoami` (who) and `$ env` (the availability-card fields,
 * restyled as environment variables so nothing is said twice). No
 * `flex-wrap` — the pair must always split the row evenly, anchoring the
 * top of the page, rather than shrinking to their content width and
 * huddling on the left.
 */
export function IdentityTerminals() {
  return (
    <div className="my-4 flex gap-4">
      <TerminalInfoCard
        command="whoami"
        separator=":"
        rows={[
          { label: 'Name', value: 'Arijit Das' },
          { label: 'Role', value: 'Software Engineer' },
          { label: 'Focus', value: 'Backend • AI' },
          {
            label: 'Status',
            value: (
              <>
                Available <span className="text-[#3fb950]">●</span>
              </>
            ),
          },
        ]}
      />
      <TerminalInfoCard
        command="env"
        separator="="
        rows={[
          { label: 'Location', value: 'India' },
          { label: 'Experience', value: '1 Year' },
          { label: 'Timezone', value: 'UTC+05:30' },
          { label: 'OpenToWork', value: <span className="text-[#569cd6]">true</span> },
        ]}
      />
    </div>
  );
}
