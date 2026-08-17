import React from 'react';
import { Check, Eye, Keyboard, Settings, VolumeX, X } from 'lucide-react';
import { WorldViewMode } from '../../types/simulation';

interface SettingsModalProps { currentViewMode: WorldViewMode; onSetViewMode: (mode: WorldViewMode) => void; onClose: () => void; }
const VIEW_MODES: Array<{ id: WorldViewMode; name: string; desc: string }> = [
  { id: 'FLAT_ATLAS', name: 'Flat Atlas', desc: 'Smooth 2D cartography' }, { id: 'SQUARE_TILE', name: 'World Table', desc: 'Framed map-table presentation' }, { id: 'GLOBE', name: 'Globe', desc: 'Spherical planetary view' }, { id: 'SNOW_GLOBE', name: 'Snow Globe', desc: 'Glass diorama presentation' }, { id: 'RELIEF_DIORAMA', name: 'Relief', desc: 'Displaced terrain model' }, { id: 'ORBITAL_VIEW', name: 'Orbit', desc: 'Distant planetary framing' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ currentViewMode, onSetViewMode, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
    <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-200 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center gap-3"><div className="rounded-xl border border-sky-500/50 bg-sky-600/30 p-2 text-sky-300"><Settings size={20} /></div><div><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-300">Preferences that actually affect the product</span><h2 className="font-serif text-lg font-bold tracking-tight text-white">WORLDSEED Settings</h2></div></div>
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Close settings"><X size={20} /></button>
      </div>
      <div className="space-y-6 overflow-y-auto p-6 text-sm select-text">
        <section><div className="mb-3 flex items-center gap-2"><Eye size={16} className="text-sky-300" /><h3 className="font-semibold text-white">World presentation</h3></div><p className="mb-3 text-xs leading-relaxed text-slate-400">Switching presentation changes only how the same simulation is observed.</p><div className="grid grid-cols-2 gap-2 md:grid-cols-3">{VIEW_MODES.map(mode => <button key={mode.id} onClick={() => onSetViewMode(mode.id)} aria-pressed={currentViewMode === mode.id} className={`min-h-20 rounded-xl border p-3 text-left transition ${currentViewMode === mode.id ? 'border-sky-400 bg-sky-500/15 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800'}`}><div className="flex items-center justify-between gap-2 font-semibold"><span>{mode.name}</span>{currentViewMode === mode.id && <Check size={15} className="text-sky-300" />}</div><div className="mt-1 text-[11px] text-slate-400">{mode.desc}</div></button>)}</div></section>
        <section className="grid gap-3 border-t border-slate-800 pt-5 md:grid-cols-2"><div className="rounded-xl bg-slate-950/45 p-4"><div className="flex items-center gap-2 font-semibold text-slate-100"><Keyboard size={15} className="text-emerald-300" />Input</div><p className="mt-2 text-xs leading-relaxed text-slate-400">Keyboard focus follows standard Tab navigation. World camera shortcuts operate only when interface controls and dialogs do not own the keyboard.</p></div><div className="rounded-xl bg-slate-950/45 p-4"><div className="flex items-center gap-2 font-semibold text-slate-100"><VolumeX size={15} className="text-violet-300" />Audio</div><p className="mt-2 text-xs leading-relaxed text-slate-400">Audio remains silent by default. Sparse event audio is explicitly enabled or muted from World Tools.</p></div></section>
        <p className="text-[11px] leading-relaxed text-slate-500">Removed from this panel: controls that previously changed only local modal state while claiming to alter camera sensitivity, simulation behavior, accessibility, weather, or performance. Those options will return only when they are wired to real runtime behavior.</p>
      </div>
    </div>
  </div>
);
