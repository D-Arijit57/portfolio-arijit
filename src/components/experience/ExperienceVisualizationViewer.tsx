import React from 'react';
import { workHistory } from '../../content/workHistory';
import { PipelineVisualization } from './pipeline/PipelineVisualization';
import type { VirtualFile } from '../../types';

/**
 * The Visualization Registry's entry point for americanchase.yaml, and the
 * only place an `ExperienceVisualization`'s `type` is dispatched on.
 *
 * A second renderer (timeline, system) would add one branch here and one
 * member to the `ExperienceVisualization` union — nothing else. The union
 * is deliberately one member wide until a second dataset actually needs it;
 * building the other two renderers now would be a framework with no second
 * caller to keep it honest.
 *
 * `file` is accepted because the registry supplies it, but the data comes
 * from `workHistory` directly: the YAML the file carries is *generated*
 * from that same array (yamlRenderer.ts), so reading the array is reading
 * the source, one step earlier and without a parse.
 */
export function ExperienceVisualizationViewer({ file }: { file: VirtualFile }) {
  const experience = workHistory[0];

  if (!experience) {
    return (
      <div className="h-full w-full bg-[#1e1e1e] p-8 font-mono text-[12px] text-[#6e6e6e]">
        experiences: []
      </div>
    );
  }

  switch (experience.visualization.type) {
    case 'pipeline':
      return (
        <PipelineVisualization
          experience={experience}
          visualization={experience.visualization}
          file={file}
        />
      );
    default:
      return null;
  }
}
