import React from 'react';
import { motion } from 'motion/react';
import type { ManifestCategory } from '../../manifest/types';
import { resolveCategoryVisual } from '../../manifest/categoryVisuals';
import { ManifestBadge } from './ManifestBadge';

export function ManifestCard({ category, index }: { category: ManifestCategory; index: number }) {
  const { icon: Icon, accentColor } = resolveCategoryVisual(category.key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className="rounded-md border border-[#3c3c3c] bg-[#252526] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} color={accentColor} className="shrink-0" />
        <h2 className="text-[13px] font-semibold text-white">{category.title}</h2>
      </div>

      <ul className="space-y-2.5">
        {category.technologies.map((tech) => (
          <li key={tech.technology} className="flex items-center justify-between gap-3">
            <span className="truncate text-[12px] text-[#cccccc]">{tech.technology}</span>
            <ManifestBadge label={tech.role} />
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
