// Quick Command Palette Modal (Cmd/Ctrl + K)

import React, { useState, useEffect } from 'react';
import {
  Search, Globe, Eye, BookOpen, Dna, Settings, Sparkles, Navigation,
  Save, Volume2, HelpCircle, Layers, ArrowRight
} from 'lucide-react';
import { WorldState, WorldViewMode } from '../../types/simulation';

interface CommandPaletteModalProps {
  state: WorldState;
  onClose: () => void;
  onSelectAction: (action: string, payload?: any) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  state,
  onClose,
  onSelectAction
}) => {
  const [query, setQuery] = useState('');

  const commands = [
    { id: 'VIEW_FLAT', title: 'Switch View: Flat Atlas', category: 'Views', icon: <Eye size={16} />, action: () => onSelectAction('SET_VIEW', 'FLAT_ATLAS') },
    { id: 'VIEW_GLOBE', title: 'Switch View: 3D Globe', category: 'Views', icon: <Globe size={16} />, action: () => onSelectAction('SET_VIEW', 'GLOBE') },
    { id: 'VIEW_SNOW_GLOBE', title: 'Switch View: Snow Globe Diorama', category: 'Views', icon: <Sparkles size={16} />, action: () => onSelectAction('SET_VIEW', 'SNOW_GLOBE') },
    { id: 'VIEW_RELIEF', title: 'Switch View: Relief Terrain Slab', category: 'Views', icon: <Layers size={16} />, action: () => onSelectAction('SET_VIEW', 'RELIEF_DIORAMA') },
    { id: 'VIEW_ORBITAL', title: 'Switch View: Orbital Cosmos', category: 'Views', icon: <Globe size={16} />, action: () => onSelectAction('SET_VIEW', 'ORBITAL_VIEW') },
    { id: 'MODAL_TREE', title: 'Open Phylogenetic Tree of Life', category: 'Navigation', icon: <Dna size={16} />, action: () => onSelectAction('OPEN_MODAL', 'TREE_OF_LIFE') },
    { id: 'MODAL_CHRONICLE', title: 'Open Historical Chronicle of Eras', category: 'Navigation', icon: <BookOpen size={16} />, action: () => onSelectAction('OPEN_MODAL', 'CHRONICLE') },
    { id: 'MODAL_WORLD_LAB', title: 'Open World Lab (Interventions & Catastrophes)', category: 'Tools', icon: <Sparkles size={16} />, action: () => onSelectAction('OPEN_MODAL', 'WORLD_LAB') },
    { id: 'MODAL_SETTINGS', title: 'Open Settings Hub', category: 'Settings', icon: <Settings size={16} />, action: () => onSelectAction('OPEN_MODAL', 'SETTINGS') },
    { id: 'MODAL_GENESIS', title: 'Synthesize New World (Genesis Wizard)', category: 'World', icon: <Globe size={16} />, action: () => onSelectAction('OPEN_MODAL', 'NEW_WORLD_WIZARD') }
  ];

  // Also include living species & cities in search results!
  const dynamicSpecies = Object.values(state.species).slice(0, 10).map(s => ({
    id: `SPECIES_${s.id}`,
    title: `Species: ${s.commonName} (${s.scientificName})`,
    category: 'Species',
    icon: <Dna size={16} className="text-emerald-400" />,
    action: () => onSelectAction('SELECT_ENTITY', { type: 'SPECIES', id: s.id })
  }));

  const dynamicSettlements = Object.values(state.settlements).slice(0, 10).map(sett => ({
    id: `SETT_${sett.id}`,
    title: `City: ${sett.name} (${sett.tier})`,
    category: 'Civilizations',
    icon: <Navigation size={16} className="text-amber-400" />,
    action: () => onSelectAction('SELECT_ENTITY', { type: 'SETTLEMENT', id: sett.id })
  }));

  const allItems = [...commands, ...dynamicSpecies, ...dynamicSettlements];

  const filtered = query.trim()
    ? allItems.filter(item => item.title.toLowerCase().includes(query.toLowerCase().trim()) || item.category.toLowerCase().includes(query.toLowerCase().trim()))
    : allItems;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center pt-24 p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Search Input */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center gap-3">
          <Search size={18} className="text-sky-400" />
          <input
            type="text"
            placeholder="Type a command, species, city, view, or tool..."
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-400 focus:outline-none font-sans"
          />
          <kbd className="px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-800/80 text-xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-slate-800 rounded-lg text-slate-400 group-hover:text-sky-400 border border-slate-700">
                  {item.icon}
                </div>
                <div>
                  <div className="font-semibold text-slate-200 group-hover:text-white">{item.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{item.category}</div>
                </div>
              </div>
              <ArrowRight size={14} className="text-slate-600 group-hover:text-sky-400 transition-all transform group-hover:translate-x-1" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500 italic font-mono">
              No matching commands or entities found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
