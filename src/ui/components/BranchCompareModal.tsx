// Alternate History Branching & Divergence Comparison Modal

import React, { useState } from 'react';
import { X, GitFork, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { WorldState } from '../../types/simulation';

interface BranchCompareModalProps {
  state: WorldState;
  onClose: () => void;
  onForkBranch: (name: string) => void;
}

export const BranchCompareModal: React.FC<BranchCompareModalProps> = ({
  state,
  onClose,
  onForkBranch
}) => {
  const [newBranchName, setNewBranchName] = useState('');
  const { branches, currentBranchId, currentYear, stats } = state;

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;
    onForkBranch(newBranchName.trim());
    setNewBranchName('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-950/60 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-600/30 border border-cyan-500/50 rounded-xl text-cyan-400">
              <GitFork size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                Alternate History Engine
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Timeline Branches & Divergence Ledger
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Branch Manager"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Fork New Branch Toolbar */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Name your alternate timeline (e.g. 'What If The Meteor Missed?')..."
              value={newBranchName}
              onChange={e => setNewBranchName(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
            <button
              onClick={handleCreateBranch}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg"
            >
              <Plus size={14} />
              <span>Fork from Year {currentYear}</span>
            </button>
          </div>

          {/* Active Timelines List */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase text-slate-400">
              Active Historical Timelines
            </h3>

            {Object.values(branches).map(b => {
              const isCurrent = b.id === currentBranchId;

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-800/80 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitFork size={16} className={isCurrent ? 'text-cyan-400' : 'text-slate-400'} />
                      <h4 className="font-bold text-white text-sm font-serif">{b.name}</h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-900 text-cyan-300 border border-cyan-700 font-bold">
                          CURRENT TIMELINE
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400">Forked at Year {b.forkYear}</span>
                  </div>

                  {b.interventionsApplied.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <span className="text-[11px] font-mono text-amber-400 font-semibold block">
                        Interventions & Divergent Factors:
                      </span>
                      {b.interventionsApplied.map((int, i) => (
                        <div key={i} className="text-xs text-slate-300 font-sans pl-2 border-l border-amber-500">
                          [Year {int.year}] {int.description}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400 italic">
                      Zero external interventions applied. Running natural planetary divergence.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
