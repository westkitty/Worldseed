// Tree of Life Phylogenetic DAG Visualizer Modal

import React, { useState } from 'react';
import { X, GitBranch, Search, Filter, Skull, Brain, Heart, ChevronRight } from 'lucide-react';
import { Species, WorldState } from '../../types/simulation';

interface TreeOfLifeModalProps {
  state: WorldState;
  onClose: () => void;
  onSelectSpecies: (speciesId: string) => void;
  onOpenWhy: (nodeId: string) => void;
}

export const TreeOfLifeModal: React.FC<TreeOfLifeModalProps> = ({
  state,
  onClose,
  onSelectSpecies,
  onOpenWhy
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LIVING' | 'EXTINCT' | 'SAPIENT' | 'DOMESTIC'>('ALL');

  const speciesList = Object.values(state.species);

  const filtered = speciesList.filter(s => {
    const matchesSearch =
      s.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.scientificName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'LIVING') return !s.isExtinct;
    if (filterType === 'EXTINCT') return s.isExtinct;
    if (filterType === 'SAPIENT') return s.isSapient;
    if (filterType === 'DOMESTIC') return s.isDomesticated || s.isFeral;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 border border-emerald-500/50 rounded-xl text-emerald-400">
              <GitBranch size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Phylogenetic Tree of Life
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Biosphere Evolutionary Record ({speciesList.length} Lineages)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Tree of Life"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-slate-800/50 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by common or binomial scientific name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 text-xs">
            {(['ALL', 'LIVING', 'EXTINCT', 'SAPIENT', 'DOMESTIC'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 rounded transition-all font-mono text-[11px] ${
                  filterType === f
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Species Lineage Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(s => (
            <div
              key={s.id}
              className={`p-4 rounded-xl border transition-all ${
                s.isExtinct
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                  : 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/60 text-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{s.iconSymbol}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white font-serif">{s.commonName}</h3>
                    <p className="text-[11px] font-mono italic text-emerald-400/90">{s.scientificName}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {s.trophicLevel}
                  </span>
                  {s.isSapient && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                      🧠 SAPIENT
                    </span>
                  )}
                  {s.isExtinct && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800">
                      EXTINCT (Yr {s.extinctionYear})
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div>Diverged: <span className="text-white">Yr {s.divergenceYear}</span></div>
                <div>Population: <span className="text-emerald-400 font-bold">{s.totalPopulation.toLocaleString()}</span></div>
                <div>Cognition: <span className="text-purple-300">{s.genome.cognition}/100</span></div>
                <div>Lifespan: <span className="text-white">{s.genome.lifespanYears}y</span></div>
              </div>

              {s.parentSpeciesId && state.species[s.parentSpeciesId] && (
                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <span>Descended from:</span>
                  <span className="text-sky-400 font-semibold">{state.species[s.parentSpeciesId].commonName}</span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/50">
                <button
                  onClick={() => onOpenWhy(s.causalNodeId)}
                  className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <Search size={12} />
                  <span>Trace Ancestry & Causes</span>
                </button>
                <button
                  onClick={() => {
                    onSelectSpecies(s.id);
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-medium"
                >
                  Inspect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
