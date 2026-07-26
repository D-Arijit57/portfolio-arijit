import React from 'react';
import { motion } from 'motion/react';
import type { SkillFocusItem } from '../../experience/types';

/** "SKILL FOCUS" — self-assessed weighting as progress bars, not derived from YAML text (see WorkExperience.skills's doc comment). */
export function SkillFocus({ items }: { items: SkillFocusItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#858585]">Skill Focus</h4>
      <div className="space-y-3.5">
        {items.map((item, i) => (
          <div key={item.label} className="flex max-w-md items-center gap-3">
            <span className="w-[130px] shrink-0 truncate text-[12px] text-[#cccccc]">{item.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#333333]">
              <motion.div
                className="h-full rounded-full bg-[#3b82f6]"
                initial={{ width: 0 }}
                animate={{ width: `${item.percent}%` }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[12px] text-[#9d9d9d]">{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
