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

export function resolveCompanyLogo(company: string): string | undefined {
  return COMPANY_LOGOS[company.trim().toLowerCase()];
}
