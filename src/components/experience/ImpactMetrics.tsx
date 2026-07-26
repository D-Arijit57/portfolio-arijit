import React from 'react';
import { motion } from 'motion/react';
import type { ImpactMetric } from '../../experience/types';
import { resolveDashboardIcon, ACCENT_COLORS } from './dashboardIcons';

/** "IMPACT AT A GLANCE" — four scannable metric cards, interpreted from the experience's highlights rather than repeating their prose. */
export function ImpactMetrics({ items }: { items: ImpactMetric[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#858585]">Impact at a Glance</h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item, i) => {
          const Icon = resolveDashboardIcon(item.icon);
          const color = ACCENT_COLORS[item.accent];
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: 'easeOut' }}
              whileHover={{ y: -2 }}
              className="rounded-md border p-4 text-center"
              style={{ borderColor: `${color}40`, backgroundColor: `${color}0d` }}
            >
              <Icon size={20} className="mx-auto" color={color} />
              <div className="mt-2 text-[16px] font-semibold" style={{ color }}>
                {item.value}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[#9d9d9d]">{item.label}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
