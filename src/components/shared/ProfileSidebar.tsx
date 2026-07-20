import React, { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { ProfileStatusCard } from './ProfileStatusCard';
import { GitHubContributionGraph } from './GitHubContributionGraph';

const GITHUB_LINK_PATTERN = /GitHub: \[@[\w-]+\]\((https:\/\/[^)]+)\)/;

/**
 * The right column's single visual anchor for profile.md — availability card,
 * live GitHub contributions, and a link to the full profile, grouped as one
 * cohesive rail (one `float-right`) rather than several disconnected floats.
 * Float, not CSS Grid: a spanning grid item sharing rows with small,
 * variable-height text (h1/p/ul/blockquote) produces unpredictable row-track
 * sizing — float is the standard, predictable mechanism for "one taller
 * element on one side, flowing content wraps its full height." Composed
 * here (not baked into EditorRenderer) so it stays a self-contained,
 * reusable unit — the same "should be reusable" requirement the heatmap
 * itself already follows. Reads the already-hydrated `github:profile` file
 * for the link, same zero-new-fetch pattern as the other widgets.
 */
export function ProfileSidebar() {
  const profileFile = useStore((state) => state.workspaceFiles.find((f) => f.id === 'github:profile'));

  const profileUrl = useMemo(() => {
    if (!profileFile) return null;
    return profileFile.content.match(GITHUB_LINK_PATTERN)?.[1] ?? null;
  }, [profileFile]);

  return (
    <div className="float-right ml-8 mb-6 w-[380px] max-w-full flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#858585]">Availability</h3>
        <ProfileStatusCard />
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#858585]">GitHub Contributions</h3>
        <GitHubContributionGraph />
        {profileUrl && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[12px] text-[#007acc] hover:underline"
          >
            View full GitHub profile →
          </a>
        )}
      </section>
    </div>
  );
}
