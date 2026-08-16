// Pinned Entity Historical Follower HUD

import React from 'react';
import { Pin, X, Search, Navigation } from 'lucide-react';
import { InspectionSelection, WorldState } from '../../types/simulation';

interface PinnedEntityFollowerProps {
  pinnedEntity: InspectionSelection | null;
  state: WorldState;
  onUnpin: () => void;
  onJumpToCoordinates: (x: number, y: number) => void;
  onOpenWhy: (nodeId: string) => void;
}

export const PinnedEntityFollower: React.FC<PinnedEntityFollowerProps> = ({
  pinnedEntity,
  state,
  onUnpin,
  onJumpToCoordinates,
  onOpenWhy
}) => {
  if (!pinnedEntity) return null;

  let title = 'Pinned Subject';
  let subtitle = '';
  let coords: { x: number; y: number } | null = null;
  let causalNodeId = '';

  if (pinnedEntity.type === 'SPECIES') {
    const s = state.species[pinnedEntity.id];
    if (s) {
      title = `${s.iconSymbol} ${s.commonName}`;
      subtitle = `Pop: ${s.totalPopulation.toLocaleString()} | ${s.isExtinct ? 'Extinct' : 'Thriving'}`;
      coords = s.originTile;
      causalNodeId = s.causalNodeId;
    }
  } else if (pinnedEntity.type === 'SETTLEMENT') {
    const sett = state.settlements[pinnedEntity.id];
    if (sett) {
      title = `🏛️ ${sett.name}`;
      subtitle = `Pop: ${sett.population.toLocaleString()} | ${sett.tier}`;
      coords = { x: sett.tileX, y: sett.tileY };
      causalNodeId = sett.causalNodeId;
    }
  } else if (pinnedEntity.type === 'RUIN') {
    const r = state.ruins[pinnedEntity.id];
    if (r) {
      title = `🏺 Ruins of ${r.originalName}`;
      subtitle = `Collapsed Year ${r.collapsedYear}`;
      causalNodeId = r.id;
    }
  }

  return (
    <div className="absolute top-16 left-36 bg-slate-900/90 border border-amber-500/60 backdrop-blur-md rounded-lg p-2.5 shadow-2xl z-20 text-xs text-slate-200 flex items-center gap-3 select-none animate-fade-in">
      <div className="p-1.5 bg-amber-500/20 rounded border border-amber-500/40 text-amber-400">
        <Pin size={14} />
      </div>

      <div>
        <div className="font-bold text-white font-serif">{title}</div>
        <div className="text-[10px] font-mono text-slate-400">{subtitle}</div>
      </div>

      <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2">
        {coords && (
          <button
            onClick={() => onJumpToCoordinates(coords!.x, coords!.y)}
            className="p-1.5 hover:bg-slate-800 rounded text-sky-400"
            title="Center Camera on Entity"
          >
            <Navigation size={14} />
          </button>
        )}
        <button
          onClick={() => onOpenWhy(causalNodeId)}
          className="p-1.5 hover:bg-slate-800 rounded text-amber-400"
          title="Open WHY? Causal Trace"
        >
          <Search size={14} />
        </button>
        <button
          onClick={onUnpin}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          title="Unpin Subject"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
