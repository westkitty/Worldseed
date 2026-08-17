import React from 'react';
import { Pause, Play, Sparkles } from 'lucide-react';
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

const SPEEDS = [1, 5, 20, 100, 1000];

export const TimelineControls: React.FC<TimelineControlsProps> = ({ state, onTogglePlay, onSetSpeed, onStepYears, onOpenWorldLab }) => {
  const { currentYear, isPaused, simulationSpeed } = state;
  return (
    <div data-testid="timeline-controls" className="absolute bottom-5 left-1/2 z-30 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/78 p-1.5 shadow-2xl backdrop-blur-2xl" aria-label="Simulation time controls">
      <div className="min-w-[104px] px-2.5 py-1 text-left">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Year</div>
        <div className="font-mono text-base font-semibold tabular-nums text-slate-50">{currentYear.toLocaleString()}</div>
      </div>
      <button type="button" onClick={onTogglePlay} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${isPaused ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300' : 'bg-amber-300 text-amber-950 hover:bg-amber-200'}`} title={isPaused ? 'Resume Time (Space)' : 'Pause Time (Space)'} aria-label={isPaused ? 'Resume Time' : 'Pause Time'} aria-pressed={!isPaused}>
        {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
      </button>
      <div className="hidden items-center gap-0.5 rounded-xl bg-white/[0.04] p-1 sm:flex" role="group" aria-label="Simulation speed">
        {SPEEDS.map(speed => (
          <button key={speed} type="button" onClick={() => onSetSpeed(speed)} className={`min-h-9 rounded-lg px-2.5 py-1.5 text-[11px] font-mono transition ${simulationSpeed === speed ? 'bg-sky-400/18 text-sky-100 ring-1 ring-inset ring-sky-300/30' : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-100'}`} aria-label={`${speed}×`} aria-pressed={simulationSpeed === speed}>{speed}×</button>
        ))}
      </div>
      <label className="sm:hidden">
        <span className="sr-only">Simulation speed</span>
        <select value={simulationSpeed} onChange={event => onSetSpeed(Number(event.target.value))} className="h-11 rounded-xl border border-white/10 bg-white/[0.05] px-2 text-[11px] font-mono text-slate-100 outline-none" aria-label="Simulation speed">
          {SPEEDS.map(speed => <option key={speed} value={speed} className="bg-slate-950">{speed}×</option>)}
        </select>
      </label>
      <button type="button" onClick={() => onStepYears(10)} className="min-h-11 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 transition hover:bg-white/[0.08] hover:text-white" title="Advance ten years">+10y</button>
      <span className="hidden h-7 w-px bg-white/10 sm:block" />
      <button type="button" onClick={onOpenWorldLab} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-violet-400/10 px-3 py-2 text-[11px] font-semibold text-violet-100 transition hover:bg-violet-400/16" title="Change the world and watch the consequences"><Sparkles size={14} /><span>WHAT IF?</span></button>
    </div>
  );
};
