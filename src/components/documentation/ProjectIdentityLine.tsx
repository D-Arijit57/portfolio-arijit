import React from 'react';
import { parseMetadataEntries } from '../../documentation/metadata';
import type { DocumentationFrontmatter } from '../../documentation/types';
import { ACCENT, MUTED, SUCCESS, TEXT } from './ProjectTerminalPanel';

/**
 * The page's first read — deliberately `head -1`, not `cat`. Originally
 * `CortexaIdentityLine`, renamed here (Rakshachakra Grammar Extraction,
 * Phase 2) since `ProjectDocumentationViewer.tsx` now uses it directly for
 * both terminal-grammar docs — a plain rename, not a copy, so it's still
 * the exact same component Cortexa's own hero was already rendering with.
 * Identical rendering to before for any doc whose frontmatter has no
 * metadata beyond `Status` (Cortexa's own), plus one additive capability
 * described below.
 *
 * A recruiter scans before committing, so line one of the file is present
 * and readable at 0ms with no animation, and it's the largest type on the
 * page so the eye lands here before the terminals below. Status sits here
 * too rather than in a runtime's own output: "deployed" (or "demo /
 * prototype") is part of what a project *is*, and it's a high-value token
 * for a reader who gives the page thirty seconds.
 *
 * Extra metadata (Rakshachakra Grammar Extraction): a doc's frontmatter can
 * carry metadata fields beyond `Status` — Cortexa's has none, so this
 * renders nothing extra for it (verified: `metadata: [Status: Deployed]` is
 * its complete list). Rakshachakra's has five more real fields
 * (Architecture, Platform, Backend, Authentication, Risk Engine) that the
 * generic doc path used to show via `MetadataRow` — since the terminal
 * grammar drops that component's sidebar-adjacent slot entirely, they move
 * here instead, as compact `label: value` lines under the status dot,
 * exactly `MetadataRow`'s own styling, not a new visual language.
 */
export function ProjectIdentityLine({
  title,
  frontmatter,
  fileName,
}: {
  title: string;
  frontmatter: DocumentationFrontmatter;
  fileName: string;
}) {
  const summary = typeof frontmatter.summary === 'string' ? frontmatter.summary : undefined;
  const entries = parseMetadataEntries(frontmatter);
  const status = entries.find((entry) => entry.label.toLowerCase() === 'status')?.value;
  const extraMetadata = entries.filter((entry) => entry.label.toLowerCase() !== 'status');

  return (
    <div className="mb-12 flex flex-col gap-3 font-mono">
      <p className="flex items-center gap-2 text-[13px]">
        <span style={{ color: ACCENT }}>$</span>
        <span style={{ color: MUTED }}>head -1 {fileName}</span>
      </p>
      {/* 15px on a wider measure rather than 17px on a narrow one: both read
          clearly larger than the 13px terminal body, but this wraps to two
          lines instead of three, which matters when the usable editor
          viewport is only ~463px tall. */}
      {(title || summary) && (
        <p className="max-w-4xl text-[15px] leading-relaxed" style={{ color: MUTED }}>
          {title && (
            <span className="font-semibold" style={{ color: '#FFFFFF' }}>
              {title}
            </span>
          )}
          {title && summary && ' — '}
          {summary}
        </p>
      )}
      {status && (
        <p className="flex items-center gap-2 text-[13px]" style={{ color: TEXT }}>
          <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: SUCCESS }} />
          {status}
        </p>
      )}
      {extraMetadata.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 pl-[15px]">
          {extraMetadata.map((entry) => (
            <p key={entry.label} className="text-[12px]">
              <span style={{ color: MUTED }}>{entry.label}: </span>
              <span style={{ color: TEXT }}>{entry.value}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
