import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Globe,
  Layers,
  Search,
  Settings,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { InspectionSelection, WorldConfig, WorldState, WorldViewMode } from './types/simulation';
import { SimulationEngine } from './simulation/engine';
import { snapshotEngineRuntime, restoreEngineRuntime } from './persistence/runtimeSnapshot';
import { soundscape } from './audio/soundscape';
import { MapLayerMode, WorldCanvas } from './ui/components/WorldCanvas';
import { TimelineControls } from './ui/components/TimelineControls';
import { InspectorPanel } from './ui/components/InspectorPanel';
import { WhyModal } from './ui/components/WhyModal';
import { TreeOfLifeModal } from './ui/components/TreeOfLifeModal';
import { ChronicleModal } from './ui/components/ChronicleModal';
import { LanguageFamilyModal } from './ui/components/LanguageFamilyModal';
import { BranchCompareModal } from './ui/components/BranchCompareModal';
import { WorldLabModal } from './ui/components/WorldLabModal';
import { DiscoveriesModal } from './ui/components/DiscoveriesModal';
import { StatsModal } from './ui/components/StatsModal';
import { SaveLoadModal } from './ui/components/SaveLoadModal';
import { HotkeysModal } from './ui/components/HotkeysModal';
import { SettingsModal } from './ui/components/SettingsModal';
import { NewWorldWizardModal } from './ui/components/NewWorldWizardModal';
import { CommandPaletteModal } from './ui/components/CommandPaletteModal';
import { TwinWorldsModal } from './ui/components/TwinWorldsModal';
import { FieldGuideModal } from './ui/components/FieldGuideModal';
import { CivilizationDossierModal } from './ui/components/CivilizationDossierModal';
import { ImmersionOverlay } from './ui/components/ImmersionOverlay';

const DEFAULT_CONFIG: WorldConfig = {
  seed: 482910,
  width: 64,
  height: 48,
  preset: 'DEEP_TIME',
  topology: 'SPHERICAL',
  genre: 'REALISTIC',
  startingEra: 'PREBIOTIC',
  seaLevel: 0.42,
  volcanism: 0.35,
  tectonicPlatesCount: 8,
  axialTilt: 23.5,
  initialLifeDiversity: 5,
  sapienceLikelihood: 1.0
};

type ModalKey =
  | 'WHY'
  | 'TREE_OF_LIFE'
  | 'CHRONICLE'
  | 'LANGUAGES'
  | 'WORLD_LAB'
  | 'BRANCH'
  | 'DISCOVERIES'
  | 'STATS'
  | 'SAVE_LOAD'
  | 'HOTKEYS'
  | 'SETTINGS'
  | 'NEW_WORLD_WIZARD'
  | 'COMMAND_PALETTE'
  | 'TWIN_WORLDS'
  | 'FIELD_GUIDE'
  | 'CIVILIZATION_DOSSIER';

const viewLabels: Record<WorldViewMode, string> = {
  FLAT_ATLAS: 'Atlas',
  SQUARE_TILE: 'World Table',
  GLOBE: 'Globe',
  SNOW_GLOBE: 'Snow Globe',
  RELIEF_DIORAMA: 'Relief',
  ORBITAL_VIEW: 'Orbit'
};

const layerLabels: Record<MapLayerMode, string> = {
  PHYSICAL: 'Physical',
  BIOMES: 'Biomes',
  TEMPERATURE: 'Temperature',
  RAINFALL: 'Rainfall',
  BIODIVERSITY: 'Biodiversity',
  POLITICAL: 'Polities',
  SETTLEMENTS: 'Settlements',
  CULTURES: 'Cultures',
  LANGUAGES: 'Languages',
  DISEASES: 'Disease',
  RUINS_ARCHAEOLOGY: 'Archaeology',
  ENVIRONMENTAL_SCARS: 'Scars'
};

