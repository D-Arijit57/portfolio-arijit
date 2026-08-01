import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, X } from 'lucide-react';
import type { PositionedGraph, PositionedNode } from '../../graph/layout/types';
import { ROOT_FILL, categoryColorForNode } from './graphVisuals';

/**
 * The Knowledge Graph's Inspector Panel — a right-side overlay showing the
 * full authored detail of whichever node is currently selected. Follows
 * the same conventions `ConstellationInfoCard` (manifest/ConstellationScene.tsx)
 * already established in this codebase — a floating card that reserves
 * its own viewport-fit space via `panelRef`, VS Code dark-theme tokens, a
 * `Field` label/value row — scaled up for the Knowledge Graph's richer
 * per-node schema (icon, description, proficiency, years, projects,
 * strengths, prerequisites, relatedNodes, tags, documentation, notes —
 * see `src/graph/types.ts`'s `GraphNode`).
 *
 * Purely data-driven and generic: every section is conditional on the
 * field actually being present on the selected node (or, for category/
 * root nodes, on structural counts the Graph Builder/Layout Engine
 * already computed — never invented copy). A future `resume.graph`/
 * `projects.graph` that populates a different subset of `GraphNode`'s
 * optional fields renders correctly here with zero changes — nothing in
 * this file references "skills" or any specific category name.
 *
 * The OUTER card (`key="inspector-panel"`) stays mounted across a
 * selection change from one node to another — only the INNER content
 * cross-fades (keyed by the selected node's own id) — so switching
 * selection never re-triggers the open/close slide, and the chrome
 * (border, background, position, size) never flickers or shifts.
 */

const PANEL_TRANSITION = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };
const CONTENT_TRANSITION = { duration: 0.15, ease: [0.4, 0, 0.2, 1] as const };

