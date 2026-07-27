import React from 'react';
import { motion } from 'motion/react';
import type { ImpactMetric } from '../../experience/types';
import { resolveDashboardIcon, ACCENT_COLORS } from './dashboardIcons';

/** "Impact at a Glance" — four compact metric cards, interpreted from the experience's highlights rather than repeating their prose. Monochrome cards; only the icon carries the accent tint. */
export function ImpactMetrics({ items }: { items: ImpactMetric[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h4 className="text-[13px] font-semibold text-white">Impact at a Glance</h4>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item, i) => {
          const Icon = resolveDashboardIcon(item.icon);
          const color = ACCENT_COLORS[item.accent];
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: 'easeOut' }}
              className="rounded-md border bg-[#1e1e1e] p-3.5"
              style={{ borderColor: `${color}55` }}
            >
              <Icon size={18} color={color} />
              <div className="mt-2.5 text-[14px] font-semibold text-white">{item.value}</div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-[#9d9d9d]">{item.label}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
