import React, { Fragment, useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock, Building2, Sparkles } from 'lucide-react';
import type { WorkExperience } from '../../experience/types';
import { ExperienceCard } from './ExperienceCard';
import { ImpactMetrics } from './ImpactMetrics';
import { SkillFocus } from './SkillFocus';

function parseMonth(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

/**
 * Every stat is derived from `experiences` — nothing here is hardcoded to
 * "1 company" or "4 impact areas", so a second experience (the brief's
 * "should support multiple in the future") extends every number
 * automatically with no renderer change.
 */
function computeStats(experiences: WorkExperience[]) {
  if (experiences.length === 0) return { years: 0, companies: 0, impactAreas: 0 };

  const starts = experiences.map((e) => parseMonth(e.startDate).getTime());
  const ends = experiences.map((e) => (e.endDate === 'Present' ? Date.now() : parseMonth(e.endDate).getTime()));
  const years = Math.max(0, Math.floor((Math.max(...ends) - Math.min(...starts)) / (365.25 * 24 * 60 * 60 * 1000)));
  const companies = new Set(experiences.map((e) => e.company)).size;
  const impactAreas = experiences.reduce((sum, e) => sum + e.highlights.length, 0);

  return { years, companies, impactAreas };
}

export function CareerRoadmap({ experiences }: { experiences: WorkExperience[] }) {
  const stats = useMemo(() => computeStats(experiences), [experiences]);

  const statItems = [
    { icon: Clock, label: `${stats.years}+ Years of Experience` },
    { icon: Building2, label: `${stats.companies} ${stats.companies === 1 ? 'Company' : 'Companies'}` },
    { icon: Sparkles, label: `${stats.impactAreas} Impact Areas` },
  ];

  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-2xl font-semibold text-white">Career Roadmap</h2>
      <p className="mt-1.5 text-[13px] text-[#9d9d9d]">A timeline of my professional journey and impact.</p>

      {experiences.length === 0 ? (
        <p className="mt-8 text-[13px] text-[#858585]">No experience data to display.</p>
      ) : (
        <div className="relative mt-8">
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ transformOrigin: 'top' }}
            className="absolute bottom-1.5 left-[5px] top-1.5 w-[2px] bg-[#3c3c3c]"
          />

          <div className="space-y-8">
            {experiences.map((exp, index) => {
              const isCurrent = exp.endDate === 'Present';
              return (
                <div key={`${exp.company}-${exp.startDate}`} className="relative pl-8">
                  <span
                    className={
                      isCurrent
                        ? 'absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-[#007acc] bg-[#007acc]'
                        : 'absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-[#3c3c3c] bg-[#1e1e1e]'
                    }
                  />
                  <div className="mb-3 text-[12px] font-medium text-[#858585]">
                    {exp.startDate} — {exp.endDate}
                  </div>
                  <ExperienceCard experience={exp} index={index} />

                  {exp.impact && <ImpactMetrics items={exp.impact} />}

                  {exp.skills && <SkillFocus items={exp.skills} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-[#3c3c3c] pt-5 text-[12px] text-[#9d9d9d]">
        {statItems.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && <span className="px-2 text-[#4a4a4a]">•</span>}
            <span className="flex items-center gap-1.5">
              <item.icon size={13} className="text-[#858585]" />
              {item.label}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
