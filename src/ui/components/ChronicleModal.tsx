// Historical Chronicle & Eras Modal

import React, { useState } from 'react';
import { X, BookOpen, Search, Calendar, Landmark, Flame, ShieldAlert, Sparkles, MapPin } from 'lucide-react';
import { HistoricalEvent, WorldState } from '../../types/simulation';

interface ChronicleModalProps {
  state: WorldState;
  onClose: () => void;
  onSelectCoordinates?: (x: number, y: number) => void;
  onOpenWhy: (nodeId: string) => void;
}

export const ChronicleModal: React.FC<ChronicleModalProps> = ({
  state,
  onClose,
  onSelectCoordinates,
  onOpenWhy
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { events, eras } = state;

  const categories = [
    'ALL', 'BIOSPHERE_GENESIS', 'SPECIATION', 'EXTINCTION',
    'SAPIENCE_EMERGENCE', 'SETTLEMENT_FOUNDED', 'DOMESTICATION',
    'WAR_DECLARED', 'PEACE_TREATY', 'PLAGUE_OUTBREAK', 'POLITY_COLLAPSE',
    'MYTH_BORN', 'DIVINE_INTERVENTION'
  ];

  const filteredEvents = events.filter(e => {
    if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
    if (searchQuery) {
      return (
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  }).reverse(); // Most recent first

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-950/60 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/30 border border-amber-500/50 rounded-xl text-amber-400">
              <BookOpen size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                World Historical Chronicle
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Annals of Deep Time ({events.length} Historical Records)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Chronicle"
          >
            <X size={20} />
          </button>
        </div>

        {/* Eras Bar */}
        <div className="p-4 bg-slate-800/40 border-b border-slate-700 flex gap-3 overflow-x-auto">
          {eras.map(era => (
            <div
              key={era.id}
              className="p-3 bg-slate-800/90 border border-amber-500/40 rounded-xl min-w-[220px] max-w-[280px] shrink-0"
            >
              <div className="text-[10px] font-mono text-amber-400 font-bold">
                YEAR {era.startYear} — {era.endYear ? `YEAR ${era.endYear}` : 'PRESENT'}
              </div>
              <h4 className="font-bold text-white text-sm font-serif mt-0.5">{era.name}</h4>
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{era.dominantTheme}</p>
            </div>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 bg-slate-800/60 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search historical records..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto max-w-full text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded transition-all font-mono text-[10px] whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Events Feed */}
        <div className="p-6 overflow-y-auto space-y-3">
          {filteredEvents.map(evt => (
            <div
              key={evt.id}
              className="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all shadow-md"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    Year {evt.year}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {evt.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {evt.tileCoordinates && onSelectCoordinates && (
                    <button
                      onClick={() => {
                        onSelectCoordinates(evt.tileCoordinates!.x, evt.tileCoordinates!.y);
                        onClose();
                      }}
                      className="text-sky-400 hover:text-sky-300 text-[11px] font-mono flex items-center gap-1"
                      title="Jump to Location on Map"
                    >
                      <MapPin size={12} />
                      <span>({evt.tileCoordinates.x}, {evt.tileCoordinates.y})</span>
                    </button>
                  )}
                  <button
                    onClick={() => onOpenWhy(evt.causalNodeId)}
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <Search size={12} />
                    <span>WHY?</span>
                  </button>
                </div>
              </div>

              <h4 className="font-bold text-white text-sm font-serif mt-1">{evt.title}</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{evt.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
