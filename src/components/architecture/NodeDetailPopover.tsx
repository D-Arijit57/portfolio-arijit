import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { ArchitectureNode } from '../../architecture/types';
import type { CategoryStyle } from '../../architecture/categories';
import { resolveIcon } from './icons';

/**
 * Architecture Canvas 2.0: the node inspector, converted from an
 * anchored-above-node floating popover (position derived from world
 * coordinates + the pan/zoom viewport transform) to a fixed right-side
 * panel — this is also a simplification, not just a visual change: a
 * fixed panel needs no screen-position math at all, so ArchitectureCanvas.tsx
 * no longer computes one. Still purely presentational and read-only:
 * displays only fields already present on ArchitectureNode, plus
 * Inputs/Outputs derived from model.edges by the caller (no new stored
 * data). "Related Files" from the original brief's mockup is deliberately
 * omitted — no real per-node file data exists anywhere in this app (this
 * is an external project), and inventing file names would be fabrication.
 */

interface Field {
  label: string;
  value: string | string[] | undefined;
}

export function NodeDetailPopover({
  node,
  style,
  inputs,
  outputs,
  onClose,
}: {
  node: ArchitectureNode | undefined;
  style: CategoryStyle | undefined;
  inputs: string[];
  outputs: string[];
  onClose: () => void;
}) {
  const Icon = node && style ? resolveIcon(node.icon ?? style.icon) ?? resolveIcon(style.icon) : undefined;

  const fields: Field[] = node
    ? [
        { label: 'Technology', value: node.technology },
        { label: 'Purpose', value: node.description },
        { label: 'Inputs', value: inputs },
        { label: 'Outputs', value: outputs },
        { label: 'Responsibilities', value: node.responsibilities },
        { label: 'Status', value: node.status },
        { label: 'Runtime', value: node.runtime },
        { label: 'Deployment', value: node.deployment },
        { label: 'Tradeoffs', value: node.tradeoffs },
        { label: 'Documentation', value: node.documentation },
      ].filter((field) => field.value !== undefined && field.value.length > 0)
    : [];

  return (
    <AnimatePresence>
      {node && style && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute right-0 top-0 z-10 h-full w-72 overflow-y-auto border-l border-[#3c3c3c] bg-[#252526] shadow-lg"
        >
          <div className="sticky top-0 flex items-center gap-2 border-b border-[#3c3c3c] bg-[#252526] px-3 py-2">
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
            <div className="px-3 py-2 space-y-3">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
