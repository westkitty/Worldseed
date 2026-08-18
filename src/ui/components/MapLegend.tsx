// Layer legend — compact, layer-specific swatches drawn from the same colour formulas the
// surface compositor uses, so the legend always matches what is actually on the planet.

import React from 'react';
import { MapLayerMode } from './WorldCanvas';
import { WorldState } from '../../types/simulation';
import { BIOME_RGB, hslToRgb, rgbToCss } from '../../visuals/terrain/planetSurface';

interface MapLegendProps {
  activeLayer: MapLayerMode;
  state: WorldState;
}

const TEMP_STOPS = [0, 0.25, 0.5, 0.75, 1].map(t => rgbToCss(hslToRgb(228 - t * 228, 0.72, 0.24 + t * 0.3)));
const BIODIVERSITY_STOPS = [0, 0.5, 1].map(a => rgbToCss(hslToRgb(28 + a * 112, 0.6, 0.18 + a * 0.34)));

export const MapLegend: React.FC<MapLegendProps> = ({ activeLayer, state }) => {
  return (
    <div className="ws-panel absolute bottom-24 left-3 p-2.5 z-20 text-[11px] select-none max-w-[192px] hidden md:block" style={{ color: 'var(--ws-ink-muted)' }}>
      <div className="ws-hud-label mb-1.5 pb-1.5 border-b" style={{ borderColor: 'var(--ws-hairline)' }}>
        {activeLayer.replace(/_/g, ' ').toLowerCase()}
      </div>

      {activeLayer === 'PHYSICAL' && (
        <div className="space-y-1 ws-numeric text-[10px]">
          {[
            { color: rgbToCss(BIOME_RGB.DEEP_OCEAN), label: 'Deep Oceans' },
            { color: rgbToCss(BIOME_RGB.SHALLOW_OCEAN), label: 'Coastal Waters' },
            { color: rgbToCss(BIOME_RGB.TEMPERATE_GRASSLAND), label: 'Fertile Lowlands' },
            { color: rgbToCss(BIOME_RGB.ALPINE), label: 'Alpine Peaks' }
          ].map(swatch => (
            <div key={swatch.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-[3px]" style={{ background: swatch.color, border: '1px solid rgba(255,255,255,0.14)' }} />
              <span>{swatch.label}</span>
            </div>
          ))}
        </div>
      )}

      {activeLayer === 'TEMPERATURE' && (
        <div className="space-y-1">
          <div className="h-2 rounded-[3px]" style={{ background: `linear-gradient(90deg, ${TEMP_STOPS.join(', ')})` }} />
          <div className="flex justify-between ws-numeric text-[10px]">
            <span>-25°C</span>
            <span>+10°C</span>
            <span>+35°C</span>
          </div>
        </div>
      )}

      {activeLayer === 'BIODIVERSITY' && (
        <div className="space-y-1">
          <div className="h-2 rounded-[3px]" style={{ background: `linear-gradient(90deg, ${BIODIVERSITY_STOPS.join(', ')})` }} />
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