export const App: React.FC = () => {
  const engineRef = useRef<SimulationEngine | null>(null);
  const [state, setState] = useState<WorldState>(() => {
    const engine = new SimulationEngine(DEFAULT_CONFIG);
    engineRef.current = engine;
    return engine.getState();
  });

  const [activeLayer, setActiveLayer] = useState<MapLayerMode>('PHYSICAL');
  const [viewMode, setViewMode] = useState<WorldViewMode>('GLOBE');
  const [selectedEntity, setSelectedEntity] = useState<InspectionSelection | null>(null);
  const [pinnedEntity, setPinnedEntity] = useState<InspectionSelection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isImmersionMode, setIsImmersionMode] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const [whyNodeId, setWhyNodeId] = useState<string | null>(null);

  const handleStepYears = useCallback((years: number) => {
    if (!engineRef.current) return;
    const newState = engineRef.current.step(years);
    setState({ ...newState });
  }, []);

  const handleTogglePlay = useCallback(() => {
    setState(prev => {
      const nextPaused = !prev.isPaused;
      const engineState = engineRef.current?.getState();
      if (engineState) engineState.isPaused = nextPaused;
      return { ...prev, isPaused: nextPaused };
    });
  }, []);

  const handleSetSpeed = useCallback((speed: number) => {
    const safeSpeed = Math.max(1, Math.min(1000, speed));
    setState(prev => {
      const engineState = engineRef.current?.getState();
      if (engineState) engineState.simulationSpeed = safeSpeed;
      return { ...prev, simulationSpeed: safeSpeed };
    });
  }, []);

  const toggleAudio = useCallback(() => {
    const nextMuted = !isAudioMuted;
    if (!nextMuted) {
      soundscape.init();
      soundscape.resume();
    }
    soundscape.setMuted(nextMuted);
    setIsAudioMuted(nextMuted);
  }, [isAudioMuted]);

  useEffect(() => {
    if (state.isPaused) return;

    const intervalMs = Math.max(20, Math.floor(1000 / state.simulationSpeed));
    const stepCount = state.simulationSpeed > 100 ? 5 : 1;
    const interval = window.setInterval(() => {
      if (!engineRef.current) return;
      const newState = engineRef.current.step(stepCount);
      setState({ ...newState });
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [state.isPaused, state.simulationSpeed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveModal(prev => (prev === 'COMMAND_PALETTE' ? null : 'COMMAND_PALETTE'));
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        setIsImmersionMode(prev => !prev);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === '1') handleSetSpeed(1);
      else if (e.key === '2') handleSetSpeed(5);
      else if (e.key === '3') handleSetSpeed(20);
      else if (e.key === '4') handleSetSpeed(100);
      else if (e.key === '5') handleSetSpeed(1000);
      else if (e.key === 'Escape') {
        setActiveModal(null);
        setSearchOpen(false);
        setToolsOpen(false);
        setSelectedEntity(null);
      } else if (e.key.toLowerCase() === 't') setActiveModal('TREE_OF_LIFE');
      else if (e.key.toLowerCase() === 'c') setActiveModal('CHRONICLE');
      else if (e.key.toLowerCase() === 'v') {
        const modes: WorldViewMode[] = ['GLOBE', 'RELIEF_DIORAMA', 'ORBITAL_VIEW', 'SNOW_GLOBE', 'FLAT_ATLAS', 'SQUARE_TILE'];
        const nextIdx = (modes.indexOf(viewMode) + 1) % modes.length;
        setViewMode(modes[nextIdx]);
      } else if (e.key === '?') setActiveModal('HOTKEYS');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSetSpeed, viewMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();

    const foundSpecies = Object.values(state.species).find(
      s => s.commonName.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q)
    );
    if (foundSpecies) {
      setSelectedEntity({ type: 'SPECIES', id: foundSpecies.id });
      setSearchQuery('');
      setSearchOpen(false);
      return;
    }

    const foundSettlement = Object.values(state.settlements).find(s => s.name.toLowerCase().includes(q));
    if (foundSettlement) {
      setSelectedEntity({ type: 'SETTLEMENT', id: foundSettlement.id });
      setSearchQuery('');
      setSearchOpen(false);
      return;
    }

    const foundRuin = Object.values(state.ruins).find(r => r.originalName.toLowerCase().includes(q));
    if (foundRuin) {
      setSelectedEntity({ type: 'RUIN', id: foundRuin.id });
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const handleCreateNewWorld = (newConfig: WorldConfig) => {
    const newEngine = new SimulationEngine(newConfig);
    engineRef.current = newEngine;
    setSelectedEntity(null);
    setPinnedEntity(null);
    setActiveModal(null);
    setToolsOpen(false);
    setSearchOpen(false);
    setState(newEngine.getState());
  };

  const handleApplyIntervention = (type: any, params?: any) => {
    if (!engineRef.current) return;
    engineRef.current.applyIntervention(type, params);
    soundscape.playDiscoveryFanfare();
    setState({ ...engineRef.current.getState() });
  };

  const handleForkBranch = (branchName: string) => {
    if (!engineRef.current) return;
    engineRef.current.forkBranch(branchName);
    soundscape.playDiscoveryFanfare();
    setState({ ...engineRef.current.getState() });
  };

  const handleOpenWhy = (nodeId?: string) => {
    const id = nodeId || (selectedEntity ? `cause_${selectedEntity.type.toLowerCase()}_${selectedEntity.id}` : Object.keys(state.causalGraph)[0]);
    setWhyNodeId(id);
    setActiveModal('WHY');
  };

  const handleCommandPaletteAction = (action: string, payload?: any) => {
    if (action === 'SET_VIEW') setViewMode(payload);
    else if (action === 'OPEN_MODAL') setActiveModal(payload);
    else if (action === 'SELECT_ENTITY') setSelectedEntity(payload);
  };

  const openTool = (modal: ModalKey) => {
    setToolsOpen(false);
    setActiveModal(modal);
  };

  const persistableState = snapshotEngineRuntime(engineRef.current, state);
  const currentEra = state.eras.length > 0 ? state.eras[state.eras.length - 1] : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#02060b] text-slate-100 font-sans select-none">
      <main className="absolute inset-0" aria-label="WORLDSEED simulation surface">
        <WorldCanvas
          state={state}
          activeLayer={activeLayer}
          viewMode={viewMode}
          selectedEntity={selectedEntity}
          pinnedEntity={pinnedEntity}
          onSelectEntity={setSelectedEntity}
          onUnpinEntity={() => setPinnedEntity(null)}
          onOpenWhy={handleOpenWhy}
        />
      </main>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,6,23,0.42)_100%)]" />

      {isImmersionMode ? (
        <ImmersionOverlay state={state} onExitImmersion={() => setIsImmersionMode(false)} onTogglePlay={handleTogglePlay} />
      ) : (
        <>
          <div data-testid="world-hud" className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 p-4">
            <button
              type="button"
              onClick={() => setActiveModal('NEW_WORLD_WIZARD')}
              className="pointer-events-auto group rounded-2xl border border-white/10 bg-slate-950/55 px-3.5 py-2.5 text-left shadow-2xl backdrop-blur-xl transition hover:bg-slate-950/75"
              title="Create a new world"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 font-serif text-sm font-black text-white transition group-hover:bg-white/15">W</span>
                <span>
                  <span className="block text-[11px] font-semibold tracking-[0.22em] text-slate-100">WORLDSEED</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    {state.config.genre} · seed {state.config.seed}
                  </span>
                </span>
              </div>
            </button>

            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/55 p-1.5 shadow-2xl backdrop-blur-xl">
              <label className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[11px] text-slate-300" title="World presentation">
                <Globe size={14} className="text-sky-300" />
                <select
                  data-testid="view-select"
                  value={viewMode}
                  onChange={e => setViewMode(e.target.value as WorldViewMode)}
                  className="max-w-[112px] cursor-pointer bg-transparent py-1 text-[11px] font-medium text-slate-100 outline-none"
                  aria-label="World view"
                >
                  {Object.entries(viewLabels).map(([value, label]) => (
                    <option key={value} value={value} className="bg-slate-950 text-white">{label}</option>
                  ))}
                </select>
              </label>

              <span className="h-5 w-px bg-white/10" />

              <label className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[11px] text-slate-300" title="Observation layer">
                <Layers size={14} className="text-emerald-300" />
                <select
                  data-testid="layer-select"
                  value={activeLayer}
                  onChange={e => setActiveLayer(e.target.value as MapLayerMode)}
                  className="max-w-[118px] cursor-pointer bg-transparent py-1 text-[11px] font-medium text-slate-100 outline-none"
                  aria-label="Observation layer"
                >
                  {Object.entries(layerLabels).map(([value, label]) => (
                    <option key={value} value={value} className="bg-slate-950 text-white">{label}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setSearchOpen(prev => !prev)}
                className="grid h-8 w-8 place-items-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Search world"
                title="Search world (/)"
              >
                <Search size={16} />
              </button>

              <button
                data-testid="world-tools-button"
                type="button"
                onClick={() => setToolsOpen(prev => !prev)}
                className={`grid h-8 w-8 place-items-center rounded-xl transition ${toolsOpen ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                aria-label="Open world tools"
                title="World tools"
              >
                <Settings size={16} />
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('NEW_WORLD_WIZARD')}
                className="flex h-8 items-center gap-1.5 rounded-xl bg-sky-500/90 px-3 text-[11px] font-semibold text-slate-950 shadow-lg shadow-sky-950/40 transition hover:bg-sky-400"
              >
                <Sparkles size={14} />
                New world
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-4 z-40 w-[min(520px,calc(100vw-32px))] -translate-x-1/2">
            {searchOpen && (
              <form onSubmit={handleSearchSubmit} className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/88 p-2 shadow-2xl backdrop-blur-2xl animate-fade-in">
                <Search size={17} className="ml-2 text-slate-400" />
                <input
                  autoFocus
                  type="search"
                  placeholder="Find a species, city, or ruin…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
                  aria-label="Search species, cities, and ruins"
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="rounded-xl px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white">Esc</button>
              </form>
            )}
          </div>

          {toolsOpen && (
            <aside data-testid="world-tools-panel" className="absolute right-4 top-[68px] z-40 w-[292px] rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-2xl animate-fade-in">
              <div className="mb-2 flex items-center justify-between px-1">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">World tools</div>
                  <div className="mt-0.5 text-xs text-slate-300">Open only what you need.</div>
                </div>
                <button type="button" onClick={() => setToolsOpen(false)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-white/10 hover:text-white">Close</button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ['TREE_OF_LIFE', 'Tree of Life'],
                  ['CHRONICLE', 'Chronicle'],
                  ['WORLD_LAB', 'What if?'],
                  ['DISCOVERIES', 'Discoveries'],
                  ['FIELD_GUIDE', 'Field Guide'],
                  ['CIVILIZATION_DOSSIER', 'Civilizations'],
                  ['LANGUAGES', 'Languages'],
                  ['TWIN_WORLDS', 'Twin Worlds'],
                  ['BRANCH', 'Fork World'],
                  ['STATS', 'World Stats'],
                  ['SAVE_LOAD', 'Save & Load'],
                  ['SETTINGS', 'Settings']
                ].map(([modal, label]) => (
                  <button
                    key={modal}
                    type="button"
                    onClick={() => openTool(modal as ModalKey)}
                    className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-left text-[11px] font-medium text-slate-300 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                    title={label === 'Save & Load' ? 'Local Saves & World Export/Import' : label}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-white/8 pt-2">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] transition ${isAudioMuted ? 'bg-white/[0.035] text-slate-400 hover:bg-white/[0.08] hover:text-white' : 'bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'}`}
                  aria-pressed={!isAudioMuted}
                  title={isAudioMuted ? 'Enable sparse event audio' : 'Mute audio'}
                >
                  {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  {isAudioMuted ? 'Audio off' : 'Event audio on'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsImmersionMode(true)}
                  className="rounded-xl bg-white/[0.035] px-3 py-2 text-left text-[11px] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                  title="Hide interface chrome"
                >
                  Immersion
                </button>
              </div>
            </aside>
          )}

          <div className="pointer-events-none absolute left-4 bottom-4 z-20 max-w-[420px] rounded-xl bg-slate-950/30 px-3 py-2 text-[10px] text-slate-400 backdrop-blur-sm">
            <span className="font-medium text-slate-200">{currentEra?.name || 'Deep time'}</span>
            <span className="mx-2 text-slate-700">·</span>
            Drag to orbit · wheel to zoom · click the world to inspect
          </div>

          <InspectorPanel
            selection={selectedEntity}
            state={state}
            pinnedEntity={pinnedEntity}
            onClose={() => setSelectedEntity(null)}
            onSelectEntity={setSelectedEntity}
            onPinEntity={setPinnedEntity}
            onOpenWhyForNode={handleOpenWhy}
            onOpenFieldGuide={() => setActiveModal('FIELD_GUIDE')}
            onOpenCivilizationDossier={() => setActiveModal('CIVILIZATION_DOSSIER')}
            onOpenWhatIf={() => setActiveModal('WORLD_LAB')}
          />

          <TimelineControls
            state={state}
            onTogglePlay={handleTogglePlay}
            onSetSpeed={handleSetSpeed}
            onStepYears={handleStepYears}
            onOpenWhy={() => handleOpenWhy()}
            onOpenTreeOfLife={() => setActiveModal('TREE_OF_LIFE')}
            onOpenChronicle={() => setActiveModal('CHRONICLE')}
            onOpenLanguages={() => setActiveModal('LANGUAGES')}
            onOpenWorldLab={() => setActiveModal('WORLD_LAB')}
            onOpenBranchCompare={() => setActiveModal('BRANCH')}
            onOpenDiscoveries={() => setActiveModal('DISCOVERIES')}
            onOpenStats={() => setActiveModal('STATS')}
            onOpenSaveLoad={() => setActiveModal('SAVE_LOAD')}
          />
        </>
      )}

      {activeModal === 'WHY' && (
        <WhyModal nodeId={whyNodeId} state={state} onClose={() => setActiveModal(null)} onSelectNode={nodeId => setWhyNodeId(nodeId)} />
      )}

      {activeModal === 'TREE_OF_LIFE' && (
        <TreeOfLifeModal
          state={state}
          onClose={() => setActiveModal(null)}
          onSelectSpecies={sId => {
            setSelectedEntity({ type: 'SPECIES', id: sId });
            setActiveModal(null);
          }}
          onOpenWhy={nodeId => {
            setWhyNodeId(nodeId);
            setActiveModal('WHY');
          }}
        />
      )}

      {activeModal === 'CHRONICLE' && (
        <ChronicleModal
          state={state}
          onClose={() => setActiveModal(null)}
          onSelectCoordinates={(x, y) => {
            setSelectedEntity({ type: 'TILE', id: `${x},${y}` });
            setActiveModal(null);
          }}
          onOpenWhy={nodeId => {
            setWhyNodeId(nodeId);
            setActiveModal('WHY');
          }}
        />
      )}

      {activeModal === 'LANGUAGES' && <LanguageFamilyModal state={state} onClose={() => setActiveModal(null)} />}

      {activeModal === 'BRANCH' && (
        <BranchCompareModal state={state} onClose={() => setActiveModal(null)} onForkBranch={handleForkBranch} />
      )}

      {activeModal === 'WORLD_LAB' && (
        <WorldLabModal state={state} onClose={() => setActiveModal(null)} onApplyIntervention={handleApplyIntervention} />
      )}

      {activeModal === 'DISCOVERIES' && (
        <DiscoveriesModal
          state={state}
          onClose={() => setActiveModal(null)}
          onSelectCoordinates={(x, y) => {
            setSelectedEntity({ type: 'TILE', id: `${x},${y}` });
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'STATS' && <StatsModal state={state} onClose={() => setActiveModal(null)} />}

      {activeModal === 'SAVE_LOAD' && (
        <SaveLoadModal
          state={persistableState}
          onClose={() => setActiveModal(null)}
          onLoadWorld={loaded => {
            const restoredEngine = restoreEngineRuntime(loaded);
            engineRef.current = restoredEngine;
            setState({ ...restoredEngine.getState() });
          }}
          onResetWorld={handleCreateNewWorld}
        />
      )}

      {activeModal === 'HOTKEYS' && <HotkeysModal onClose={() => setActiveModal(null)} />}

      {activeModal === 'SETTINGS' && (
        <SettingsModal currentViewMode={viewMode} onSetViewMode={setViewMode} onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'NEW_WORLD_WIZARD' && (
        <NewWorldWizardModal onClose={() => setActiveModal(null)} onCreateWorld={handleCreateNewWorld} />
      )}

      {activeModal === 'COMMAND_PALETTE' && (
        <CommandPaletteModal state={state} onClose={() => setActiveModal(null)} onSelectAction={handleCommandPaletteAction} />
      )}

      {activeModal === 'TWIN_WORLDS' && <TwinWorldsModal primaryState={state} onClose={() => setActiveModal(null)} />}

      {activeModal === 'FIELD_GUIDE' && (
        <FieldGuideModal
          state={state}
          onClose={() => setActiveModal(null)}
          onSelectSpecies={sId => {
            setSelectedEntity({ type: 'SPECIES', id: sId });
            setActiveModal(null);
          }}
          onOpenWhy={nodeId => {
            setWhyNodeId(nodeId);
            setActiveModal('WHY');
          }}
        />
      )}

      {activeModal === 'CIVILIZATION_DOSSIER' && (
        <CivilizationDossierModal state={state} onClose={() => setActiveModal(null)} onOpenWhy={handleOpenWhy} />
      )}
    </div>
  );
};
