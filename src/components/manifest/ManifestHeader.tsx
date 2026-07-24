import React from 'react';

export function ManifestHeader({ project, description }: { project: string; description: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-[#858585]">
        Technology Manifest
      </div>
      <h1 className="mt-1 text-2xl font-semibold text-white">{project}</h1>
      {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#9d9d9d]">{description}</p>}
    </div>
  );
}
