import type { ComponentType } from 'react';
import type { VirtualFile } from '../../types';

/**
 * Visualization Registry — the seam that lets EditorRenderer stay generic
 * about which files get a specialized visualization instead of growing a
 * new hardcoded branch per renderer forever. A definition just pairs "is
 * this file mine?" with "here's the component that renders it"; nothing
 * about registration order matters since `matches` predicates are expected
 * to be mutually exclusive.
 *
 * Scope for this sprint (explicit, not an oversight): only the Knowledge
 * Graph Renderer registers here. Markdown/Mermaid/Manifest/WorkHistory/
 * Resume stay exactly as their existing hardcoded EditorRenderer branches
 * — migrating them onto this same registry is a natural follow-up once it
 * has proven itself with `skills.graph`, not part of this sprint.
 */
export interface VisualizationDefinition {
  id: string;
  matches: (file: VirtualFile) => boolean;
  component: ComponentType<{ file: VirtualFile }>;
}

const registry: VisualizationDefinition[] = [];

export function registerVisualization(definition: VisualizationDefinition): void {
  if (registry.some((d) => d.id === definition.id)) return;
  registry.push(definition);
}

export function resolveVisualization(file: VirtualFile): VisualizationDefinition | undefined {
  return registry.find((definition) => definition.matches(file));
}
