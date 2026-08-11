import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, FileJson, Download } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../store/useStore';
import { CLAIMS, REFERENCE_COUNT, type Claim, type EvidenceReference } from './claims';

/** Matches the active-claim green used on the left pane (TerminalWindowSvg) —
 * the two sides have to agree or the link stops reading as one relationship. */
const ACTIVE = '#4CD964';

/** Explorer.tsx's own icon-per-type mapping, reduced to the three types this
 * rail can actually reference. Same hues, so a file looks the same here as it
 * does in the tree. `.explore` reuses the constellation blue. */
function ReferenceIcon({ fileName }: { fileName: string }) {
  if (fileName.endsWith('.yaml')) return <FileJson size={13} className="shrink-0 text-[#cb3837]" />;
  if (fileName.endsWith('.mmd')) return <FileText size={13} className="shrink-0 text-[#ff3670]" />;
  if (fileName.endsWith('.explore')) return <FileText size={13} className="shrink-0 text-[#569cd6]" />;
  return <FileText size={13} className="shrink-0 text-[#519aba]" />;
}

/**
 * hire_me.md's right pane at rest: the five claims from the Hiring Evaluation,
 * each with the workspace files that back it.
 *
 * This is a list, not a visualization. The relationship it describes is small
 * and fully authored (five claims, seven references — see claims.ts), so it is
 * rendered as a list of files you can open, in the workspace's own Explorer
 * grammar, rather than as a graph the visitor has to interpret. The only
 * interactive idea is the link: hovering or focusing anything here raises the
 * matching claim on the left, and vice versa.
 *
 * Collapsed groups still show their first reference as a single condensed line,
 * so the pane never degenerates into five opaque headers — evidence stays
 * visible at rest, which is the whole point of the surface.
 */
export function EvidenceRail({
  claimLabels,
  activeClaimId,
  onActiveClaimChange,
  registerAnchor,
  onDownloadPdf,
  downloadLabel,
}: {
  /** Claim text read out of HIRE_ME_REPORT itself (see ResumeWorkspace) — the
   * rail never stores its own copy of those five sentences. */
  claimLabels: Map<string, string>;
  activeClaimId: string | null;
  onActiveClaimChange: (claimId: string | null) => void;
  registerAnchor?: (claimId: string, el: HTMLElement | null) => void;
  onDownloadPdf: () => void;
  downloadLabel: string;
}) {
  // Claim 1 starts open so the pane demonstrates what a reference looks like
  // without requiring a click; the rest are collapsed to keep all five claims
  // visible at once, which is what makes the list scannable.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([CLAIMS[0].id]));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1e1e1e]">
      <div className="shrink-0 px-4 py-2.5 font-mono text-[11px] text-[#858585]">
        {CLAIMS.length} claims · {REFERENCE_COUNT} references
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {CLAIMS.map((claim) => (
          <ClaimGroup
            key={claim.id}
            claim={claim}
            label={claimLabels.get(claim.id) ?? ''}
            isActive={activeClaimId === claim.id}
            isExpanded={expanded.has(claim.id)}
            onToggle={() => toggle(claim.id)}
            onActiveClaimChange={onActiveClaimChange}
            registerAnchor={registerAnchor}
          />
        ))}
      </div>

      {/* The pane's one primary action, pinned so it survives any scroll
          position. A plain row, not a filled accent button — the old indigo
          CTA was the loudest thing in this pane and it was never the point. */}
      <div className="shrink-0 border-t border-[#333333] px-4 py-2.5">
        <button
          type="button"
          onClick={onDownloadPdf}
          className="flex items-center gap-2 font-mono text-[12px] text-[#569cd6] outline-none hover:underline focus-visible:ring-1 focus-visible:ring-[#569cd6]"
        >
          <Download size={13} className="shrink-0" />
          {downloadLabel}
        </button>
      </div>
    </div>
  );
}