export interface InspectorPanelProps {
  panelRef: React.RefObject<HTMLDivElement | null>;
  positioned: PositionedGraph;
  selectedNode: PositionedNode | undefined;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export function InspectorPanel({ panelRef, positioned, selectedNode, onClose, onSelectNode }: InspectorPanelProps) {
  return (
    <AnimatePresence>
      {selectedNode && (
        <motion.div
          key="inspector-panel"
          ref={panelRef}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={PANEL_TRANSITION}
          className="absolute right-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-72 flex-col overflow-hidden rounded-lg border border-[#3c3c3c] bg-[#1e1e1e]/95 font-sans shadow-lg backdrop-blur-sm"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={CONTENT_TRANSITION}
              className="flex min-h-0 flex-col"
            >
              <InspectorContent positioned={positioned} node={selectedNode} onClose={onClose} onSelectNode={onSelectNode} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InspectorContent({
  positioned,
  node,
  onClose,
  onSelectNode,
}: {
  positioned: PositionedGraph;
  node: PositionedNode;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const nodeById = useMemo(() => new Map(positioned.nodes.map((n) => [n.id, n])), [positioned]);
  const color = categoryColorForNode(node) ?? ROOT_FILL;

  if (node.kind === 'root') {
    const categoryCount = positioned.nodes.filter((n) => n.kind === 'category').length;
    const leafCount = positioned.nodes.filter((n) => n.kind === 'leaf').length;
    return (
      <>
        <Header color={color} label={node.label} onClose={onClose} />
        <Body>
          {node.description && <Field label="Description" value={node.description} />}
          <Field
            label="Overview"
            value={`${categoryCount} ${categoryCount === 1 ? 'category' : 'categories'} · ${leafCount} technologies`}
          />
        </Body>
      </>
    );
  }

  if (node.kind === 'category') {
    const children = positioned.nodes.filter(
      (n): n is Extract<PositionedNode, { kind: 'leaf' }> => n.kind === 'leaf' && n.categoryKey === node.key,
    );
    return (
      <>
        <Header color={color} label={node.label} kicker="Category" onClose={onClose} />
        <Body>
          <Field label={`Technologies (${children.length})`}>
            <ChipList items={children} onSelect={onSelectNode} />
          </Field>
        </Body>
      </>
    );
  }

  // Leaf — the rich case. `node.source` is the full authored `GraphNode`.
  const source = node.source;
  const category = positioned.nodes.find((n) => n.kind === 'category' && n.key === node.categoryKey);
  const related = (source.relatedNodes ?? []).map((id) => nodeById.get(id)).filter((n): n is PositionedNode => !!n);
  const prerequisites = (source.prerequisites ?? []).map((id) => nodeById.get(id)).filter((n): n is PositionedNode => !!n);
  const hasProficiency = source.proficiencyPercent !== undefined || !!source.proficiency;

  return (
    <>
      <Header color={color} label={node.label} kicker={category?.label} badge={source.isCore ? 'Core' : undefined} onClose={onClose} />
      <Body>
        {source.description && <Field label="Description" value={source.description} />}
        {hasProficiency && (
          <Field label="Proficiency">
            <ProficiencyBar percent={source.proficiencyPercent} label={source.proficiency} color={color} />
          </Field>
        )}
        {source.years !== undefined && (
          <Field label="Experience" value={`${source.years} ${source.years === 1 ? 'year' : 'years'}`} />
        )}
        {source.projects && source.projects.length > 0 && <Field label="Projects" value={source.projects} />}
        {source.strengths && source.strengths.length > 0 && <Field label="Strengths" value={source.strengths} />}
        {prerequisites.length > 0 && (
          <Field label="Prerequisites">
            <ChipList items={prerequisites} onSelect={onSelectNode} />
          </Field>
        )}
        {related.length > 0 && (
          <Field label="Related">
            <ChipList items={related} onSelect={onSelectNode} />
          </Field>
        )}
        {source.tags && source.tags.length > 0 && (
          <Field label="Tags">
            <TagList tags={source.tags} />
          </Field>
        )}
        {source.notes && <Field label="Notes" value={source.notes} />}
        {source.documentation && (
          <Field label="Documentation">
            <a
              href={source.documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#007acc] hover:underline"
            >
              View documentation
              <ExternalLink size={11} />
            </a>
          </Field>
        )}
      </Body>
    </>
  );
}

function Header({
  color,
  label,
  kicker,
  badge,
  onClose,
}: {
  color: string;
  label: string;
  kicker?: string;
  badge?: string;
  onClose: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 shrink-0 border-b border-[#3c3c3c] bg-[#1e1e1e]/95 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          {kicker && <div className="truncate text-[10px] uppercase tracking-wide text-[#858585]">{kicker}</div>}
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-white">{label}</span>
            {badge && (
              <span className="shrink-0 rounded border border-[#3fb950]/30 bg-[#3fb950]/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#3fb950]">
                {badge}
              </span>
            )}
          </div>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-[#858585] hover:text-white" aria-label="Close inspector">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">{children}</div>;
}

function Field({ label, value, children }: { label: string; value?: string | string[]; children?: ReactNode }) {
  if (children) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wide text-[#858585]">{label}</div>
        <div className="mt-1">{children}</div>
      </div>
    );
  }
  if (!value || value.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[#858585]">{label}</div>
      {Array.isArray(value) ? (
        <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-[#cccccc]">
          {value.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-0.5 text-[11px] leading-relaxed text-[#cccccc]">{value}</div>
      )}
    </div>
  );
}

function ChipList({ items, onSelect }: { items: { id: string; label: string }[]; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className="rounded border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-0.5 text-[10.5px] text-[#cccccc] transition-colors hover:border-[#5a5a5a] hover:bg-[#37373d]"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className="rounded-full border border-[#3c3c3c] bg-[#2d2d2d] px-2 py-0.5 text-[10px] text-[#9d9d9d]">
          {tag}
        </span>
      ))}
    </div>
  );
}

function ProficiencyBar({ percent, label, color }: { percent?: number; label?: string; color: string }) {
  const clamped = percent !== undefined ? Math.max(0, Math.min(100, percent)) : undefined;
  const capitalizedLabel = label ? label.charAt(0).toUpperCase() + label.slice(1) : undefined;
  return (
    <div className="space-y-1">
      {clamped !== undefined && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2d2d2d]">
          <div className="h-full rounded-full" style={{ width: `${clamped}%`, backgroundColor: color }} />
        </div>
      )}
      {(clamped !== undefined || capitalizedLabel) && (
        <div className="text-[11px] text-[#cccccc]">
          {clamped !== undefined ? `${clamped}%` : ''}
          {clamped !== undefined && capitalizedLabel ? ' · ' : ''}
          {capitalizedLabel ?? ''}
        </div>
      )}
    </div>
  );
}
