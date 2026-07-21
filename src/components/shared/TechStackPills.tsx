import React from 'react';

const TECHNOLOGIES = ['Python', 'React / Next.js', 'RAG', 'LLMS', 'Docker / K8s'];

/** Muted, monospace tech pills for profile.md — plain CSS, no new design tokens. */
export function TechStackPills() {
  return (
    <div className="my-4 flex flex-wrap gap-2">
      {TECHNOLOGIES.map((tech) => (
        <span
          key={tech}
          className="rounded-full border border-[#3c3c3c] bg-[#2d2d2d] px-3 py-1 font-mono text-[11px] text-[#9cdcfe]"
        >
          {tech}
        </span>
      ))}
    </div>
  );
}
