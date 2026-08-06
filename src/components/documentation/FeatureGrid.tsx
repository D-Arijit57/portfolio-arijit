import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import type { FeatureListItem } from '../../documentation/featureList';

/**
 * Renders a detected feature list (see documentation/featureList.ts) as a
 * lightweight documentation block, not a product card — Documentation
 * Redesign: a single-column hairline-divided list (top/bottom rule, no
 * border-radius box, no shadow) reading like a spec sheet a real README
 * would ship, not a marketing feature grid. Hover is a subtle background
 * tint, never a lift.
 */
export function FeatureGrid({ items }: { items: FeatureListItem[] }) {
  return (
    <div className="my-4 flex flex-col divide-y divide-[#3c3c3c] border-y border-[#3c3c3c]">
      {items.map((item, index) => (
        <motion.div
          key={item.term}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          className="flex items-baseline gap-2.5 px-1 py-2.5"
        >
          <CheckCircle2 size={13} className="relative top-[1px] shrink-0 text-[#4ec9b0]" />
          <p className="min-w-0 text-[13px] leading-relaxed">
            <span className="font-semibold text-white">{item.term}</span>
            <span className="text-[#6a6a6a]"> — </span>
            <span className="text-[#9d9d9d]">{item.description}</span>
          </p>
        </motion.div>
      ))}
    </div>
  );
}
