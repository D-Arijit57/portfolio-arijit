import type { ArchitectureCategory, ArchitectureModel } from '../types';

/**
 * Mermaid Renderer (ARCHITECTURE_PLATFORM_DESIGN.md §6.1) — the first
 * renderer. Pure function: ArchitectureModel in, Mermaid text out. Never
 * imports React and has no side effects; the Mermaid renderer knows nothing
 * about any other renderer.
 *
 * Node shape is derived from category, not stored per-node — this is what
 * keeps shape choice generic across every project rather than a per-node
 * authoring decision.
 */
const shapeByCategory: Record<ArchitectureCategory, (id: string, title: string) => string> = {
  client: (id, title) => `${id}[${title}]`,
  frontend: (id, title) => `${id}[${title}]`,
  backend: (id, title) => `${id}[${title}]`,
  ai: (id, title) => `${id}[${title}]`,
  auth: (id, title) => `${id}[${title}]`,
  messaging: (id, title) => `${id}[${title}]`,
  external: (id, title) => `${id}[[${title}]]`,
  gateway: (id, title) => `${id}(${title})`,
  infrastructure: (id, title) => `${id}(${title})`,
  queue: (id, title) => `${id}([${title}])`,
  database: (id, title) => `${id}[(${title})]`,
  storage: (id, title) => `${id}[(${title})]`,
};

export function modelToMermaid(model: ArchitectureModel): string {
  const lines: string[] = ['graph TD'];

  for (const node of model.nodes) {
    lines.push(`    ${shapeByCategory[node.category](node.id, node.title)}`);
  }

  for (const edge of model.edges) {
    const arrow = edge.label ? `-->|${edge.label}|` : '-->';
    lines.push(`    ${edge.from} ${arrow} ${edge.to}`);
  }

  return `${lines.join('\n')}\n`;
}
