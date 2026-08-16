// World Lab / Divine Intervention Modal

import React from 'react';
import { X, Sparkles, Flame, CloudRain, Sun, Zap, Skull, Brain, ShieldAlert } from 'lucide-react';
import { WorldState } from '../../types/simulation';

interface WorldLabModalProps {
  state: WorldState;
  onClose: () => void;
  onApplyIntervention: (type: any, params?: any) => void;
}

export const WorldLabModal: React.FC<WorldLabModalProps> = ({
  state,
  onClose,
  onApplyIntervention
}) => {
  const interventions = [
    {
      type: 'METEOR_STRIKE',
      name: 'Cataclysmic Meteorite Impact',
      icon: <Flame size={20} className="text-orange-400" />,
      desc: 'Strike the planet with a massive cosmic bolide. Carves a deep crater, triggers seismic shocks, and lofts ejecta dust causing a temporary volcanic winter.',
      btnText: 'Trigger Meteor Impact'
    },
    {
      type: 'SUPERVOLCANO',
      name: 'Supervolcanic Caldera Eruption',
      icon: <Skull size={20} className="text-red-400" />,
      desc: 'Rupture a subterranean magma chamber. Creates basalt barren fields, spews sulfur aerosols, and cools global surface temperatures.',
      btnText: 'Erupt Supervolcano'
    },
    {
      type: 'UPLIFT_SPECIES',
      name: 'Divine Sapience Awakening',
      icon: <Brain size={20} className="text-purple-400" />,
      desc: 'Bestow abstract symbolic consciousness, vocal language, and tool crafting onto an active biological lineage.',
      btnText: 'Uplift Random Species'
    },
    {
      type: 'DELUGE',
      name: 'Great Torrential Deluge',
      icon: <CloudRain size={20} className="text-sky-400" />,
      desc: 'Saturate atmospheric moisture vectors, causing unprecedented continental floods and carving new river channels.',
      btnText: 'Trigger Global Deluge'
    },
    {
      type: 'MEGA_DROUGHT',
      name: 'Continental Mega-Drought',
      icon: <Sun size={20} className="text-yellow-400" />,
      desc: 'Strip moisture from prevailing wind systems, triggering severe forest die-offs, dust storms, and agricultural famines.',
      btnText: 'Induce Mega-Drought'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-purple-800/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 to-slate-900 border-b border-purple-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/30 border border-purple-500/50 rounded-xl text-purple-400">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold">
                Experimental World Laboratory
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Planetary & Divine Interventions
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close World Lab"
          >
            <X size={20} />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-purple-950/40 px-6 py-3 border-b border-purple-800/40 flex items-center gap-2 text-xs text-purple-300">
          <ShieldAlert size={16} className="text-purple-400 shrink-0" />
          <span>
            Every intervention is indelibly recorded in the world's causal history as an <strong className="text-white">EXTERNAL INTERVENTION</strong> and enters the oral mythology of witness cultures.
          </span>
        </div>

        {/* Interventions Grid */}
        <div className="p-6 overflow-y-auto space-y-4">
          {interventions.map(int => (
            <div
              key={int.type}
              className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl flex items-center justify-between gap-4 transition-all shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 shrink-0">
                  {int.icon}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm font-serif">{int.name}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{int.desc}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onApplyIntervention(int.type);
                  onClose();
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-lg shrink-0"
              >
                {int.btnText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
