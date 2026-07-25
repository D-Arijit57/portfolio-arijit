import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import type { FeatureListItem } from '../../documentation/featureList';

/**
 * Renders a detected feature list (see documentation/featureList.ts) as a
 * responsive card grid, deliberately matching ManifestCard's visual and
 * animation treatment exactly (same border/surface/shadow classes, same
 * motion timing) so the Project Documentation Viewer reads as the same
 * renderer family as the Manifest Viewer. A single consistent icon is used
 * per card — the source data has no per-item icon, so guessing one from the
 * term text would be a fabricated signal rather than a real one.
 */
export function FeatureGrid({ items }: { items: FeatureListItem[] }) {
  return (
    <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <motion.div
          key={item.term}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
          whileHover={{ y: -2 }}
          className="rounded-md border border-[#3c3c3c] bg-[#252526] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
        >
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-[#4ec9b0]" />
            <h3 className="text-[13px] font-semibold text-white">{item.term}</h3>
          </div>
          <p className="text-[12px] leading-relaxed text-[#9d9d9d]">{item.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
