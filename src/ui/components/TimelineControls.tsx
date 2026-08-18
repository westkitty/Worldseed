// Time deck — the one permanent control surface.
//
// It answers three questions at a glance: what year is it, is time moving, and how fast.
// Everything else about time (stepping, epochs) is one control away, and the deck floats
// over the world instead of walling it off behind a toolbar.

import React from 'react';
import { Play, Pause, ChevronsRight, Sparkles, Compass } from 'lucide-react';
import { WorldState } from '../../types/simulation';

interface TimelineControlsProps {
  state: WorldState;
  onTogglePlay: () => void;
  onSetSpeed: (speed: number) => void;
  onStepYears: (years: number) => void;
  onOpenWorldLab: () => void;
  onOpenDiscoveries: () => void;
}

const SPEEDS = [1, 5, 20, 100, 1000];

const formatYear = (year: number): string => {
  if (year < 10_000) return year.toLocaleString();
  if (year < 1_000_000) return `${(year / 1000).toFixed(year % 1000 === 0 ? 0 : 1)}k`;
  return `${(year / 1_000_000).toFixed(2)}M`;
};

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  state,
  onTogglePlay,
  onSetSpeed,
  onStepYears,
  onOpenWorldLab,
  onOpenDiscoveries
}) => {
  const { currentYear, isPaused, simulationSpeed, eras, discoveries } = state;
  const currentEra = eras.length > 0 ? eras[eras.length - 1] : null;
  const newDiscoveries = discoveries.filter(d => !d.isInspected).length;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3 pointer-events-none">
      <div
        data-testid="timeline-controls"
        className="ws-panel pointer-events-auto flex items-center gap-2 sm:gap-3 px-2.5 py-2 max-w-full overflow-x-auto"
      >
        {/* Clock */}
        <div
          className="flex flex-col items-start pl-1 pr-2 sm:pr-3 border-r shrink-0"
          style={{ borderColor: 'var(--ws-hairline)' }}
          role="status"
          aria-live="polite"
          aria-label={`Current year ${currentYear}`}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="ws-numeric text-lg sm:text-xl font-semibold leading-none" style={{ color: 'var(--ws-ink)' }}>
              {formatYear(currentYear)}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--ws-ink-faint)' }}>
              yr
            </span>
          </div>
          <div
            className="text-[11px] truncate max-w-[112px] sm:max-w-[190px] mt-0.5"
            style={{ color: currentEra ? 'var(--ws-culture)' : 'var(--ws-ink-faint)' }}
            title={currentEra?.name}
          >
            {currentEra?.name ?? 'Before history'}
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onTogglePlay}
            aria-label={isPaused ? 'Resume Time' : 'Pause Time'}
            title={isPaused ? 'Resume time (Space)' : 'Pause time (Space)'}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0"
            style={{
              background: isPaused ? 'var(--ws-accent)' : 'rgba(38, 50, 70, 0.94)',
              color: isPaused ? '#04202e' : 'var(--ws-ink)',
              border: `1px solid ${isPaused ? 'transparent' : 'var(--ws-hairline-strong)'}`
            }}
          >
            {isPaused ? <Play size={19} className="ml-0.5" /> : <Pause size={18} />}
          </button>

          {/* Live state in words, not only colour — the speed itself lives in the speed
              group below, so this only ever says whether time is moving. */}
          <span
            className="hidden sm:inline ws-hud-label"
            style={{ color: isPaused ? 'var(--ws-ink-faint)' : 'var(--ws-life)', letterSpacing: '0.1em' }}
          >
            {isPaused ? 'held' : 'running'}
          </span>
        </div>

        {/* Speed */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-[10px] shrink-0"
          style={{ background: 'rgba(8, 12, 20, 0.6)', border: '1px solid var(--ws-hairline)' }}
          role="group"
          aria-label="Simulation speed"
        >
          {SPEEDS.map(speed => (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed)}
              aria-pressed={simulationSpeed === speed}
              className="ws-chip ws-numeric px-2 py-1 text-[11px] rounded-md"
              style={
                simulationSpeed === speed
                  ? { background: 'rgba(111, 208, 255, 0.16)', borderColor: 'rgba(111, 208, 255, 0.55)', color: 'var(--ws-ink)' }
                  : { background: 'transparent', borderColor: 'transparent', color: 'var(--ws-ink-muted)' }
              }
            >
              {speed}×
            </button>
          ))}
        </div>

        {/* Jump */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {[
            { years: 100, label: '+100y' },
            { years: 1000, label: '+1ky' }
          ].map(step => (
            <button
              key={step.years}
              onClick={() => onStepYears(step.years)}
              className="ws-chip ws-numeric px-2.5 py-1.5 text-[11px] flex items-center gap-1"
              style={{ color: 'var(--ws-ink-muted)' }}
              title={`Advance ${step.years.toLocaleString()} years instantly`}
            >
              <ChevronsRight size={12} />
              {step.label}
            </button>
          ))}
        </div>

        {/* Curiosity paths stay adjacent to time, because consequences are what they explain. */}
        <div className="flex items-center gap-1 pl-2 sm:pl-3 border-l shrink-0" style={{ borderColor: 'var(--ws-hairline)' }}>
          <button
            onClick={onOpenWorldLab}
            className="ws-chip px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1.5"
            style={{ color: 'var(--ws-culture)' }}
            title="Intervene in the world and watch what follows"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">What if?</span>
          </button>
          <button
            onClick={onOpenDiscoveries}
            className="ws-chip relative px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1.5"
            style={{ color: newDiscoveries > 0 ? 'var(--ws-life)' : 'var(--ws-ink-muted)' }}
            title="Things the world did that nobody planned"
          >
            <Compass size={13} />
            <span className="hidden lg:inline">Discoveries</span>
            {newDiscoveries > 0 && (
              <span
                className="ws-numeric absolute -top-1.5 -right-1.5 text-[9px] px-1.5 rounded-full"
                style={{ background: 'var(--ws-life)', color: '#04241a' }}
              >
                {newDiscoveries}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
