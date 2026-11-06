import React from 'react';

// The real screenshot, if one has been dropped in src/assets as
// lattice-login.{png,webp,jpg}. Resolved at build time so a missing file is
// a placeholder, not a broken import.
const shots = import.meta.glob('../../assets/lattice-login.{png,webp,jpg,jpeg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
const SHOT = Object.values(shots)[0];

/**
 * A small framed snapshot of Lattice's login page for the hero's top-right
 * corner. Decorative (the live demo link sits beside the title), hidden on
 * narrow widths so it never crowds the identity line.
 */
export function LatticeLoginSnapshot({ href }: { href?: string }) {
  const frame = (
    <div
      className="w-[220px] overflow-hidden lg:w-[300px] rounded-md"
      style={{ border: '1px solid #333333', backgroundColor: '#0F1117', boxShadow: '0 12px 32px rgba(0,0,0,.45)' }}
    >
      <div className="flex items-center gap-[5px] px-2 py-[5px]" style={{ borderBottom: '1px solid #333333' }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <span key={c} className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: c }} />
        ))}
        <span className="ml-1 font-mono text-[9px]" style={{ color: '#858585' }}>
          /login
        </span>
      </div>
      {SHOT ? (
        <img src={SHOT} alt="Lattice login page" className="block w-full" loading="lazy" />
      ) : (
        <div className="flex h-[150px] lg:h-[190px] flex-col items-center justify-center gap-2 px-4" aria-label="Lattice login page (placeholder)">
          <div className="h-[6px] w-12 rounded-sm" style={{ backgroundColor: '#3B82F6' }} />
          <div className="h-[14px] w-full rounded-sm" style={{ backgroundColor: 'rgba(255,255,255,.08)' }} />
          <div className="h-[14px] w-full rounded-sm" style={{ backgroundColor: 'rgba(255,255,255,.08)' }} />
          <div className="h-[14px] w-full rounded-sm" style={{ backgroundColor: '#3B82F6' }} />
        </div>
      )}
    </div>
  );

  return (
    <div className="pointer-events-none absolute right-0 top-0 hidden md:block">
      <div className="pointer-events-auto lattice-snapshot-float flex flex-col items-end gap-1">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" aria-label="Open the live Lattice demo">
            {frame}
          </a>
        ) : (
          frame
        )}
        <span className="font-mono text-[10px]" style={{ color: '#6B7280' }}>
          login · live demo
        </span>
      </div>
    </div>
  );
}
