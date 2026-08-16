// Timeline Navigation, Speed Controls, and Quick Navigation Toolbar

import React from 'react';
import {
  Play, Pause, FastForward, GitFork, Sparkles, BookOpen,
  GitBranch, Languages, BarChart2, Save, Compass
} from 'lucide-react';
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
  onOpenTreeOfLife,
  onOpenChronicle,
  onOpenLanguages,
  onOpenWorldLab,
  onOpenBranchCompare,
  onOpenDiscoveries,
  onOpenStats,
  onOpenSaveLoad
}) => {
  const { currentYear, isPaused, simulationSpeed, eras, discoveries } = state;
  const currentEra = eras.length > 0 ? eras[eras.length - 1] : null;
  const uninspectedDiscoveries = discoveries.filter(d => !d.isInspected).length;

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-200 select-none shadow-2xl z-30">
      {/* 1. Time Display & Current Era */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="font-mono text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-sky-400">YEAR</span>
            <span>{currentYear.toLocaleString()}</span>
          </div>
          {currentEra && (
            <div className="text-[11px] font-sans font-medium text-amber-400 truncate max-w-[200px]">
              {currentEra.name}
            </div>
          )}
        </div>

        {/* Play/Pause & Speeds */}
        <div className="flex items-center gap-1 bg-slate-800/90 rounded-lg p-1 border border-slate-700">
          <button
            onClick={onTogglePlay}
            className={`p-2 rounded-md transition-all ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
            title={isPaused ? 'Resume Time (Spacebar)' : 'Pause Time (Spacebar)'}
            aria-label={isPaused ? 'Resume Time' : 'Pause Time'}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>

          {[1, 5, 20, 100, 1000].map(speed => (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed)}
              className={`px-2 py-1 text-xs font-mono rounded transition-all ${
                simulationSpeed === speed
                  ? 'bg-sky-600 text-white font-bold'
                  : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              {speed}×
            </button>
          ))}
        </div>

        {/* Step Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStepYears(10)}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-mono flex items-center gap-1"
            title="Step +10 Years"
          >
            +10y
          </button>
          <button
            onClick={() => onStepYears(100)}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-mono flex items-center gap-1"
            title="Step +100 Years"
          >
            +100y
          </button>
          <button
            onClick={() => onStepYears(1000)}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-mono text-amber-300 font-semibold"
            title="Epoch Leap (+1,000 Years)"
          >
            +1,000y
          </button>
        </div>
      </div>

      {/* 2. Modal Navigation Hub Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={onOpenTreeOfLife}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 text-emerald-400"
          title="Inspect Evolutionary Phylogeny"
        >
          <GitBranch size={15} />
          <span>Tree of Life</span>
        </button>

        <button
          onClick={onOpenChronicle}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 text-amber-400"
          title="Historical Chronicle of Eras"
        >
          <BookOpen size={15} />
          <span>Chronicle</span>
        </button>

        <button
          onClick={onOpenLanguages}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 text-purple-400"
          title="Language Families & Toponym Archaeology"
        >
          <Languages size={15} />
          <span>Languages</span>
        </button>

        <button
          onClick={onOpenDiscoveries}
          className="relative px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 text-rose-400"
          title="Emergent Anomalies & Surprises"
        >
          <Compass size={15} />
          <span>Discoveries</span>
          {uninspectedDiscoveries > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
              {uninspectedDiscoveries}
            </span>
          )}
        </button>

        <button
          onClick={onOpenWorldLab}
          className="px-2.5 py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-700 rounded-lg text-xs font-medium flex items-center gap-1.5 text-purple-300"
          title="World Lab: Catastrophes & Divine Interventions"
        >
          <Sparkles size={15} />
          <span>World Lab</span>
        </button>

        <button
          onClick={onOpenBranchCompare}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 text-cyan-400"
          title="Alternate History Branching & Divergence"
        >
          <GitFork size={15} />
          <span>Fork World</span>
        </button>

        <button
          onClick={onOpenStats}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 text-slate-300"
          title="Planetary Science & Metrics"
        >
          <BarChart2 size={15} />
        </button>

        <button
          onClick={onOpenSaveLoad}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 text-slate-300"
          title="Local Saves & World Export/Import"
        >
          <Save size={15} />
        </button>
      </div>
    </div>
  );
};
