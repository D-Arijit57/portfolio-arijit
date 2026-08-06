import React from 'react';
import { TerminalPromptLine } from '../shared/TerminalPromptLine';
import { parseMetadataEntries } from '../../documentation/metadata';
import type { DocumentationFrontmatter } from '../../documentation/types';

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";

/**
 * Documentation Redesign: replaces the old oversized `<h1>` hero with a
 * `$ cat <file>` command line (TerminalPromptLine — the same "whoami.md
 * section-header" component, reused rather than forked) followed by a
 * plain-text "output" block: title + summary on one line, `Status` (if the
 * doc's frontmatter has one) on the next, then the technology list as bare
 * typography — no badge chips, no logos. A real project file, not a
 * marketing hero.
 */
export function DocumentationHero({
  title,
  frontmatter,
  fileName,
}: {
  title: string;
  frontmatter: DocumentationFrontmatter;
  fileName: string;
}) {
  const summary = typeof frontmatter.summary === 'string' ? frontmatter.summary : undefined;
  const badges = Array.isArray(frontmatter.badges) ? frontmatter.badges : [];
  const status = parseMetadataEntries(frontmatter).find((entry) => entry.label.toLowerCase() === 'status')?.value;

  return (
    <div className="mb-8">
      <TerminalPromptLine tokens={[{ text: 'cat ', color: '#4ec9b0' }, { text: fileName, color: '#ffffff', opacity: 0.85 }]} />
      {/* pl-[10px] lines up with TerminalPromptLine's own 2px accent bar +
          gap-2, so this "output" reads as flush underneath the `$` prompt. */}
      <div className="mt-1 flex flex-col gap-1.5 pl-[10px]" style={{ fontFamily: ROBOTO_MONO }}>
        {(title || summary) && (
          <p className="text-[14px] leading-relaxed text-[#cccccc]">
            {title && <span className="font-semibold text-white">{title}</span>}
            {title && summary && <span className="text-[#6a6a6a]"> — </span>}
            {summary}
          </p>
        )}
        {status && (
          <p className="flex items-center gap-1.5 text-[13px] text-white">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3fb950]" />
            {status}
          </p>
        )}
        {badges.length > 0 && <p className="mt-1 text-[12px] text-[#858585]">{badges.join(' • ')}</p>}
      </div>
    </div>
  );
}
