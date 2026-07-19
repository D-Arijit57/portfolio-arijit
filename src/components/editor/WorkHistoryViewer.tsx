import React, { useEffect, useRef, useState } from 'react';
import { getFileById } from '../../content/fileSystem';
import { codeToHtml } from 'shiki';
import { cn } from '../../lib/utils';

// WA-09: below this container width (not viewport width — this is what
// actually narrows inside a split pane) the two columns stack vertically
// instead of squeezing side-by-side into unreadable slivers.
const STACK_BREAKPOINT_PX = 640;

export function WorkHistoryViewer() {
  const file = getFileById('work_history');
  const [html, setHtml] = React.useState('');
  const [activeJob, setActiveJob] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  React.useEffect(() => {
    if (file) {
      codeToHtml(file.content, { lang: 'ts', theme: 'dark-plus' })
        .then(setHtml);
    }
  }, [file]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(width > 0 && width < STACK_BREAKPOINT_PX);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const jobs = [
    {
      company: 'TechNova Solutions',
      role: 'Senior Frontend Engineer',
      startDate: '2021-03',
      endDate: 'Present',
      highlights: [
        'Led migration of legacy monolithic app to React/TypeScript micro-frontends.',
        'Mentored 4 junior developers and established CI/CD best practices.'
      ],
      lineStart: 10,
      lineEnd: 20
    },
    {
      company: 'NextGen AI',
      role: 'Full Stack Developer',
      startDate: '2019-06',
      endDate: '2021-02',
      highlights: [
        'Developed real-time collaboration features using WebSockets.',
        'Optimized database queries reducing latency by 40%.'
      ],
      lineStart: 21,
      lineEnd: 30
    }
  ];

  return (
    <div ref={containerRef} className={cn('flex h-full w-full min-h-0', isNarrow && 'flex-col')}>
      <div
        className={cn(
          'overflow-auto bg-[#1e1e1e] p-4 text-[14px] font-mono border-[#333333] relative min-w-0 min-h-0',
          isNarrow ? 'w-full h-1/2 border-b' : 'flex-1 border-r'
        )}
      >
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className="[&>pre]:!bg-transparent [&>pre]:whitespace-pre pointer-events-none w-max"
        />
      </div>
      <div
        className={cn(
          'bg-[#252526] p-8 overflow-y-auto min-w-0 min-h-0',
          isNarrow ? 'w-full h-1/2' : 'flex-1'
        )}
      >
        <h2 className="text-xl font-semibold text-white mb-8">Career Roadmap</h2>
        <div className="relative border-l-2 border-[#333333] ml-4 space-y-8 max-w-prose">
          {jobs.map((job, idx) => (
            <div
              key={idx}
              className="relative pl-6 cursor-pointer group"
              onMouseEnter={() => setActiveJob(idx)}
              onMouseLeave={() => setActiveJob(null)}
            >
              <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 transition-colors ${activeJob === idx ? 'bg-[#007acc] border-[#007acc]' : 'bg-[#252526] border-[#333333] group-hover:border-[#007acc]'}`} />
              <div className="text-xs text-[#858585] mb-1">{job.startDate} — {job.endDate}</div>
              <div className={`text-base font-medium transition-colors ${activeJob === idx ? 'text-[#007acc]' : 'text-white'}`}>
                {job.role}
              </div>
              <div className="text-[13px] text-[#cccccc] mb-2">{job.company}</div>
              <ul className="list-disc list-inside text-[13px] text-[#858585] space-y-1">
                {job.highlights.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
