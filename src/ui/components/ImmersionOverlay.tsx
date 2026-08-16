// Unobtrusive Full-Bleed Immersion & Observation Mode Overlay (Tab key)

import React from 'react';
import { Eye, EyeOff, Play, Pause, FastForward, Maximize2, Compass } from 'lucide-react';
import { WorldState } from '../../types/simulation';

interface ImmersionOverlayProps {
  state: WorldState;
  onExitImmersion: () => void;
  onTogglePlay: () => void;
}

export const ImmersionOverlay: React.FC<ImmersionOverlayProps> = ({
  state,
  onExitImmersion,
  onTogglePlay
}) => {
  return (
    <div className="absolute top-4 left-4 z-40 flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-700/60 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl transition-all select-none text-xs text-slate-200">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-serif font-bold text-white tracking-wide">OBSERVATION MODE</span>
      </div>

      <div className="border-l border-slate-700 pl-2 flex items-center gap-2 font-mono text-[11px]">
        <span className="text-slate-400">Year</span>
        <span className="text-sky-400 font-bold">{state.currentYear}</span>
      </div>

      <div className="border-l border-slate-700 pl-2 flex items-center gap-1">
        <button
          onClick={onTogglePlay}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          title="Toggle Simulation (Space)"
        >
          {state.isPaused ? <Play size={13} className="text-emerald-400" /> : <Pause size={13} className="text-amber-400" />}
        </button>
        <button
          onClick={onExitImmersion}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white flex items-center gap-1 text-[10px] font-mono"
          title="Exit Immersion Mode (Tab)"
        >
          <EyeOff size={13} />
          <span>Exit (Tab)</span>
        </button>
      </div>
    </div>
  );
};
