import { useEffect, useState, type RefObject } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ResumeSceneHandle, LightingPreset, SceneDiagnostics } from '../ResumeScene';

/**
 * Sprint 18 (spec §12.3): the 3D CONTROLS tab.
 *
 * Grouped, plain-language, and defaulted sensibly. Two rules from the spec
 * shape everything here:
 *
 *   - **Named presets, not raw intensity sliders.** "Studio / Soft /
 *     Contrast" are decisions someone already made well; three exposed
 *     float sliders are an invitation to produce a worse render than the
 *     default. Spec §12.3 is explicit about this.
 *   - **Every control must be safe.** No combination can produce a state
 *     the user cannot get out of (spec §12.3), nothing persists to the next
 *     session (spec §9.5), and `Restore defaults` is always present.
 *
 * This is also emphatically not a debug GUI — spec §12.4 / §13.32 forbid
 * shipping leva/tweakpane/dat.gui to production. The diagnostics readout is
 * a plain labelled list, not a control surface.
 */

const LIGHTING_OPTIONS: { id: LightingPreset; label: string }[] = [
  { id: 'soft', label: 'Soft' },
  { id: 'studio', label: 'Studio' },
  { id: 'contrast', label: 'Contrast' },
];

// 'soft' is the scale-1 identity in LIGHTING_PRESETS (ResumeScene.tsx) — the
// lighting already live before anyone opens this panel — so this default
// keeps the panel's own state honest with what the scene is actually doing.
const DEFAULTS = { lighting: 'soft' as LightingPreset, grid: true, shadow: true };

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[62px] shrink-0 font-mono text-[10px] uppercase tracking-wider text-[var(--resume-fg-faint)]">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

const CHIP =
  'rounded border px-2 py-1 text-[11px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[var(--resume-accent)]';
const CHIP_OFF = 'border-[var(--resume-rule)] text-[var(--resume-fg-muted)] hover:text-[var(--resume-fg)]';
const CHIP_ON = 'border-[var(--resume-accent)] bg-[var(--resume-accent)]/15 text-[var(--resume-fg-strong)]';

export function SceneControlsPanel({ scene }: { scene: RefObject<ResumeSceneHandle | null> }) {
  const [lighting, setLighting] = useState<LightingPreset>(DEFAULTS.lighting);
  const [grid, setGrid] = useState(DEFAULTS.grid);
  const [shadow, setShadow] = useState(DEFAULTS.shadow);
  const [diagnostics, setDiagnostics] = useState<SceneDiagnostics | null>(null);

  // Polled rather than pushed: the scene renders on demand and has no
  // steady frame loop to hang a callback on, and a 500ms readout is plenty
  // for a diagnostics panel.
  useEffect(() => {
    const id = window.setInterval(() => {
      setDiagnostics(scene.current?.getDiagnostics() ?? null);
    }, 500);
    return () => window.clearInterval(id);
  }, [scene]);

  const restoreDefaults = () => {
    setLighting(DEFAULTS.lighting);
    setGrid(DEFAULTS.grid);
    setShadow(DEFAULTS.shadow);
    scene.current?.setLightingPreset(DEFAULTS.lighting);
    scene.current?.setGridVisible(DEFAULTS.grid);
    scene.current?.setShadowVisible(DEFAULTS.shadow);
    scene.current?.resetView();
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-[var(--resume-panel-bg)]/80 px-4 py-3.5 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg flex-col gap-3">
        <Group label="View">
          <button type="button" onClick={() => scene.current?.stepZoom(1)} className={cn(CHIP, CHIP_OFF)} aria-label="Zoom in">
            <ZoomIn size={13} />
          </button>
          <button type="button" onClick={() => scene.current?.stepZoom(-1)} className={cn(CHIP, CHIP_OFF)} aria-label="Zoom out">
            <ZoomOut size={13} />
          </button>
          <span className="ml-1 text-[10.5px] text-[var(--resume-fg-faint)]">Drag the page to orbit</span>
        </Group>

        <Group label="Lighting">
          {LIGHTING_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setLighting(option.id);
                scene.current?.setLightingPreset(option.id);
              }}
              className={cn(CHIP, lighting === option.id ? CHIP_ON : CHIP_OFF)}
            >
              {option.label}
            </button>
          ))}
        </Group>

        <Group label="Scene">
          <button
            type="button"
            onClick={() => {
              setGrid(!grid);
              scene.current?.setGridVisible(!grid);
            }}
            className={cn(CHIP, grid ? CHIP_ON : CHIP_OFF)}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => {
              setShadow(!shadow);
              scene.current?.setShadowVisible(!shadow);
            }}
            className={cn(CHIP, shadow ? CHIP_ON : CHIP_OFF)}
          >
            Shadow
          </button>
        </Group>

        <Group label="Info">
          <span className="font-mono text-[10.5px] tabular-nums text-[var(--resume-fg-faint)]">
            {diagnostics
              ? `${diagnostics.fps} fps · ${diagnostics.drawCalls} calls · DPR ${diagnostics.dpr} · ${diagnostics.textureSize}`
              : '—'}
          </span>
        </Group>

        <button
          type="button"
          onClick={restoreDefaults}
          className={cn(CHIP, CHIP_OFF, 'flex w-fit items-center gap-1.5')}
        >
          <RotateCcw size={12} /> Restore defaults
        </button>
      </div>
    </div>
  );
}
