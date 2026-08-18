// Contextual inspection — what you found, where it is, how it got there, and what you can
// do about it.
//
// Presented as a field record rather than a property grid: an identity line, a short read
// of the thing in its place, then the three curiosity paths (FOLLOW / WHY? / WHAT IF?).

import React from 'react';
import { X, Pin, ChevronRight, Dna, Landmark, Sparkles, HelpCircle } from 'lucide-react';
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
  onOpenWorldLab?: () => void;
}

const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone }) => (
  <div className="flex items-baseline justify-between gap-3 py-1">
    <span className="text-[11px]" style={{ color: 'var(--ws-ink-faint)' }}>
      {label}
    </span>
    <span className="ws-numeric text-[11.5px] text-right" style={{ color: tone || 'var(--ws-ink)' }}>
      {value}
    </span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h4 className="text-[10px] uppercase tracking-[0.16em] mb-1.5" style={{ color: 'var(--ws-ink-faint)' }}>
      {title}
    </h4>
    {children}
  </section>
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
  onOpenWorldLab
}) => {
  if (!selection) return null;

  const { grid, species, settlements, polities, cultures, ruins } = state;
  const isPinned = pinnedEntity?.id === selection.id && pinnedEntity?.type === selection.type;

  // ---- resolve subject -------------------------------------------------------------
  let kicker = selection.type.toLowerCase();
  let title = 'Unknown';
  let subtitle: string | null = null;
  let lede: string | null = null;
  let causalNodeId: string | null = null;
  let accent = 'var(--ws-accent)';
  let body: React.ReactNode = null;

  if (selection.type === 'TILE') {
    const [tx, ty] = selection.id.split(',').map(Number);
    const tile = grid[ty]?.[tx];
    if (!tile) return null;

    const neighbours = [
      grid[ty]?.[(tx + 1) % state.config.width],
      grid[ty]?.[(tx - 1 + state.config.width) % state.config.width],
      grid[ty - 1]?.[tx],
      grid[ty + 1]?.[tx]
    ].filter(Boolean);
    const coastal = neighbours.some(n => n!.isWater) && !tile.isWater;

    kicker = 'place';
    title = tile.biome.replace(/_/g, ' ').toLowerCase();
    subtitle = `${tile.x}, ${tile.y} · tectonic plate ${tile.plateId}`;
    accent = tile.isWater ? 'var(--ws-accent)' : 'var(--ws-life)';
    lede = [
      coastal ? 'A coastal margin' : tile.isWater ? 'Open water' : 'Inland ground',
      tile.riverFlow > 0.1 ? 'carrying a live watercourse' : null,
      tile.elevation > state.config.seaLevel + 0.45 ? 'high above the surrounding land' : null,
      tile.environmentalDamage > 0.3 ? 'and visibly damaged' : null
    ]
      .filter(Boolean)
      .join(', ')
      .concat('.');

    body = (
      <>
        <Section title="Conditions">
          <Stat label="Elevation" value={`${Math.round(tile.elevation * 1000)} m`} />
          <Stat label="Temperature" value={`${tile.currentTemp} °C`} />
          <Stat label="Rainfall" value={`${Math.round(tile.rainfall * 100)}%`} />
          <Stat label="Soil fertility" value={`${Math.round(tile.soilFertility * 100)}%`} />
        </Section>

        <Section title="Living load">
          <Stat label="Biomass" value={Math.round(tile.biomass).toLocaleString()} tone="var(--ws-life)" />
          <Stat label="Carrying capacity" value={Math.round(tile.carryingCapacity).toLocaleString()} />
          <Stat label="Population density" value={Math.round(tile.populationDensity).toLocaleString()} tone="var(--ws-culture)" />
          {tile.environmentalDamage > 0.02 && (
            <Stat label="Environmental damage" value={`${Math.round(tile.environmentalDamage * 100)}%`} tone="var(--ws-alarm)" />
          )}
        </Section>

        {tile.fossils.length > 0 && (
          <Section title={`Strata (${tile.fossils.length})`}>
            {tile.fossils.slice(0, 4).map(f => (
              <div key={`${f.speciesId}-${f.geologicalDepthMeters}`} className="flex items-baseline justify-between gap-3 py-1">
                <span className="text-[11.5px] truncate" style={{ color: 'var(--ws-deep-time)' }}>
                  {f.speciesName}
                </span>
                <span className="ws-numeric text-[10.5px] shrink-0" style={{ color: 'var(--ws-ink-faint)' }}>
                  −{f.geologicalDepthMeters}m · yr {f.extinctionYear}
                </span>
              </div>
            ))}
          </Section>
        )}

        {tile.ruins.length > 0 && (
          <Section title="Buried here">
            {tile.ruins.map(r => (
              <button
                key={r.id}
                onClick={() => onSelectEntity({ type: 'RUIN', id: r.id })}
                className="ws-chip w-full text-left px-2.5 py-2 mb-1 flex items-center justify-between gap-2"
              >
                <span className="min-w-0">
                  <span className="block text-[12px] truncate" style={{ color: 'var(--ws-deep-time)' }}>
                    {r.originalName}
                  </span>
                  <span className="ws-numeric block text-[10.5px]" style={{ color: 'var(--ws-ink-faint)' }}>
                    fell in year {r.collapsedYear}
                  </span>
                </span>
                <ChevronRight size={13} style={{ color: 'var(--ws-ink-faint)' }} />
              </button>
            ))}
          </Section>
        )}
      </>
    );
  } else if (selection.type === 'SPECIES') {
    const s = species[selection.id];
    if (!s) return null;
    kicker = s.isSapient ? 'sapient lineage' : 'lineage';
    title = s.commonName;
    subtitle = s.scientificName;
    accent = s.isExtinct ? 'var(--ws-deep-time)' : 'var(--ws-life)';
    causalNodeId = s.causalNodeId;

    const parent = s.parentSpeciesId ? species[s.parentSpeciesId] : null;
    const home = grid[s.originTile.y]?.[s.originTile.x];
    lede = `${s.genome.bodySizeMeters} m ${s.morphology.replace(/_/g, ' ').toLowerCase()}, ${s.trophicLevel
      .replace(/_/g, ' ')
      .toLowerCase()}, first appearing in the ${home ? home.biome.replace(/_/g, ' ').toLowerCase() : 'open world'}${
      s.isExtinct ? `, extinct since year ${s.extinctionYear}` : ''
    }.`;

    body = (
      <>
        <Section title="Genome">
          <Stat label="Body size" value={`${s.genome.bodySizeMeters} m`} />
          <Stat label="Speed" value={`${s.genome.speedKmh} km/h`} />
          <Stat label="Lifespan" value={`${s.genome.lifespanYears} yr`} />
          <Stat label="Cognition" value={`${s.genome.cognition}/100`} tone={s.isSapient ? 'var(--ws-deep-time)' : undefined} />
          <Stat label="Locomotion" value={s.genome.locomotion.replace(/_/g, ' ').toLowerCase()} />
          <Stat label="Senses" value={s.genome.sensoryModality.replace(/_/g, ' ').toLowerCase()} />
          <Stat label="Manipulation" value={s.genome.manipulationOrgan.replace(/_/g, ' ').toLowerCase()} />
        </Section>

        <Section title="Standing">
          <Stat
            label="Total population"
            value={s.isExtinct ? 'extinct' : s.totalPopulation.toLocaleString()}
            tone={s.isExtinct ? 'var(--ws-alarm)' : 'var(--ws-life)'}
          />
          {s.sapienceEmergenceYear !== undefined && <Stat label="Sapience since" value={`year ${s.sapienceEmergenceYear}`} />}
          {s.extinctionCause && <Stat label="Cause of loss" value={s.extinctionCause} tone="var(--ws-alarm)" />}
        </Section>

        {parent && (
          <Section title="Descent">
            <button
              onClick={() => onSelectEntity({ type: 'SPECIES', id: parent.id })}
              className="ws-chip w-full text-left px-2.5 py-2 flex items-center justify-between gap-2"
            >
              <span className="min-w-0">
                <span className="block text-[10.5px]" style={{ color: 'var(--ws-ink-faint)' }}>
                  diverged from
                </span>
                <span className="block text-[12px] truncate" style={{ color: 'var(--ws-ink)' }}>
                  {parent.commonName}
                </span>
              </span>
              <ChevronRight size={13} style={{ color: 'var(--ws-ink-faint)' }} />
            </button>
          </Section>
        )}
      </>
    );
  } else if (selection.type === 'SETTLEMENT') {
    const sett = settlements[selection.id];
    if (!sett) return null;
    const culture = cultures[sett.cultureId];
    const polity = polities[sett.polityId];
    const tile = grid[sett.tileY]?.[sett.tileX];

    kicker = sett.isAbandoned ? 'abandoned settlement' : sett.tier.toLowerCase();
    title = sett.name;
    subtitle = culture ? `of the ${culture.name}` : null;
    accent = 'var(--ws-culture)';
    causalNodeId = sett.causalNodeId;
    lede = `Founded in year ${sett.foundedYear}${
      tile ? ` on ${tile.riverFlow > 0.1 ? 'a river' : tile.soilFertility > 0.6 ? 'rich soil' : 'open ground'} in the ${tile.biome
        .replace(/_/g, ' ')
        .toLowerCase()}` : ''
    }${sett.isAbandoned ? `, abandoned in year ${sett.abandonmentYear}` : ''}.`;

    const built = Object.entries(sett.infrastructure)
      .filter(([, v]) => v)
      .map(([k]) => k.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim().toLowerCase());

    body = (
      <>
        <Section title="The place today">
          <Stat label="Population" value={sett.population.toLocaleString()} tone="var(--ws-culture)" />
          <Stat label="Food reserve" value={`${sett.foodSupplyDays} days`} tone={sett.foodSupplyDays < 60 ? 'var(--ws-alarm)' : undefined} />
          {polity && <Stat label="Polity" value={polity.name} />}
          {polity && <Stat label="Government" value={polity.governmentType.replace(/_/g, ' ').toLowerCase()} />}
          {polity && <Stat label="Technologies" value={polity.discoveredTechIds.length} />}
        </Section>

        {built.length > 0 && (
          <Section title="What they built">
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ws-ink-muted)' }}>
              {built.join(', ')}
            </p>
          </Section>
        )}

        {culture && (
          <Section title="How they live">
            <Stat label="Kinship" value={culture.kinship.replace(/_/g, ' ').toLowerCase()} />
            <Stat label="Building" value={culture.architecture.replace(/_/g, ' ').toLowerCase()} />
            <Stat label="Burial" value={culture.burial.replace(/_/g, ' ').toLowerCase()} />
          </Section>
        )}
      </>
    );
  } else if (selection.type === 'RUIN') {
    const r = ruins[selection.id];
    if (!r) return null;
    kicker = 'ruin';
    title = `Ruins of ${r.originalName}`;
    subtitle = `standing from year ${r.foundedYear} to ${r.collapsedYear}`;
    accent = 'var(--ws-deep-time)';
    causalNodeId = r.id;
    lede = r.collapseCause;

    body = (
      <>
        <Section title="Condition">
          <Stat label="Decay" value={`${Math.round(r.decayLevel * 100)}%`} />
          <Stat label="Excavated" value={`${Math.round(r.excavationLevel * 100)}%`} />
          <Stat label="Stood for" value={`${r.collapsedYear - r.foundedYear} years`} />
          {r.shelteredTroglobites && <Stat label="Now sheltering" value="subterranean life" tone="var(--ws-life)" />}
        </Section>
        <Section title="Still standing">
          <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ws-ink-muted)' }}>
            {r.prominentStructures.join(', ')}
          </p>
        </Section>
        {r.artifactsRemaining.length > 0 && (
          <Section title="Left behind">
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ws-ink-muted)' }}>
              {r.artifactsRemaining.join(', ')}
            </p>
          </Section>
        )}
      </>
    );
  } else {
    title = selection.id;
  }

  return (
    <aside
      className="ws-panel ws-rise absolute right-3 top-16 z-20 flex flex-col overflow-hidden
                 w-[min(340px,calc(100vw-24px))] max-h-[calc(100vh-190px)]"
      style={{ background: 'var(--ws-surface-strong)' }}
      aria-label="Inspector"
    >
      <header className="px-4 pt-3.5 pb-3 border-b" style={{ borderColor: 'var(--ws-hairline)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: accent }}>
              {kicker}
            </div>
            <h3 className="ws-display text-[17px] leading-tight capitalize" style={{ color: 'var(--ws-ink)' }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11.5px] mt-0.5 italic" style={{ color: 'var(--ws-ink-faint)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close Inspector" className="p-1.5 rounded-md hover:bg-white/10 shrink-0" style={{ color: 'var(--ws-ink-faint)' }}>
            <X size={15} />
          </button>
        </div>

        {lede && (
          <p className="text-[12px] leading-relaxed mt-2.5" style={{ color: 'var(--ws-ink-muted)' }}>
            {lede}
          </p>
        )}
      </header>

      {/* Curiosity triad: always the same three moves, wherever you are. */}
      <div className="grid grid-cols-3 gap-1 px-3 py-2.5 border-b" style={{ borderColor: 'var(--ws-hairline)' }}>
        <button
          onClick={() => onPinEntity(selection)}
          aria-pressed={isPinned}
          className="ws-chip flex flex-col items-center gap-1 py-2 text-[11px]"
          style={isPinned ? { color: 'var(--ws-culture)' } : { color: 'var(--ws-ink-muted)' }}
          title="Keep this subject in view across deep time"
        >
          <Pin size={14} />
          {isPinned ? 'Following' : 'Follow'}
        </button>
        <button
          onClick={() => onOpenWhyForNode(causalNodeId || `cause_${selection.type.toLowerCase()}_${selection.id}`)}
          className="ws-chip flex flex-col items-center gap-1 py-2 text-[11px]"
          style={{ color: 'var(--ws-deep-time)' }}
          title="Trace the chain of causes that produced this"
        >
          <HelpCircle size={14} />
          Why?
        </button>
        <button
          onClick={() => onOpenWorldLab?.()}
          className="ws-chip flex flex-col items-center gap-1 py-2 text-[11px]"
          style={{ color: 'var(--ws-culture)' }}
          title="Change something and watch the consequences"
        >
          <Sparkles size={14} />
          What if?
        </button>
      </div>

      <div className="px-4 py-3 overflow-y-auto space-y-4">
        {body}

        {selection.type === 'SPECIES' && onOpenFieldGuide && (
          <button onClick={onOpenFieldGuide} className="ws-chip w-full flex items-center justify-center gap-2 py-2 text-[12px]" style={{ color: 'var(--ws-life)' }}>
            <Dna size={14} />
            Open in Field Guide
          </button>
        )}
        {selection.type === 'SETTLEMENT' && onOpenCivilizationDossier && (
          <button onClick={onOpenCivilizationDossier} className="ws-chip w-full flex items-center justify-center gap-2 py-2 text-[12px]" style={{ color: 'var(--ws-culture)' }}>
            <Landmark size={14} />
            Open civilisation dossier
          </button>
        )}
      </div>
    </aside>
  );
};
