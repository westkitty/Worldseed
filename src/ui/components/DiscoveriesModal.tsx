// Emergent Discoveries & Anomalies Ledger Modal

import React from 'react';
import { X, Compass, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { Discovery, WorldState } from '../../types/simulation';

interface DiscoveriesModalProps {
  state: WorldState;
  onClose: () => void;
  onSelectCoordinates?: (x: number, y: number) => void;
}

export const DiscoveriesModal: React.FC<DiscoveriesModalProps> = ({
  state,
  onClose,
  onSelectCoordinates
}) => {
  const { discoveries } = state;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-950/60 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600/30 border border-rose-500/50 rounded-xl text-rose-400">
              <Compass size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
                Emergent Systemic Anomalies
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Planetary Discovery Ledger ({discoveries.length} Wonders Unveiled)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Discoveries"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {discoveries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-serif text-sm">
              The planet's systems are still young. As geological eras, biological lineages, and intelligent cultures interact across millennia, rare emergent anomalies will surface here.
            </div>
          ) : (
            discoveries.map(disc => (
              <div
                key={disc.id}
                className="bg-slate-800/80 border border-slate-700 hover:border-rose-500/60 rounded-xl p-5 shadow-lg space-y-3 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                        {disc.category}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Discovered Year {disc.yearDiscovered}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white font-serif mt-1">{disc.title}</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {disc.description}
                </p>

                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs font-sans text-rose-200/90">
                  <span className="font-semibold text-rose-400 block mb-0.5">Underlying Causal Genesis:</span>
                  <p>{disc.causalExplanation}</p>
                </div>

                {disc.tileLocation && onSelectCoordinates && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        onSelectCoordinates(disc.tileLocation!.x, disc.tileLocation!.y);
                        onClose();
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1"
                    >
                      <span>Jump to Location ({disc.tileLocation.x}, {disc.tileLocation.y})</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
