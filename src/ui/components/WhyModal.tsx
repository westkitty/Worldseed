// "WHY?" Deep Causal Graph Investigator Modal

import React from 'react';
import { X, Search, GitCommit, ArrowDown, ExternalLink } from 'lucide-react';
import { CausalityEngine } from '../../simulation/history/causality';
import { WorldState } from '../../types/simulation';

interface WhyModalProps {
  nodeId: string | null;
  state: WorldState;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({
  nodeId,
  state,
  onClose,
  onSelectNode
}) => {
  if (!nodeId) return null;

  const explanation = CausalityEngine.explainWhy(nodeId, state);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-600/30 border border-sky-500/50 rounded-xl text-sky-400">
              <Search size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                Causal History Investigator
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                {explanation.headline}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Causal Investigator"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Synthesized Narrative */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 text-sm leading-relaxed text-slate-300 font-sans shadow-inner">
            <h3 className="text-xs font-mono font-semibold uppercase text-sky-400 mb-2">
              Authoritative Causal Synthesis
            </h3>
            <div className="whitespace-pre-line">
              {explanation.fullNarrative}
            </div>
          </div>

          {/* Interactive Causal Chain Pathway */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase text-slate-400 mb-3">
              Historical Causal Chain ({explanation.chainSteps.length} Links)
            </h3>

            <div className="space-y-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-sky-500 before:via-indigo-500 before:to-purple-500">
              {explanation.chainSteps.map((step, idx) => (
                <div
                  key={step.nodeId}
                  className="flex items-start gap-4 relative z-10"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-sky-500 flex items-center justify-center text-xs font-mono font-bold text-sky-300 shadow-md shrink-0">
                    Yr {step.year}
                  </div>

                  <div className="flex-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-3.5 transition-all shadow-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm font-serif">
                        {step.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                        {step.entityType}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mb-2">{step.summary}</p>

                    {idx < explanation.chainSteps.length - 1 && (
                      <div className="text-[11px] font-mono text-sky-400/90 flex items-center gap-1.5 pt-1.5 border-t border-slate-700/50">
                        <ArrowDown size={12} />
                        <span>{step.roleDescription}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
