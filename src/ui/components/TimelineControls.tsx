import React from 'react';
import { Pause, Play, Search, Sparkles } from 'lucide-react';
import { WorldState } from '../../types/simulation';

interface TimelineControlsProps {
  state: WorldState;
  onTogglePlay: () => void;
  onSetSpeed: (speed: number) => void;
  onStepYears: (years: number) => void;
  onOpenWhy: () => void;
  onOpenTreeOfLife: () => void;
  onOpenChronicle: () => void;
  onOpenLanguages: () => void;
  onOpenWorldLab: () => void;
  onOpenBranchCompare: () => void;
  onOpenDiscoveries: () => void;
  onOpenStats: () => void;
  onOpenSaveLoad: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  state,
  onTogglePlay,
  onSetSpeed,
  onStepYears,
  onOpenWhy,
  onOpenWorldLab
}) => {
  const { currentYear, isPaused, simulationSpeed } = state;

  return (
    <div
      data-testid="timeline-controls"
      className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/72 p-1.5 shadow-2xl backdrop-blur-2xl"
    >
      <div className="min-w-[108px] px-2.5 py-1 text-left">
        <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">Year</div>
        <div className="font-mono text-sm font-semibold tabular-nums text-slate-100">{currentYear.toLocaleString()}</div>
      </div>

      <button
        type="button"
        onClick={onTogglePlay}
        className={`grid h-10 w-10 place-items-center rounded-xl transition ${isPaused ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300' : 'bg-amber-300 text-amber-950 hover:bg-amber-200'}`}
        title={isPaused ? 'Resume Time (Space)' : 'Pause Time (Space)'}
        aria-label={isPaused ? 'Resume Time' : 'Pause Time'}
      >
        {isPaused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}
      </button>

      <div className="hidden items-center gap-0.5 rounded-xl bg-white/[0.035] p-1 sm:flex">
        {[1, 5, 20, 100, 1000].map(speed => (
          <button
            key={speed}
            type="button"
            onClick={() => onSetSpeed(speed)}
            className={`rounded-lg px-2 py-1.5 text-[10px] font-mono transition ${simulationSpeed === speed ? 'bg-sky-400/18 text-sky-200 ring-1 ring-inset ring-sky-300/25' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-200'}`}
            aria-label={`${speed}×`}
          >
            {speed}×
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onStepYears(10)}
        className="rounded-xl px-2.5 py-2 text-[10px] font-mono text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
        title="Advance ten years"
      >
        +10y
      </button>

      <span className="h-6 w-px bg-white/10" />

      <button
        type="button"
        onClick={onOpenWhy}
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-semibold text-sky-200 transition hover:bg-sky-400/10"
        title="Ask why the selected thing exists"
      >
        <Search size={13} />
        WHY?
      </button>

      <button
        type="button"
        onClick={onOpenWorldLab}
        className="flex items-center gap-1.5 rounded-xl bg-violet-400/10 px-2.5 py-2 text-[10px] font-semibold text-violet-200 transition hover:bg-violet-400/16"
        title="Change the world and watch the consequences"
      >
        <Sparkles size={13} />
        WHAT IF?
      </button>
    </div>
  );
};
