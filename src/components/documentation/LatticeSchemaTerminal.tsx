import React from 'react';
import { ProjectTerminalPanel, ACCENT, MUTED, SUCCESS, TEXT } from './ProjectTerminalPanel';
import { useStagedReveal } from './useStagedReveal';

const DIM = '#6B7280';

interface Row {
  label: string;
  value: string;
  color?: string;
}

// Each row traces to a Core Features bullet in LATTICE_DOC_MARKDOWN.
const ROWS: Row[] = [
  { label: 'declare', value: 'string · number · boolean · date', color: TEXT },
  { label: 'publish', value: 'JSON Schema v3 generated', color: ACCENT },
  { label: 'immutable', value: 'old versions never change', color: SUCCESS },
  { label: 'entries', value: 'pinned to their version', color: SUCCESS },
  { label: 'tenancy', value: 'membership checked per route', color: SUCCESS },
  { label: 'storage', value: 'JSONB · no migration', color: TEXT },
];

const CLOSING_LINE = 'a new content type needs no code change';

/** ./schema.sh — what the runtime does with a declared content type. */
export function LatticeSchemaTerminal({
  schemaRef,
  active,
  skip,
  onComplete,
}: {
  schemaRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  skip: boolean;
  onComplete?: () => void;
}) {
  const { revealed, all } = useStagedReveal({ count: ROWS.length, active, skip, nodeRef: schemaRef, onComplete });

  return (
    <div ref={schemaRef}>
      <ProjectTerminalPanel
        fileName="./schema.sh"
        dormant={!active}
        bodyPadding="p-5"
        headerExtra={
          <span className="hidden font-mono text-[11px] sm:inline" style={{ color: DIM }}>
            --constraint ↑
          </span>
        }
      >
        <div className="flex flex-col text-[13px] leading-[1.55]">
          {ROWS.map((row, index) => (
            <div
              key={row.label}
              className="flex items-baseline gap-3 py-[1px]"
              style={{
                opacity: skip || index < revealed ? 1 : 0,
                transition: skip ? 'none' : 'opacity 200ms ease-out',
              }}
            >
              <span className="w-[76px] shrink-0" style={{ color: MUTED }}>
                {row.label}
              </span>
              <span style={{ color: row.color }}>{row.value}</span>
            </div>
          ))}
          <div
            className="mt-3 text-[12px] leading-[1.4]"
            style={{ color: MUTED, opacity: all ? 1 : 0, transition: 'opacity 260ms ease-out 120ms' }}
          >
            <span style={{ color: ACCENT }}>→ </span>
            {CLOSING_LINE}
          </div>
        </div>
      </ProjectTerminalPanel>
    </div>
  );
}
