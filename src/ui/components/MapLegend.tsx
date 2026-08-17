import React from 'react';
import { MapLayerMode } from './WorldCanvas';
import { WorldState } from '../../types/simulation';

interface MapLegendProps { activeLayer: MapLayerMode; state: WorldState; }
const swatchRows = (rows: Array<[string, string]>) => <div className="space-y-1.5">{rows.map(([color, label]) => <div key={label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/10" style={{ backgroundColor: color }} /><span>{label}</span></div>)}</div>;
const scale = (background: string, low: string, high: string) => <div><div className="h-2 rounded-full" style={{ background }} /><div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>{low}</span><span>{high}</span></div></div>;

export const MapLegend: React.FC<MapLegendProps> = ({ activeLayer, state }) => {
  const title = activeLayer.replaceAll('_', ' ').toLowerCase();
  const content = (() => {
    switch (activeLayer) {
      case 'PHYSICAL': return swatchRows([['#082a43', 'Deep ocean'], ['#258b8c', 'Coast / reef'], ['#3a6944', 'Vegetated lowland'], ['#c7cbc7', 'High alpine']]);
      case 'BIOMES': return swatchRows([['#265b3a', 'Forest'], ['#74874d', 'Grassland'], ['#b08b57', 'Desert'], ['#a2aaa8', 'Tundra / alpine']]);
      case 'TEMPERATURE': return scale('linear-gradient(90deg,#2563eb 0%,#10b981 38%,#fbbf24 68%,#f43f5e 100%)', 'cold', 'hot');
      case 'RAINFALL': return scale('linear-gradient(90deg,#172554 0%,#2563eb 48%,#67e8f9 100%)', 'dry', 'wet');
      case 'BIODIVERSITY': return scale('linear-gradient(90deg,#292524 0%,#4d7c0f 48%,#6ee7b7 100%)', 'sparse', 'rich');
      case 'POLITICAL': { const polities = Object.values(state.polities).filter(p => !p.isExtinct).slice(0, 6); return polities.length ? swatchRows(polities.map(p => [p.colorHex, p.name])) : <div className="text-slate-400">No active polities yet.</div>; }
      case 'SETTLEMENTS': return swatchRows([['#e6ae45', 'Settlement'], ['#7e5c2f', 'Infrastructure'], ['#0f172a', 'Unsettled']]);
      case 'CULTURES': { const cultures = Object.values(state.cultures).slice(0, 6); return cultures.length ? swatchRows(cultures.map(c => [c.colorHex, c.name])) : <div className="text-slate-400">No cultures yet.</div>; }
      case 'LANGUAGES': { const languages = Object.values(state.languages).slice(0, 6); return languages.length ? <div className="space-y-1">{languages.map(language => <div key={language.id} className="truncate">• {language.name}</div>)}</div> : <div className="text-slate-400">No languages yet.</div>; }
      case 'DISEASES': return swatchRows([['#be464c', 'Active contagion'], ['#0f172a', 'No active contagion']]);
      case 'RUINS_ARCHAEOLOGY': return swatchRows([['#916cb0', 'Ruin / fossil strata'], ['#1c1917', 'No known site']]);
      case 'ENVIRONMENTAL_SCARS': return scale('linear-gradient(90deg,#334155 0%,#b77935 55%,#7f1d1d 100%)', 'intact', 'severe damage');
      default: return null;
    }
  })();
  return <div className="group absolute bottom-20 right-4 z-20 max-w-[240px] rounded-xl border border-white/10 bg-slate-950/62 px-3 py-2.5 text-[10px] text-slate-200 opacity-70 shadow-xl backdrop-blur-lg transition hover:bg-slate-950/88 hover:opacity-100 focus-within:opacity-100"><div className="font-medium capitalize text-slate-100">Layer · {title}</div><div className="max-h-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:mt-2 group-hover:max-h-56 group-hover:opacity-100">{content}</div></div>;
};
