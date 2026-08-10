import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getFileById } from '../../content/fileSystem';
import { cn } from '../../lib/utils';

/**
 * Sprint 17 (RESUME.md spec §6): the collapsed OUTLINE and TIMELINE
 * disclosure rows pinned to the bottom of the Explorer, mirroring VS Code's
 * own sidebar.
 *
 * OUTLINE is deliberately derived from the active file's content rather
 * than hand-registered per view: it reads `## ` headings out of whatever
 * markdown is open, which for RESUME.md yields exactly the document's own
 * section list (see content/resume.ts, where the raw markdown's section
 * order was aligned with the rendered document's for precisely this
 * reason). That keeps the panel honest for free — sections can't drift out
 * of sync with a panel that reads them from the source.
 *
 * TIMELINE stands in for VS Code's file-history view. It has no real git
 * history behind it, so it shows the file's own recorded metadata rather
 * than inventing commits.
 */

const ROW_CLASS =
  'flex w-full items-center gap-1 px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#858585] hover:text-[#cccccc] outline-none focus-visible:ring-1 focus-visible:ring-[#007acc]';

function DisclosureRow({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#3c3c3c]">
      <button type="button" onClick={onToggle} aria-expanded={open} className={ROW_CLASS}>
        <ChevronRight
          size={14}
          className={cn('shrink-0 transition-transform duration-150 motion-reduce:transition-none', open && 'rotate-90')}
        />
        <span>{label}</span>
      </button>
      {open && <div className="max-h-40 overflow-y-auto pb-2">{children}</div>}
    </div>
  );
}

/** Pulls `## ` headings out of markdown content, in document order. */
function extractHeadings(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim());
}

export function ExplorerPanels() {
  const { activeFileId } = useStore();
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const activeFile = activeFileId ? getFileById(activeFileId) : undefined;
  const headings = activeFile?.content ? extractHeadings(activeFile.content) : [];

  return (
    <div className="shrink-0">
      <DisclosureRow label="Outline" open={outlineOpen} onToggle={() => setOutlineOpen((o) => !o)}>
        {headings.length > 0 ? (
          headings.map((heading) => (
            <div key={heading} className="truncate py-1 pl-8 pr-3 text-[12px] text-[#cccccc]">
              {heading}
            </div>
          ))
        ) : (
          <div className="py-1 pl-8 pr-3 text-[12px] text-[#858585]">No symbols found</div>
        )}
      </DisclosureRow>

      <DisclosureRow label="Timeline" open={timelineOpen} onToggle={() => setTimelineOpen((o) => !o)}>
        {activeFile ? (
          <div className="py-1 pl-8 pr-3 text-[12px] text-[#858585]">
            <span className="text-[#cccccc]">{activeFile.name}</span> — file saved
          </div>
        ) : (
          <div className="py-1 pl-8 pr-3 text-[12px] text-[#858585]">No file open</div>
        )}
      </DisclosureRow>
    </div>
  );
}
