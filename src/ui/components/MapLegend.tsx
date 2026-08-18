// Compact thematic legend. Physical mode needs no permanent explanation box: the terrain
// itself is the legend, and removing that redundant panel gives the planet back visual space.

import React from 'react';
import { MapLayerMode } from './WorldCanvas';
import { WorldState } from '../../types/simulation';

interface MapLegendProps {
  activeLayer: MapLayerMode;
  state: WorldState;
}

const VISIBLE_LEGENDS = new Set<MapLayerMode>([
  'TEMPERATURE',
  'RAINFALL',
  'BIODIVERSITY',
  'POLITICAL',
  'DISEASES',
  'RUINS_ARCHAEOLOGY',
  'ENVIRONMENTAL_SCARS'
]);

export const MapLegend: React.FC<MapLegendProps> = ({ activeLayer, state }) => {
  if (!VISIBLE_LEGENDS.has(activeLayer)) return null;

  return (
    <div
      className="ws-panel absolute bottom-24 left-3 px-2.5 py-2 z-20 text-[10px] select-none w-[172px] hidden md:block"
      style={{ color: 'var(--ws-ink-muted)' }}
    >
      <div
        className="uppercase tracking-[0.14em] mb-1.5 pb-1 border-b"
        style={{ color: 'var(--ws-ink-faint)', borderColor: 'var(--ws-hairline)' }}
      >
        {activeLayer.replace(/_/g, ' ').toLowerCase()}
      </div>

      {activeLayer === 'TEMPERATURE' && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 via-amber-400 to-red-600" />
          <div className="flex justify-between ws-numeric text-[9px]">
            <span>-25°</span>
            <span>+10°</span>
            <span>+35°</span>
          </div>
        </div>
      )}

      {activeLayer === 'RAINFALL' && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-slate-800 via-sky-700 to-cyan-300" />
          <div className="flex justify-between ws-numeric text-[9px]">
            <span>arid</span>
            <span>wet</span>
          </div>
        </div>
      )}

      {activeLayer === 'BIODIVERSITY' && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-stone-700 via-lime-700 to-emerald-400" />
          <div className="flex justify-between ws-numeric text-[9px]">
            <span>sparse</span>
            <span>hotspot</span>
          </div>
        </div>
      )}

      {activeLayer === 'POLITICAL' && (
        <div className="space-y-1 text-[9.5px]">
          {Object.values(state.polities).slice(0, 4).map(p => (
            <div key={p.id} className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: p.colorHex }} />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
          {Object.values(state.polities).length === 0 && <span className="italic">No polities established</span>}
        </div>
      )}

      {activeLayer === 'DISEASES' && (
        <div className="flex items-center gap-2 text-[9.5px]">
          <span className="w-2 h-2 rounded-[2px] bg-red-500" />
          <span>active contagion</span>
        </div>
      )}

      {activeLayer === 'RUINS_ARCHAEOLOGY' && (
        <div className="space-y-1 text-[9.5px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-purple-400" />
            <span>ruins</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-amber-400" />
            <span>fossil strata</span>
          </div>
        </div>
      )}

      {activeLayer === 'ENVIRONMENTAL_SCARS' && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-stone-700 via-amber-700 to-red-500" />
          <div className="flex justify-between ws-numeric text-[9px]">
            <span>intact</span>
            <span>damaged</span>
          </div>
        </div>
      )}
    </div>
  );
};
