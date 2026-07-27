import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, MapPin } from 'lucide-react';
import type { WorkExperience } from '../../experience/types';
import americanChaseLogo from '../../assets/logos/american-chase.svg';

/**
 * Company name -> official logo asset, the same "no guessing, real official
 * mark or a graceful generic fallback" contract src/documentation/techLogos.ts
 * uses for technologies. Only a company whose actual logo has been sourced
 * gets an entry (American Chase's own navbar wordmark, fetched directly from
 * americanchase.com) — anything else falls back to a plain text company name
 * rather than a placeholder or fabricated mark.
 */
const COMPANY_LOGOS: Record<string, string> = {
  'american chase': americanChaseLogo,
};

function resolveCompanyLogo(company: string): string | undefined {
  return COMPANY_LOGOS[company.trim().toLowerCase()];
}

/**
 * The experience card's header content only — logo, name, role, location,
 * external link, tech pills. Deliberately not its own bordered card
 * anymore: CareerRoadmap.tsx wraps this together with ImpactMetrics and
 * SkillFocus inside one shared card, so the whole experience reads as a
 * single component instead of several stacked boxes.
 */
export function ExperienceCard({ experience, index }: { experience: WorkExperience; index: number }) {
  const logo = resolveCompanyLogo(experience.company);

  return (
    <div className="relative w-full">
      <a
        href={experience.companyUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${experience.company}'s website`}
        className="absolute right-0 top-0 rounded p-1 text-[#858585] transition-colors hover:bg-[#2a2d2e] hover:text-[#cccccc]"
      >
        <ExternalLink size={15} />
      </a>

      <div className="flex items-start gap-3 pr-8">
        {logo && (
          <img
            src={logo}
            alt={`${experience.company} logo`}
            className="mt-0.5 h-8 w-auto shrink-0 max-w-[140px] object-contain"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold leading-tight text-white">{experience.company}</h3>
          <div className="mt-1 text-[13px] font-medium text-[#4fc1ff]">{experience.role}</div>
          <div className="mt-1 flex items-center gap-1 text-[12px] text-[#9d9d9d]">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{experience.location}</span>
          </div>
        </div>
      </div>

      {experience.tech.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {experience.tech.map((tech, i) => (
            <motion.span
              key={tech}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.06 + 0.15 + i * 0.03 }}
              className="rounded-full border border-[#3c3c3c] bg-[#2d2d2d] px-2.5 py-1 text-[11px] text-[#cccccc]"
            >
              {tech}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}
