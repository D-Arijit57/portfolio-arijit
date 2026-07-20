import React from 'react';

const FIELDS: { label: string; value: string }[] = [
  { label: 'Location', value: 'Remote' },
  { label: 'Experience', value: '5+ years' },
  { label: 'Timezone', value: 'IST (UTC+5:30)' },
];

/**
 * Compact "at a glance" card for profile.md — floated beside the intro
 * paragraph via ordinary CSS (float-right), not a layout the markdown
 * pipeline itself needs to know about.
 */
export function ProfileStatusCard() {
  return (
    <div className="float-right ml-6 mb-4 w-[220px] rounded-md border border-[#333333] bg-[#252526] p-4 text-[12px]">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3fb950] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3fb950]" />
        </span>
        <span className="text-[#cccccc]">Available</span>
      </div>
      <dl className="space-y-2">
        {FIELDS.map((field) => (
          <div key={field.label} className="flex items-center justify-between gap-2">
            <dt className="text-[#858585]">{field.label}</dt>
            <dd className="text-right text-[#cccccc]">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
