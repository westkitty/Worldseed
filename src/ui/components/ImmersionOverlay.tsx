import React from 'react';
import { EyeOff, Pause, Play } from 'lucide-react';
import { WorldState } from '../../types/simulation';

interface ImmersionOverlayProps {
  state: WorldState;
  onExitImmersion: () => void;
  onTogglePlay: () => void;
}

export const ImmersionOverlay: React.FC<ImmersionOverlayProps> = ({ state, onExitImmersion, onTogglePlay }) => (
  <div className="absolute left-4 top-4 z-40 flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/72 px-3 py-2 text-xs text-slate-200 shadow-2xl backdrop-blur-md transition hover:bg-slate-900/92">
    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="font-serif font-bold tracking-wide text-white">OBSERVATION MODE</span></div>
    <div className="flex items-center gap-2 border-l border-slate-700 pl-3 font-mono text-[11px]"><span className="text-slate-400">Year</span><span className="font-bold text-sky-300">{state.currentYear.toLocaleString()}</span></div>
    <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
      <button onClick={onTogglePlay} className="grid h-10 w-10 place-items-center rounded-xl text-slate-200 hover:bg-slate-800" title="Toggle Simulation (Space)" aria-label={state.isPaused ? 'Resume Time' : 'Pause Time'}>
        {state.isPaused ? <Play size={15} className="text-emerald-300" /> : <Pause size={15} className="text-amber-300" />}
      </button>
      <button onClick={onExitImmersion} className="flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[11px] font-mono text-slate-300 hover:bg-slate-800 hover:text-white" title="Exit Immersion Mode">
        <EyeOff size={14} /><span>Exit</span>
      </button>
    </div>
  </div>
);
