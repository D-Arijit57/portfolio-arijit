import { registerVisualization } from './registry/visualizationRegistry';
import { isGraphFile } from './fileMatch';
import { KnowledgeGraphViewer } from '../components/graph/KnowledgeGraphViewer';
import { isWorkHistoryFile } from '../experience/fileMatch';
import { ExperienceVisualizationViewer } from '../components/experience/ExperienceVisualizationViewer';

/**
 * Side-effect module: populates the Visualization Registry with the
 * built-in renderers. Imported once, for its side effect only, from
 * EditorRenderer.tsx — the one place that actually needs the registry
 * populated before first render.
 *
 * The registry's own comment anticipated this: migrating hardcoded
 * EditorRenderer branches onto it "once it has proven itself with
 * `skills.graph`". work_history.yaml is the first to make that move, which
 * is why its EditorRenderer branch is gone.
 */
registerVisualization({
  id: 'knowledge-graph',
  matches: isGraphFile,
  component: KnowledgeGraphViewer,
});

registerVisualization({
  id: 'experience-pipeline',
  matches: isWorkHistoryFile,
  component: ExperienceVisualizationViewer,
});
