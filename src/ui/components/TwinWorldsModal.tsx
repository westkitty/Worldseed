// Twin Worlds Counterfactual Experiment & Split-Screen Comparison Modal

import React, { useState } from 'react';
import { X, GitCompare, Sparkles, ArrowRight, Play, Pause, RefreshCw } from 'lucide-react';
import { WorldConfig, WorldState } from '../../types/simulation';
import { SimulationEngine } from '../../simulation/engine';

interface TwinWorldsModalProps {
  primaryState: WorldState;
  onClose: () => void;
}

export const TwinWorldsModal: React.FC<TwinWorldsModalProps> = ({
  primaryState,
  onClose
}) => {
  const [twinType, setTwinType] = useState<'IDENTICAL_SEED_DIFFERENT_GENRE' | 'NO_EXTINCTIONS' | 'WITH_EARLY_DELUGE'>('IDENTICAL_SEED_DIFFERENT_GENRE');

  // Secondary simulation engine
  const [secondaryState, setSecondaryState] = useState<WorldState>(() => {
    const twinConfig: WorldConfig = {
      ...primaryState.config,
      genre: primaryState.config.genre === 'REALISTIC' ? 'FANTASY' : 'REALISTIC',
      manaRichness: 0.8
    };
    const engine = new SimulationEngine(twinConfig);
    engine.step(Math.min(primaryState.currentYear, 1000));
    return engine.getState();
  });

  const handleRunTwinStep = (years: number) => {
    const engine = new SimulationEngine(secondaryState.config);
    (engine as any).state = secondaryState;
    const next = engine.step(years);
    setSecondaryState({ ...next });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 border border-indigo-500/50 rounded-xl text-indigo-400">
              <GitCompare size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                Counterfactual Laboratory
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Twin-World Counterfactual Experiments
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comparison Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 gap-6 font-sans text-xs">
          {/* Prime World */}
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-sky-500/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold">
                  PRIME TIMELINE
                </span>
                <span className="font-mono text-slate-400">Year {primaryState.currentYear}</span>
              </div>
              <h3 className="font-serif font-bold text-white text-base mb-1">
                World Seed #{primaryState.config.seed} ({primaryState.config.genre || 'REALISTIC'})
              </h3>
              <p className="text-slate-400 text-xs mb-4">The authentic uninterrupted historical branch.</p>

              <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Living Species:</span>
                  <span className="text-emerald-400 font-bold">{Object.values(primaryState.species).filter(s => !s.isExtinct).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Extinctions:</span>
                  <span className="text-red-400 font-bold">{primaryState.stats.totalExtinctions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Settlements:</span>
                  <span className="text-amber-400 font-bold">{Object.values(primaryState.settlements).filter(s => !s.isAbandoned).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Biomass:</span>
                  <span className="text-white font-bold">{primaryState.stats.totalBiomass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Global Mean Temp:</span>
                  <span className="text-white font-bold">{primaryState.stats.globalAvgTemperature.toFixed(1)}°C</span>
                </div>
              </div>
            </div>
          </div>

          {/* Twin Counterfactual World */}
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-purple-500/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 font-bold">
                  COUNTERFACTUAL TWIN
                </span>
                <span className="font-mono text-slate-400">Year {secondaryState.currentYear}</span>
              </div>
              <h3 className="font-serif font-bold text-purple-200 text-base mb-1">
                World Seed #{secondaryState.config.seed} ({secondaryState.config.genre || 'FANTASY'})
              </h3>
              <p className="text-slate-400 text-xs mb-4">Simulated parallel divergence with altered genre rulesets.</p>

              <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Living Species:</span>
                  <span className="text-emerald-400 font-bold">{Object.values(secondaryState.species).filter(s => !s.isExtinct).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Extinctions:</span>
                  <span className="text-red-400 font-bold">{secondaryState.stats.totalExtinctions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Settlements:</span>
                  <span className="text-amber-400 font-bold">{Object.values(secondaryState.settlements).filter(s => !s.isAbandoned).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Biomass:</span>
                  <span className="text-white font-bold">{secondaryState.stats.totalBiomass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Global Mean Temp:</span>
                  <span className="text-white font-bold">{secondaryState.stats.globalAvgTemperature.toFixed(1)}°C</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Advance Twin Branch:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRunTwinStep(100)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold"
                >
                  +100y
                </button>
                <button
                  onClick={() => handleRunTwinStep(500)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold"
                >
                  +500y
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
