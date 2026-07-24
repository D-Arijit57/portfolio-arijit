import React from 'react';
import { X } from 'lucide-react';
import type { ArchitectureNode } from '../../architecture/types';
import type { CategoryStyle } from '../../architecture/categories';
import { resolveIcon } from './icons';

/**
 * Read-only contextual popover for a selected node
 * (ARCHITECTURE_PLATFORM_DESIGN.md Phase 3). Displays only fields already
 * present on ArchitectureNode — no new metadata, no editing, no navigation.
 * Purely presentational: it receives a screen position and renders there,
 * it never computes layout or interaction state itself.
 */

interface Field {
  label: string;
  value: string | string[] | undefined;
}

export function NodeDetailPopover({
  node,
  style,
  screenPosition,
  onClose,
}: {
  node: ArchitectureNode;
  style: CategoryStyle;
  screenPosition: { left: number; top: number };
  onClose: () => void;
}) {
  const Icon = resolveIcon(node.icon ?? style.icon) ?? resolveIcon(style.icon);

  const fields: Field[] = [
    { label: 'Technology', value: node.technology },
    { label: 'Status', value: node.status },
    { label: 'Description', value: node.description },
    { label: 'Responsibilities', value: node.responsibilities },
    { label: 'Dependencies', value: node.dependencies },
    { label: 'Runtime', value: node.runtime },
    { label: 'Deployment', value: node.deployment },
    { label: 'Tradeoffs', value: node.tradeoffs },
    { label: 'Documentation', value: node.documentation },
  ].filter((field) => field.value !== undefined && field.value.length > 0);

  return (
    <div
      className="absolute z-10 w-72 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border border-[#3c3c3c] bg-[#252526] shadow-lg"
      style={{ left: screenPosition.left, top: screenPosition.top }}
    >
      <div className="flex items-center gap-2 border-b border-[#3c3c3c] px-3 py-2">
        {Icon && <Icon size={14} color={style.accentColor} className="shrink-0" />}
        <span className="flex-1 truncate text-[12px] font-medium text-white">{node.title}</span>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
          style={{ color: style.accentColor, backgroundColor: `${style.accentColor}22` }}
        >
          {node.category}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-[#858585] hover:text-white"
          aria-label="Close"
        >
          <X size={13} />
        </button>
      </div>

      {fields.length > 0 && (
        <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-2">
          {fields.map((field) => (
            <div key={field.label}>
              <div className="text-[10px] uppercase tracking-wide text-[#858585]">{field.label}</div>
              {Array.isArray(field.value) ? (
                <ul className="mt-0.5 list-disc pl-4 text-[11px] text-[#cccccc]">
                  {field.value.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-0.5 text-[11px] text-[#cccccc]">{field.value}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
