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
    <div className="ws-panel absolute top-[196px] left-3 z-20 p-2 pl-2.5 max-w-[248px] hidden sm:flex items-center gap-2.5">
      <div className="p-1.5 rounded-md shrink-0" style={{ background: 'rgba(242, 180, 92, 0.16)', color: 'var(--ws-culture)' }}>
        <Pin size={13} />
      </div>

      <div className="min-w-0">
        <div className="text-[12px] truncate" style={{ color: 'var(--ws-ink)' }}>{title}</div>
        <div className="ws-numeric text-[10px] truncate" style={{ color: 'var(--ws-ink-faint)' }}>{subtitle}</div>
      </div>

      <div className="flex items-center gap-0.5 ml-auto pl-1.5 border-l shrink-0" style={{ borderColor: 'var(--ws-hairline)' }}>
        {coords && (
          <button
            onClick={() => onJumpToCoordinates(coords!.x, coords!.y)}
            className="p-1.5 rounded hover:bg-white/10" style={{ color: 'var(--ws-accent)' }}
            title="Center Camera on Entity"
          >
            <Navigation size={14} />
          </button>
        )}
        <button
          onClick={() => onOpenWhy(causalNodeId)}
          className="p-1.5 rounded hover:bg-white/10" style={{ color: 'var(--ws-deep-time)' }}
          title="Open WHY? Causal Trace"
        >
          <Search size={14} />
        </button>
        <button
          onClick={onUnpin}
          className="p-1.5 rounded hover:bg-white/10" style={{ color: 'var(--ws-ink-faint)' }}
          title="Unpin Subject"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
