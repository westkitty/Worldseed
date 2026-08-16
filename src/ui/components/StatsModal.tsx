// Planetary Science & Deep-Time Statistics Modal

import React from 'react';
import { X, BarChart2, Globe, Trees, Thermometer, Users, Skull, Activity, Shield } from 'lucide-react';
import { WorldState } from '../../types/simulation';

interface StatsModalProps {
  state: WorldState;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  state,
  onClose
}) => {
  const { stats, species, settlements, polities, pathogens, currentYear } = state;

  const totalLivingSpecies = Object.values(species).filter(s => !s.isExtinct).length;
  const totalSapientSpecies = Object.values(species).filter(s => s.isSapient && !s.isExtinct).length;
  const activeSettlements = Object.values(settlements).filter(s => !s.isAbandoned).length;
  const activePolities = Object.values(polities).filter(p => !p.isExtinct).length;
  const totalPlagueDeaths = Object.values(pathogens).reduce((acc, p) => acc + p.totalCasualtiesHistorical, 0);

  const metrics = [
    { label: 'Global Avg Temperature', value: `${stats.globalAvgTemperature}°C`, icon: <Thermometer size={18} className="text-amber-400" /> },
    { label: 'Forest Cover Ratio', value: `${stats.forestCoverPercentage}%`, icon: <Trees size={18} className="text-emerald-400" /> },
    { label: 'Global Living Biomass', value: stats.totalBiomass.toLocaleString(), icon: <Globe size={18} className="text-sky-400" /> },
    { label: 'Active Living Species', value: totalLivingSpecies.toLocaleString(), icon: <Activity size={18} className="text-green-400" /> },
    { label: 'Total Historical Extinctions', value: stats.totalExtinctions.toLocaleString(), icon: <Skull size={18} className="text-red-400" /> },
    { label: 'Speciation Radiations', value: stats.totalSpeciations.toLocaleString(), icon: <Activity size={18} className="text-cyan-400" /> },
    { label: 'Sapient Lineages', value: totalSapientSpecies.toLocaleString(), icon: <Users size={18} className="text-purple-400" /> },
    { label: 'Active Citadels & Cities', value: activeSettlements.toLocaleString(), icon: <Shield size={18} className="text-amber-400" /> },
    { label: 'Active Polities & Empires', value: activePolities.toLocaleString(), icon: <Shield size={18} className="text-blue-400" /> },
    { label: 'Historical Epidemic Deaths', value: totalPlagueDeaths.toLocaleString(), icon: <Skull size={18} className="text-rose-400" /> }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700/50 border border-slate-600 rounded-xl text-sky-400">
              <BarChart2 size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                Deep-Time Observational Data
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Planetary Biosphere Metrics (Year {currentYear.toLocaleString()})
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Statistics"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-2 gap-4">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center gap-3 shadow-md"
            >
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 shrink-0">
                {m.icon}
              </div>
              <div>
                <div className="text-[11px] font-mono text-slate-400">{m.label}</div>
                <div className="text-lg font-bold text-white font-mono">{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
