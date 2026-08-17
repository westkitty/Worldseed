import React from 'react';
import { Dna, Landmark, Pin, Search, Sparkles, X } from 'lucide-react';
import { InspectionSelection, WorldState } from '../../types/simulation';

interface InspectorPanelProps {
  selection: InspectionSelection | null;
  state: WorldState;
  pinnedEntity: InspectionSelection | null;
  onClose: () => void;
  onSelectEntity: (selection: InspectionSelection | null) => void;
  onPinEntity: (selection: InspectionSelection) => void;
  onOpenWhyForNode: (nodeId: string) => void;
  onOpenFieldGuide?: () => void;
  onOpenCivilizationDossier?: () => void;
  onOpenWhatIf?: (prompt: string) => void;
}

const stat = (label: string, value: React.ReactNode) => (
  <div className="rounded-lg bg-white/[0.035] px-2.5 py-2">
    <div className="text-[9px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
    <div className="mt-0.5 text-[11px] font-medium text-slate-200">{value}</div>
  </div>
);

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selection,
  state,
  pinnedEntity,
  onClose,
  onSelectEntity,
  onPinEntity,
  onOpenWhyForNode,
  onOpenFieldGuide,
  onOpenCivilizationDossier,
  onOpenWhatIf
}) => {
  if (!selection) return null;

  const { grid, species, settlements, polities, cultures, ruins } = state;
  const isPinned = pinnedEntity?.id === selection.id && pinnedEntity?.type === selection.type;

  const curiosityActions = (whyNodeId: string, subject: string) => (
    <div className="grid grid-cols-3 gap-1.5">
      <button
        type="button"
        onClick={() => onPinEntity(selection)}
        className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-semibold transition ${isPinned ? 'bg-amber-300/14 text-amber-200 ring-1 ring-inset ring-amber-200/20' : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'}`}
        title="Keep this subject visible while time runs"
      >
        <Pin size={12} />
        {isPinned ? 'Following' : 'Follow'}
      </button>
      <button
        type="button"
        onClick={() => onOpenWhyForNode(whyNodeId)}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-300/10 px-2 py-2 text-[10px] font-semibold text-sky-200 transition hover:bg-sky-300/16"
      >
        <Search size={12} />
        Why?
      </button>
      <button
        type="button"
        onClick={() => onOpenWhatIf?.(`Change the world around ${subject}`)}
        disabled={!onOpenWhatIf}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-300/10 px-2 py-2 text-[10px] font-semibold text-violet-200 transition hover:bg-violet-300/16 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Sparkles size={12} />
        What if?
      </button>
    </div>
  );

  return (
    <aside
      data-testid="inspector-panel"
      className="absolute right-4 top-20 z-30 w-[min(360px,calc(100vw-32px))] max-h-[calc(100vh-170px)] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/78 text-slate-200 shadow-2xl backdrop-blur-2xl animate-fade-in"
      aria-label="World inspector"
    >
      <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">Inspecting</div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-300">{selection.type.toLowerCase()}</div>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-white/[0.08] hover:text-white" aria-label="Close Inspector">
          <X size={15} />
        </button>
      </div>

      <div className="max-h-[calc(100vh-225px)] space-y-3 overflow-y-auto p-3.5 text-xs">
        {selection.type === 'TILE' && (() => {
          const [tx, ty] = selection.id.split(',').map(Number);
          const tile = grid[ty]?.[tx];
          if (!tile) return <div className="text-slate-400">Tile not found.</div>;
          const settlement = tile.settlementId ? settlements[tile.settlementId] : null;

          return (
            <>
              <div>
                <h2 className="font-serif text-lg font-semibold text-white">{tile.biome.replaceAll('_', ' ')}</h2>
                <div className="mt-1 text-[10px] text-slate-500">{tile.x}, {tile.y} · plate {tile.plateId}</div>
              </div>
              {curiosityActions(`cause_tile_${selection.id}`, `tile ${selection.id}`)}
              <div className="grid grid-cols-3 gap-1.5">
                {stat('Elevation', `${Math.round(tile.elevation * 1000)} m`)}
                {stat('Temperature', `${tile.currentTemp} °C`)}
                {stat('Rainfall', `${Math.round(tile.rainfall * 100)}%`)}
              </div>
              {settlement && (
                <button type="button" onClick={() => onSelectEntity({ type: 'SETTLEMENT', id: settlement.id })} className="w-full rounded-xl border border-amber-200/10 bg-amber-300/[0.05] px-3 py-2.5 text-left transition hover:bg-amber-300/[0.09]">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-amber-400/70">Settlement here</div>
                  <div className="mt-0.5 font-medium text-amber-100">{settlement.name}</div>
                </button>
              )}
              {tile.ruins.length > 0 && (
                <button type="button" onClick={() => onSelectEntity({ type: 'RUIN', id: tile.ruins[0].id })} className="w-full rounded-xl border border-violet-200/10 bg-violet-300/[0.05] px-3 py-2.5 text-left transition hover:bg-violet-300/[0.09]">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-violet-400/70">Archaeology</div>
                  <div className="mt-0.5 font-medium text-violet-100">Ruins of {tile.ruins[0].originalName}</div>
                </button>
              )}
            </>
          );
        })()}

        {selection.type === 'SPECIES' && (() => {
          const s = species[selection.id];
          if (!s) return <div className="text-slate-400">Species not found.</div>;
          return (
            <>
              <div className="flex items-center gap-3">
                <div className="text-3xl" aria-hidden="true">{s.iconSymbol}</div>
                <div className="min-w-0">
                  <h2 className="truncate font-serif text-lg font-semibold text-white">{s.commonName}</h2>
                  <div className="truncate text-[10px] italic text-slate-500">{s.scientificName}</div>
                </div>
              </div>
              {curiosityActions(s.causalNodeId, s.commonName)}
              <div className="grid grid-cols-3 gap-1.5">
                {stat('Population', s.totalPopulation.toLocaleString())}
                {stat('Cognition', `${s.genome.cognition}/100`)}
                {stat('Body', `${s.genome.bodySizeMeters} m`)}
              </div>
              {onOpenFieldGuide && (
                <button type="button" onClick={onOpenFieldGuide} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300/[0.07] px-3 py-2.5 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-300/[0.12]">
                  <Dna size={13} /> View morphology & lineage
                </button>
              )}
            </>
          );
        })()}

        {selection.type === 'SETTLEMENT' && (() => {
          const settlement = settlements[selection.id];
          if (!settlement) return <div className="text-slate-400">Settlement not found.</div>;
          const culture = cultures[settlement.cultureId];
          const polity = polities[settlement.polityId];
          return (
            <>
              <div>
                <h2 className="font-serif text-lg font-semibold text-white">{settlement.name}</h2>
                <div className="mt-1 text-[10px] text-amber-300/70">{settlement.tier} · founded {settlement.foundedYear.toLocaleString()}</div>
              </div>
              {curiosityActions(settlement.causalNodeId, settlement.name)}
              <div className="grid grid-cols-3 gap-1.5">
                {stat('Population', settlement.population.toLocaleString())}
                {stat('Food', `${settlement.foodSupplyDays} days`)}
                {stat('Culture', culture?.name || '—')}
              </div>
              {polity && <div className="rounded-xl bg-white/[0.035] px-3 py-2.5 text-[11px] text-slate-400">Part of <span className="font-medium text-sky-200">{polity.name}</span></div>}
              {onOpenCivilizationDossier && (
                <button type="button" onClick={onOpenCivilizationDossier} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300/[0.07] px-3 py-2.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-300/[0.12]">
                  <Landmark size={13} /> Open civilization dossier
                </button>
              )}
            </>
          );
        })()}

        {selection.type === 'RUIN' && (() => {
          const ruin = ruins[selection.id];
          if (!ruin) return <div className="text-slate-400">Ruin not found.</div>;
          return (
            <>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-400/70">Persistent history</div>
                <h2 className="mt-1 font-serif text-lg font-semibold text-white">Ruins of {ruin.originalName}</h2>
                <div className="mt-1 text-[10px] text-slate-500">{ruin.foundedYear.toLocaleString()} — {ruin.collapsedYear.toLocaleString()}</div>
              </div>
              {curiosityActions(ruin.id, ruin.originalName)}
              <div className="rounded-xl border border-rose-300/10 bg-rose-300/[0.04] px-3 py-2.5">
                <div className="text-[9px] uppercase tracking-[0.16em] text-rose-300/70">Collapse</div>
                <div className="mt-1 text-[11px] leading-relaxed text-slate-300">{ruin.collapseCause}</div>
              </div>
            </>
          );
        })()}
      </div>
    </aside>
  );
};