function ClaimGroup({
  claim,
  label,
  isActive,
  isExpanded,
  onToggle,
  onActiveClaimChange,
  registerAnchor,
}: {
  claim: Claim;
  label: string;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onActiveClaimChange: (claimId: string | null) => void;
  registerAnchor?: (claimId: string, el: HTMLElement | null) => void;
}) {
  const headingId = `claim-${claim.id}`;
  const link = {
    onMouseEnter: () => onActiveClaimChange(claim.id),
    onMouseLeave: () => onActiveClaimChange(null),
    onFocus: () => onActiveClaimChange(claim.id),
    onBlur: () => onActiveClaimChange(null),
  };

  return (
    <div className="relative mb-2 pl-4">
      {/* The connector's anchor on this side: one dot per claim, in that
          claim's colour, seated on the card's leading edge. A real measured
          element rather than a background image, because the line has to end
          somewhere specific. */}
      <span
        aria-hidden="true"
        ref={(el) => registerAnchor?.(claim.id, el)}
        className="absolute left-0 top-[15px] h-[7px] w-[7px] rounded-full transition-opacity duration-150"
        style={{ backgroundColor: claim.color, opacity: isActive ? 1 : 0.45 }}
      />

      {/* A bordered card per claim — the mockup's structure, in the editor's
          own greys. The border carries the claim colour only while active, so
          five cards at rest read as one quiet list rather than five competing
          panels. */}
      <div
        className="rounded-md border transition-colors duration-150"
        style={{
          borderColor: isActive ? claim.color : '#333333',
          backgroundColor: isActive ? '#252526' : 'transparent',
        }}
      >
        <button
          type="button"
          id={headingId}
          onClick={onToggle}
          aria-expanded={isExpanded}
          {...link}
          className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-inset"
          style={{ ['--tw-ring-color' as string]: claim.color }}
        >
          {isExpanded ? (
            <ChevronDown size={13} className="shrink-0 text-[#858585]" />
          ) : (
            <ChevronRight size={13} className="shrink-0 text-[#858585]" />
          )}
          <span
            className="min-w-0 flex-1 font-mono text-[12px] leading-snug transition-colors duration-150"
            style={{ color: isActive ? claim.color : '#cccccc' }}
          >
            {label}
          </span>
          <span className="shrink-0 rounded border border-[#3c3c3c] px-1.5 font-mono text-[10px] text-[#858585]">
            {claim.references.length}
          </span>
        </button>

        {/* References stay visible whether or not the group is expanded — a
            rail whose evidence is hidden behind five chevrons answers nothing
            at rest. Collapsing drops the description and keeps the file and
            its locator, which is the part that names where to look. */}
        <ul aria-labelledby={headingId} className="space-y-0.5 px-1.5 pb-1.5">
          {claim.references.map((reference) => (
            <ReferenceRow
              key={reference.fileId}
              reference={reference}
              color={claim.color}
              showDescription={isExpanded}
              link={link}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReferenceRow({
  reference,
  color,
  showDescription,
  link,
}: {
  reference: EvidenceReference;
  color: string;
  showDescription: boolean;
  link: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}) {
  // The existing workspace navigation, unchanged — the same action an Explorer
  // click performs, so a reference behaves like every other way of opening a
  // file here (tab, breadcrumb, router URL all follow from it).
  const openFile = useStore((state) => state.openFile);

  return (
    <li>
      <button
        type="button"
        onClick={() => openFile(reference.fileId)}
        {...link}
        className="w-full rounded-sm px-2 py-1 text-left outline-none transition-colors hover:bg-[#2a2d2e] focus-visible:ring-1 focus-visible:ring-[#569cd6]"
      >
        <span className="flex items-center gap-1.5">
          <ReferenceIcon fileName={reference.fileName} />
          <span className="truncate font-mono text-[12px] text-[#cccccc]">{reference.fileName}</span>
        </span>
        {reference.locator && (
          <span className="mt-0.5 block pl-[19px] font-mono text-[11px]" style={{ color }}>
            {reference.locator}
          </span>
        )}
        {showDescription && reference.description && (
          <span className="mt-0.5 block pl-[19px] font-mono text-[11px] leading-snug text-[#858585]">
            {reference.description}
          </span>
        )}
      </button>
    </li>
  );
}

