/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { VSCodeShell } from './components/shell/VSCodeShell';
import { WorkspaceColdStart } from './components/shell/WorkspaceColdStart';
import { BootErrorScreen } from './components/shell/BootErrorScreen';
import { shouldRunWorkspaceBoot } from './lib/onboardingScope';
import { useStore } from './store/useStore';

export default function App() {
  const { vfsLoaded, vfsError, hydrateVFS } = useStore();
  // Phase 7C: resolved once, in a lazy initializer. Starts already-done for
  // every case that gets no boot — deep links, prefers-reduced-motion, and a
  // sequence that already played (see shouldRunWorkspaceBoot) — so those go
  // straight to the shell with no surface mounted and no delay at all.
  const [bootDone, setBootDone] = useState(() => !shouldRunWorkspaceBoot());
  // The one readiness cue. Lives here rather than inside the boot surface
  // because that surface unmounts the instant the shell takes over, which
  // would destroy the region before a screen reader could read it.
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    hydrateVFS();
  }, [hydrateVFS]);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    // Only ever reached when a boot genuinely ran, so a deep link or a
    // reduced-motion load stays silent instead of announcing a sequence the
    // visitor never saw.
    setAnnouncement('Workspace ready.');
  }, []);

  const content = (() => {
    if (vfsError !== null) {
      return <BootErrorScreen message={vfsError} />;
    }

    // Both gates must clear. The boot (~1.7s) is comfortably longer than
    // hydration in practice, so it is normally what governs; hydration is
    // kicked off in the effect above and never waits on it either way.
    if (!vfsLoaded || !bootDone) {
      // No boot to show (or it already finished) while hydration is still in
      // flight: hold the same plain black rather than flashing anything new.
      if (bootDone) {
        return <div aria-hidden="true" className="h-screen w-screen bg-black" />;
      }
      return <WorkspaceColdStart onComplete={handleBootComplete} />;
    }

    return <VSCodeShell />;
  })();

  return (
    <>
      {/* Rendered on every screen from the very first paint, so the region is
          already in the accessibility tree before its text ever changes — and
          it outlives the cold-start → shell swap. WelcomeIntro keeps its own
          distinct "Welcome message loaded." cue; these two say different
          things, fire once each, and are seconds apart. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {content}
    </>
  );
}
