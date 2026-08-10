import React from 'react';

export interface TerminalInfoRow {
  label: string;
  value: React.ReactNode;
}

/**
 * One "shell pane" — shared shape for whoami.md's `$ whoami` and `$ env`
 * widgets (IdentityTerminals.tsx) so the pair can only ever drift apart in
 * content, never in styling. `flex-1` (not a fixed width) so the two sit
 * evenly split across the full row width, anchoring the top of the page
 * instead of huddling in its left half.
 */
export function TerminalInfoCard({
  command,
  separator,
  rows,
  labelWidth = 96,
}: {
  command: string;
  separator: string;
  rows: TerminalInfoRow[];
  labelWidth?: number;
}) {
  return (
    <div
      className="min-w-0 flex-1 overflow-hidden rounded-md border border-[#2d2d30] bg-[#111318] font-mono text-[#cccccc]"
    >
      <div className="px-4 py-3 text-[12px] leading-relaxed">
        <div className="mb-2 whitespace-nowrap">
          <span className="text-[#569cd6]" style={{ textShadow: '0 0 6px rgba(86, 156, 214, 0.55)' }}>
            $
          </span>{' '}
          {command}
          <span className="typing-reveal-cursor ml-0.5 text-[#cccccc]">▌</span>
        </div>
        <dl>
          {rows.map((row) => (
            <div key={row.label} className="flex gap-1.5">
              <dt className="shrink-0 text-[#858585]" style={{ width: labelWidth }}>
                {row.label}
              </dt>
              <dd className="text-[#cccccc]">
                <span className="mr-1.5 text-[#6e7681]">{separator}</span>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
