// Real-Time Map Layer Legend & Metric Histogram HUD

import React from 'react';
import { MapLayerMode } from './WorldCanvas';
import { WorldState } from '../../types/simulation';

interface MapLegendProps {
  activeLayer: MapLayerMode;
  state: WorldState;
}

export const MapLegend: React.FC<MapLegendProps> = ({ activeLayer, state }) => {
  return (
    <div className="ws-panel absolute bottom-24 left-3 p-2.5 z-20 text-[11px] select-none max-w-[196px] hidden md:block" style={{ color: 'var(--ws-ink-muted)' }}>
      <div
        className="text-[10px] uppercase tracking-[0.16em] mb-2 pb-1.5 border-b"
        style={{ color: 'var(--ws-ink-faint)', borderColor: 'var(--ws-hairline)' }}
      >
        {activeLayer.replace(/_/g, ' ').toLowerCase()}
      </div>

      {activeLayer === 'PHYSICAL' && (
        <div className="space-y-1 ws-numeric text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-900 border border-blue-700" />
            <span>Deep Oceans</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-sky-500 border border-sky-400" />
            <span>Coastal Waters</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-700 border border-emerald-600" />
            <span>Fertile Lowlands</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-slate-300 border border-slate-400" />
            <span>Alpine Peaks</span>
          </div>
        </div>
      )}

      {activeLayer === 'TEMPERATURE' && (
        <div className="space-y-1">
          <div className="h-2 rounded bg-gradient-to-r from-blue-600 via-emerald-500 via-amber-400 to-red-600" />
          <div className="flex justify-between ws-numeric text-[10px]">
            <span>-25°C</span>
            <span>+10°C</span>
            <span>+35°C</span>
          </div>
        </div>
      )}

      {activeLayer === 'BIODIVERSITY' && (
        <div className="space-y-1">
          <div className="h-2 rounded bg-gradient-to-r from-red-800 via-yellow-600 to-emerald-500" />
          <div className="flex justify-between ws-numeric text-[10px]">
            <span>Sparse</span>
            <span>Climax Hotspot</span>
          </div>
        </div>
      )}

      {activeLayer === 'POLITICAL' && (
        <div className="space-y-1 text-[10px]">
          {Object.values(state.polities).slice(0, 4).map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: p.colorHex }} />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
          {Object.values(state.polities).length === 0 && (
            <span className="italic">No polities established</span>
          )}
        </div>
      )}

      {activeLayer === 'DISEASES' && (
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-600" />
            <span>Active Contagion Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-slate-800" />
            <span>Uninfected Biomass</span>
          </div>
        </div>
      )}

      {activeLayer === 'RUINS_ARCHAEOLOGY' && (
        <div className="space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span>Ancient Settlement Ruins</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Mineralized Fossil Strata</span>
          </div>
        </div>
      )}
    </div>
  );
};
