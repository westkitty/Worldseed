import React from 'react';
import { MapLayerMode } from './WorldCanvas';
import { WorldState } from '../../types/simulation';

interface MapLegendProps {
  activeLayer: MapLayerMode;
  state: WorldState;
}

export const MapLegend: React.FC<MapLegendProps> = ({ activeLayer, state }) => {
  const title = activeLayer.replaceAll('_', ' ').toLowerCase();

  return (
    <div className="group absolute bottom-20 right-4 z-20 max-w-[220px] rounded-xl border border-white/8 bg-slate-950/42 px-2.5 py-2 text-[9px] text-slate-300 opacity-45 shadow-xl backdrop-blur-lg transition hover:bg-slate-950/82 hover:opacity-100">
      <div className="font-medium capitalize text-slate-300">Layer · {title}</div>
      <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:mt-2 group-hover:max-h-48 group-hover:opacity-100">
        {activeLayer === 'PHYSICAL' && (
          <div className="space-y-1.5">
            {[
              ['#172554', 'Deep ocean'],
              ['#0ea5e9', 'Coastal water'],
              ['#15803d', 'Lowland'],
              ['#cbd5e1', 'High mountain']
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span>{label}</span></div>
            ))}
          </div>
        )}

        {activeLayer === 'TEMPERATURE' && (
          <div>
            <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-600 via-emerald-400 via-amber-300 to-rose-500" />
            <div className="mt-1 flex justify-between text-[8px] text-slate-500"><span>cold</span><span>warm</span></div>
          </div>
        )}

        {activeLayer === 'BIODIVERSITY' && (
          <div>
            <div className="h-1.5 rounded-full bg-gradient-to-r from-stone-800 via-lime-700 to-emerald-300" />
            <div className="mt-1 flex justify-between text-[8px] text-slate-500"><span>sparse</span><span>rich</span></div>
          </div>
        )}

        {activeLayer === 'POLITICAL' && (
          <div className="space-y-1">
            {Object.values(state.polities).slice(0, 5).map(polity => (
              <div key={polity.id} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: polity.colorHex }} /><span className="truncate">{polity.name}</span></div>
            ))}
            {Object.values(state.polities).length === 0 && <div className="text-slate-500">No polities yet.</div>}
          </div>
        )}

        {activeLayer === 'DISEASES' && <div className="text-slate-400">Red regions indicate active contagion.</div>}
        {activeLayer === 'RUINS_ARCHAEOLOGY' && <div className="text-slate-400">Violet marks persistent ruins and fossil-bearing strata.</div>}
        {!['PHYSICAL', 'TEMPERATURE', 'BIODIVERSITY', 'POLITICAL', 'DISEASES', 'RUINS_ARCHAEOLOGY'].includes(activeLayer) && (
          <div className="text-slate-500">Move through the world to compare this layer spatially.</div>
        )}
      </div>
    </div>
  );
};
