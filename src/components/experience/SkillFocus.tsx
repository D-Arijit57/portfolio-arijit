import React from 'react';
import { motion } from 'motion/react';
import type { SkillFocusItem } from '../../experience/types';

/** "Skill Focus" — self-assessed weighting as progress bars, not derived from YAML text (see WorkExperience.skills's doc comment). */
export function SkillFocus({ items }: { items: SkillFocusItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h4 className="text-[13px] font-semibold text-white">Skill Focus</h4>
      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {items.map((item, i) => (
          <div key={item.label}>
            <div className="flex items-baseline justify-between text-[12.5px]">
              <span className="text-[#cccccc]">{item.label}</span>
              <span className="text-[#9d9d9d]">({item.percent}%)</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#333333]">
              <motion.div
                className="h-full rounded-full bg-[#3b82f6]"
                initial={{ width: 0 }}
                animate={{ width: `${item.percent}%` }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
