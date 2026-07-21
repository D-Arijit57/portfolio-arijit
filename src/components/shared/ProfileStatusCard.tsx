import React from 'react';

const FIELDS: { label: string; value: string }[] = [
  { label: 'Location', value: 'Indore, MP, India' },
  { label: 'Experience', value: '1 year' },
  { label: 'Timezone', value: 'IST (UTC+5:30)' },
];

/**
 * "At a glance" card for profile.md — sized and positioned by its parent
 * (ProfileSidebar's grid column), not by anything of its own; this component
 * only owns its internal padding/typography, same separation of concerns as
 * every other shared widget.
 */
export function ProfileStatusCard() {
  return (
    <div className="rounded-md border border-[#333333] bg-[#252526] p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3fb950] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3fb950]" />
        </span>
        <span className="text-[14px] font-medium text-[#cccccc]">Available</span>
      </div>
      <dl className="space-y-3 text-[13px]">
        {FIELDS.map((field) => (
          <div key={field.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-[#858585]">{field.label}</dt>
            <dd className="text-right font-medium text-[#cccccc]">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
