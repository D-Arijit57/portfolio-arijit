import { registerVisualization } from './registry/visualizationRegistry';
import { isGraphFile } from './fileMatch';
import { KnowledgeGraphViewer } from '../components/graph/KnowledgeGraphViewer';

/**
 * Side-effect module: populates the Visualization Registry with the
 * built-in graph renderer. Imported once, for its side effect only, from
 * EditorRenderer.tsx — the one place that actually needs the registry
 * populated before first render.
 */
registerVisualization({
  id: 'knowledge-graph',
  matches: isGraphFile,
  component: KnowledgeGraphViewer,
});
