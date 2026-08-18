// Settings — only controls that actually do something.
//
// Every toggle previously in this hub (zoom/pan sensitivity, invert zoom, performance
// presets, high contrast, auto-pause, a separate reduced-motion switch) was local component
// state wired to nothing. Cosmetic controls are worse than absent controls, so they are gone
// and what remains is genuinely connected to the running application.

import React from 'react';
import { X, Eye, Sparkles, Accessibility, ShieldCheck } from 'lucide-react';
import { WorldViewMode } from '../../types/simulation';

interface SettingsModalProps {
  currentViewMode: WorldViewMode;
  onSetViewMode: (mode: WorldViewMode) => void;
  showEffects: boolean;
  onSetShowEffects: (value: boolean) => void;
  onClose: () => void;
}

const VIEWS: Array<{ id: WorldViewMode; name: string; note: string }> = [
  { id: 'GLOBE', name: 'Globe', note: 'Lit sphere with atmosphere — the default hero view' },
  { id: 'FLAT_ATLAS', name: 'Flat Atlas', note: 'Full equirectangular chart with labels' },
  { id: 'SQUARE_TILE', name: 'Square World', note: 'A bounded slab world on a table' },
  { id: 'SNOW_GLOBE', name: 'Snow Globe', note: 'The planet as a contained object' },
  { id: 'RELIEF_DIORAMA', name: 'Relief Diorama', note: 'Displaced terrain with a real sea plane' },
  { id: 'ORBITAL_VIEW', name: 'Orbital', note: 'Distant framing with moon and limb' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentViewMode,
  onSetViewMode,
  showEffects,
  onSetShowEffects,
  onClose
}) => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
      style={{ background: 'rgba(3, 5, 9, 0.78)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={onClose}
    >
      <div
        className="ws-panel w-full max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden"
        style={{ background: 'var(--ws-surface-strong)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--ws-hairline)' }}>
          <h2 className="ws-display text-[14px]" style={{ letterSpacing: '0.14em' }}>
            WORLDSEED Settings
          </h2>
          <button onClick={onClose} aria-label="Close settings" className="p-1.5 rounded-md hover:bg-white/10" style={{ color: 'var(--ws-ink-faint)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Eye size={14} style={{ color: 'var(--ws-accent)' }} />
              <h3 className="text-[12px] uppercase tracking-[0.14em]" style={{ color: 'var(--ws-ink-muted)' }}>
                Presentation
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {VIEWS.map(view => (
                <button
                  key={view.id}
                  onClick={() => onSetViewMode(view.id)}
                  aria-pressed={currentViewMode === view.id}
                  className="ws-chip text-left px-3 py-2.5"
                >
                  <span className="block text-[12.5px]" style={{ color: 'var(--ws-ink)' }}>
                    {view.name}
                  </span>
                  <span className="block text-[11px] mt-0.5" style={{ color: 'var(--ws-ink-faint)' }}>
                    {view.note}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={14} style={{ color: 'var(--ws-culture)' }} />
              <h3 className="text-[12px] uppercase tracking-[0.14em]" style={{ color: 'var(--ws-ink-muted)' }}>
                World effects
              </h3>
            </div>
            <label className="ws-chip flex items-start gap-3 px-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showEffects}
                onChange={e => onSetShowEffects(e.target.checked)}
                className="mt-0.5 accent-[#6fd0ff] w-4 h-4"
              />
              <span>
                <span className="block text-[12.5px]" style={{ color: 'var(--ws-ink)' }}>
                  Show weather and life over the map
                </span>
                <span className="block text-[11px] mt-0.5" style={{ color: 'var(--ws-ink-faint)' }}>
                  Rain, snow, dust, industrial smoke, volcanic embers and flocks are drawn from real
                  tile state — turning this off changes nothing about the simulation itself.
                </span>
              </span>
            </label>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Accessibility size={14} style={{ color: 'var(--ws-life)' }} />
              <h3 className="text-[12px] uppercase tracking-[0.14em]" style={{ color: 'var(--ws-ink-muted)' }}>
                Accessibility
              </h3>
            </div>
            <div className="ws-chip px-3 py-3 text-[11.5px] leading-relaxed" style={{ color: 'var(--ws-ink-muted)' }}>
              <p>
                Reduced motion is taken from your system preference, currently{' '}
                <strong style={{ color: 'var(--ws-ink)' }}>{prefersReducedMotion ? 'on' : 'off'}</strong>. When on, ambient
                effects, cloud drift, orbital motion and snowfall are suspended.
              </p>
              <p className="mt-2">
                The camera is fully keyboard driven: <span className="ws-numeric">W A S D</span> or the arrow keys move and
                orbit, <span className="ws-numeric">+ −</span> zoom, <span className="ws-numeric">Home</span> resets framing.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <ShieldCheck size={14} style={{ color: 'var(--ws-deep-time)' }} />
              <h3 className="text-[12px] uppercase tracking-[0.14em]" style={{ color: 'var(--ws-ink-muted)' }}>
                This build
              </h3>
            </div>
            <div className="ws-chip px-3 py-3 text-[11.5px] leading-relaxed" style={{ color: 'var(--ws-ink-muted)' }}>
              WORLDSEED runs entirely on this machine. Saves live in your browser's local database, worlds
              export as plain files, and nothing — fonts, assets, models or telemetry — is fetched from or
              sent to a network.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
