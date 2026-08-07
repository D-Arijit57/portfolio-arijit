import React from 'react';
import { parseMetadataEntries } from '../../documentation/metadata';
import type { DocumentationFrontmatter } from '../../documentation/types';

const ACCENT = '#38BDF8';
const TEXT = '#E5E7EB';
const MUTED = '#9CA3AF';
const SUCCESS = '#6EE7B7';

/**
 * The page's first read — deliberately `head -1`, not `cat`.
 *
 * A recruiter scans before committing, so line one of the file is present
 * and readable at 0ms with no animation, and it's the largest type on the
 * page so the eye lands here before the terminals below. Status sits here
 * too rather than in the runtime's own output: "deployed" is part of what
 * this project *is*, and it's the single highest-value token for a reader
 * who gives the page thirty seconds — burying it below the fold in the
 * execution terminal cost more than the tidiness of a strict `head -1`
 * split was worth.
 *
 * Stack and capabilities are *not* here — those are printed later by
 * run-cortexa's own `cat`, which by real shell semantics returns what this
 * command didn't. Same file, genuinely different output, so the two
 * surfaces explain rather than duplicate each other.
 */
export function CortexaIdentityLine({
  title,
  frontmatter,
  fileName,
}: {
  title: string;
  frontmatter: DocumentationFrontmatter;
  fileName: string;
}) {
  const summary = typeof frontmatter.summary === 'string' ? frontmatter.summary : undefined;
  const status = parseMetadataEntries(frontmatter).find((entry) => entry.label.toLowerCase() === 'status')?.value;

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
    </div>
  );
}
