// WORLDSEED — application shell.
//
// Composition rule: the simulation is the interface. The world fills the window; chrome
// floats over it in four small clusters (identity, controls, time, inspection) and nothing
// else is permanently on screen.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Volume2, VolumeX, Sparkles, Globe2, Layers, Maximize2 } from 'lucide-react';
import { WorldConfig, WorldState, InspectionSelection, WorldViewMode } from './types/simulation';
import { SimulationEngine } from './simulation/engine';
import { ERA_PROFILES } from './simulation/scenarios/startingEra';
import { snapshotEngineRuntime, restoreEngineRuntime } from './persistence/runtimeSnapshot';
import { soundscape } from './audio/soundscape';
import { MapLayerMode, WorldCanvas } from './ui/components/WorldCanvas';
import { TimelineControls } from './ui/components/TimelineControls';
import { InstrumentsMenu } from './ui/components/InstrumentsMenu';
import { FirstLightHint } from './ui/components/FirstLightHint';
import { GenesisOverlay } from './ui/components/GenesisOverlay';
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

const VIEW_OPTIONS: Array<{ value: WorldViewMode; label: string }> = [
  { value: 'GLOBE', label: 'Globe' },
  { value: 'FLAT_ATLAS', label: 'Flat Atlas' },
  { value: 'SQUARE_TILE', label: 'Square World' },
  { value: 'SNOW_GLOBE', label: 'Snow Globe' },
  { value: 'RELIEF_DIORAMA', label: 'Relief Diorama' },
  { value: 'ORBITAL_VIEW', label: 'Orbital' }
];

const LAYER_OPTIONS: Array<{ value: MapLayerMode; label: string }> = [
  { value: 'PHYSICAL', label: 'Physical Relief' },
  { value: 'BIOMES', label: 'Biomes' },
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'RAINFALL', label: 'Rainfall' },
  { value: 'BIODIVERSITY', label: 'Biodiversity' },
  { value: 'POLITICAL', label: 'Territories' },
  { value: 'SETTLEMENTS', label: 'Cities & Roads' },
  { value: 'CULTURES', label: 'Cultures' },
  { value: 'LANGUAGES', label: 'Languages' },
  { value: 'DISEASES', label: 'Contagion' },
  { value: 'RUINS_ARCHAEOLOGY', label: 'Ruins & Fossils' },
  { value: 'ENVIRONMENTAL_SCARS', label: 'Environmental Scars' }
];

const ONBOARDING_KEY = 'worldseed.introSeen';

type ModalId =
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
  | 'CIVILIZATION_DOSSIER'
  | null;

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
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isImmersionMode, setIsImmersionMode] = useState(false);
  const [showEffects, setShowEffects] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [whyNodeId, setWhyNodeId] = useState<string | null>(null);
  const [pendingWorld, setPendingWorld] = useState<WorldConfig | null>(null);

  const [showIntro, setShowIntro] = useState(() => {
    try {
      return window.localStorage.getItem(ONBOARDING_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    try {
      window.localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      /* Private-mode storage refusal must never break the app. */
    }
  }, []);

  const ensureAudio = useCallback(() => {
    soundscape.init();
    soundscape.resume();
  }, []);

  const toggleAudio = () => {
    ensureAudio();
    const newMuted = !isAudioMuted;
    setIsAudioMuted(newMuted);
    soundscape.setMuted(newMuted);
  };

  const handleStepYears = useCallback((years: number) => {
    if (!engineRef.current) return;
    setState({ ...engineRef.current.step(years) });
  }, []);

  // SimulationEngine owns the authoritative world state. Runtime controls are written
  // through to it so an engine tick cannot silently restore stale React-only values.
  const handleTogglePlay = useCallback(() => {
    ensureAudio();
    setState(prev => {
      const nextPaused = !prev.isPaused;
      const engineState = engineRef.current?.getState();
      if (engineState) engineState.isPaused = nextPaused;
      return { ...prev, isPaused: nextPaused };
    });
  }, [ensureAudio]);

  const handleSetSpeed = useCallback((speed: number) => {
    const safeSpeed = Math.max(1, Math.min(1000, speed));
    setState(prev => {
      const engineState = engineRef.current?.getState();
      if (engineState) engineState.simulationSpeed = safeSpeed;
      return { ...prev, simulationSpeed: safeSpeed };
    });
  }, []);

  useEffect(() => {
    if (state.isPaused) return;
    const intervalMs = Math.max(20, Math.floor(1000 / state.simulationSpeed));
    const stepCount = state.simulationSpeed > 100 ? 5 : 1;
    const interval = window.setInterval(() => {
      if (!engineRef.current) return;
      setState({ ...engineRef.current.step(stepCount) });
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [state.isPaused, state.simulationSpeed]);

  // Later starting eras simulate real centuries before the first frame. Generation is
  // deferred a frame so the genesis overlay is painted before the main thread blocks.
  useEffect(() => {
    if (!pendingWorld) return;
    const handle = window.setTimeout(() => {
      const engine = new SimulationEngine(pendingWorld);
      engineRef.current = engine;
      setSelectedEntity(null);
      setPinnedEntity(null);
      setState({ ...engine.getState() });
      setPendingWorld(null);
    }, 40);
    return () => window.clearTimeout(handle);
  }, [pendingWorld]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveModal(prev => (prev === 'COMMAND_PALETTE' ? null : 'COMMAND_PALETTE'));
        return;
      }

      if (e.key === 'Tab') {
        // Tab toggles Immersion Mode only while no dialog owns focus, so normal tab
        // navigation still works everywhere it matters.
        if (activeModal) return;
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
        setSelectedEntity(null);
        setSearchOpen(false);
      } else if (e.key.toLowerCase() === 't') setActiveModal('TREE_OF_LIFE');
      else if (e.key.toLowerCase() === 'c') setActiveModal('CHRONICLE');
      else if (e.key.toLowerCase() === 'l') setActiveModal('WORLD_LAB');
      else if (e.key.toLowerCase() === 'g') setActiveModal('DISCOVERIES');
      else if (e.key.toLowerCase() === 'v') {
        const nextIdx = (VIEW_OPTIONS.findIndex(o => o.value === viewMode) + 1) % VIEW_OPTIONS.length;
        setViewMode(VIEW_OPTIONS[nextIdx].value);
      } else if (e.key === '?') setActiveModal('HOTKEYS');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, handleTogglePlay, handleSetSpeed, viewMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.toLowerCase().trim();
    if (!q) return;

    const foundSpecies = Object.values(state.species).find(
      s => s.commonName.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q)
    );
    if (foundSpecies) {
      setSelectedEntity({ type: 'SPECIES', id: foundSpecies.id });
      setSearchQuery('');
      return;
    }

    const foundSett = Object.values(state.settlements).find(s => s.name.toLowerCase().includes(q));
    if (foundSett) {
      setSelectedEntity({ type: 'SETTLEMENT', id: foundSett.id });
      setSearchQuery('');
      return;
    }

    for (const row of state.grid) {
      for (const tile of row) {
        const ruin = tile.ruins.find(r => r.originalName.toLowerCase().includes(q));
        if (ruin) {
          setSelectedEntity({ type: 'RUIN', id: ruin.id });
          setSearchQuery('');
          return;
        }
      }
    }
  };

  const handleCreateNewWorld = (newConfig: WorldConfig) => {
    setActiveModal(null);
    setPendingWorld(newConfig);
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
    const id =
      nodeId || (selectedEntity ? `cause_${selectedEntity.type.toLowerCase()}_${selectedEntity.id}` : Object.keys(state.causalGraph)[0]);
    setWhyNodeId(id);
    setActiveModal('WHY');
  };

  const handleCommandPaletteAction = (action: string, payload?: any) => {
    if (action === 'SET_VIEW') setViewMode(payload);
    else if (action === 'OPEN_MODAL') setActiveModal(payload);
    else if (action === 'SELECT_ENTITY') setSelectedEntity(payload);
  };

  const persistableState = snapshotEngineRuntime(engineRef.current, state);
  const eraProfile = ERA_PROFILES[pendingWorld?.startingEra || 'PREBIOTIC'];
  const showChrome = !isImmersionMode;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: 'var(--ws-void)', color: 'var(--ws-ink)' }}>
      <WorldCanvas
        state={state}
        activeLayer={activeLayer}
        viewMode={viewMode}
        selectedEntity={selectedEntity}
        pinnedEntity={pinnedEntity}
        showEffects={showEffects}
        onSelectEntity={selection => {
          setSelectedEntity(selection);
          if (selection) dismissIntro();
        }}
        onUnpinEntity={() => setPinnedEntity(null)}
        onOpenWhy={handleOpenWhy}
      />

      {showChrome && (
        <>
          {/* Identity — small, top-left, never a title bar. */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            <button
              onClick={() => setActiveModal('NEW_WORLD_WIZARD')}
              title="Create a new world"
              className="ws-panel flex items-center gap-2.5 pl-2.5 pr-3 h-9"
            >
              <span
                className="ws-display text-[11px] w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(140deg, var(--ws-accent), var(--ws-life))', color: '#04202e' }}
              >
                W
              </span>
              <span className="ws-display text-[11.5px] leading-none" style={{ letterSpacing: '0.18em' }}>
                WORLDSEED
              </span>
            </button>
            <div
              className="ws-panel hidden md:flex items-center gap-2 h-9 px-3 ws-numeric text-[10.5px]"
              style={{ color: 'var(--ws-ink-faint)' }}
            >
              <span>seed {state.config.seed}</span>
              <span style={{ color: 'var(--ws-hairline-strong)' }}>·</span>
              <span>{(state.config.genre || 'REALISTIC').toLowerCase().replace(/_/g, ' ')}</span>
              <span style={{ color: 'var(--ws-hairline-strong)' }}>·</span>
              <span>{(state.config.topology || 'SPHERICAL').toLowerCase().replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Controls — top-right, one row, degrades gracefully on narrow viewports. */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setSearchOpen(v => !v)}
                aria-label="Search the world"
                aria-expanded={searchOpen}
                className="ws-chip flex items-center justify-center w-9 h-9 lg:hidden"
                style={{ color: 'var(--ws-ink-muted)' }}
              >
                <Search size={15} />
              </button>
              <div className={`${searchOpen ? 'flex' : 'hidden'} lg:flex items-center absolute lg:static right-0 top-11 lg:top-auto`}>
                <Search size={13} className="absolute left-2.5 pointer-events-none" style={{ color: 'var(--ws-ink-faint)' }} />
                <input
                  type="search"
                  placeholder="Find a species, city or ruin…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label="Search species, cities and ruins"
                  className="ws-chip w-[228px] h-9 pl-7 pr-2 text-[12px] outline-none"
                  style={{ color: 'var(--ws-ink)' }}
                />
              </div>
            </form>

            <label className="ws-chip flex items-center gap-1.5 h-9 pl-2.5" title="Presentation mode">
              <Globe2 size={14} style={{ color: 'var(--ws-accent)' }} />
              <span className="ws-sr-only">World view</span>
              <select
                value={viewMode}
                onChange={e => setViewMode(e.target.value as WorldViewMode)}
                aria-label="World view"
                className="ws-select bg-transparent text-[12px] h-9 outline-none cursor-pointer"
                style={{ color: 'var(--ws-ink)' }}
              >
                {VIEW_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="ws-chip hidden sm:flex items-center gap-1.5 h-9 pl-2.5" title="Map layer">
              <Layers size={14} style={{ color: 'var(--ws-life)' }} />
              <span className="ws-sr-only">Map layer</span>
              <select
                value={activeLayer}
                onChange={e => setActiveLayer(e.target.value as MapLayerMode)}
                aria-label="Map layer"
                className="ws-select bg-transparent text-[12px] h-9 outline-none cursor-pointer"
                style={{ color: 'var(--ws-ink)' }}
              >
                {LAYER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => setActiveModal('NEW_WORLD_WIZARD')}
              className="ws-chip hidden sm:flex items-center gap-1.5 h-9 px-2.5 text-[12px]"
              style={{ color: 'var(--ws-culture)' }}
              title="Create a new world"
            >
              <Sparkles size={14} />
              <span className="hidden xl:inline">New World</span>
            </button>

            <InstrumentsMenu
              onOpenTreeOfLife={() => setActiveModal('TREE_OF_LIFE')}
              onOpenFieldGuide={() => setActiveModal('FIELD_GUIDE')}
              onOpenChronicle={() => setActiveModal('CHRONICLE')}
              onOpenLanguages={() => setActiveModal('LANGUAGES')}
              onOpenCivilizationDossier={() => setActiveModal('CIVILIZATION_DOSSIER')}
              onOpenBranchCompare={() => setActiveModal('BRANCH')}
              onOpenTwinWorlds={() => setActiveModal('TWIN_WORLDS')}
              onOpenStats={() => setActiveModal('STATS')}
              onOpenSaveLoad={() => setActiveModal('SAVE_LOAD')}
              onOpenSettings={() => setActiveModal('SETTINGS')}
              onOpenHotkeys={() => setActiveModal('HOTKEYS')}
            />

            <button
              onClick={() => setIsImmersionMode(true)}
              className="ws-chip hidden sm:flex items-center justify-center w-9 h-9"
              style={{ color: 'var(--ws-ink-muted)' }}
              title="Immersion Mode (Tab)"
              aria-label="Enter Immersion Mode"
            >
              <Maximize2 size={14} />
            </button>

            <button
              onClick={toggleAudio}
              className="ws-chip flex items-center justify-center w-9 h-9"
              style={{ color: isAudioMuted ? 'var(--ws-ink-faint)' : 'var(--ws-accent)' }}
              title={isAudioMuted ? 'Enable event sounds' : 'Mute event sounds'}
              aria-label="Soundscape Audio"
              aria-pressed={!isAudioMuted}
            >
              {isAudioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>

          <TimelineControls
            state={state}
            onTogglePlay={() => {
              dismissIntro();
              handleTogglePlay();
            }}
            onSetSpeed={handleSetSpeed}
            onStepYears={handleStepYears}
            onOpenWhy={() => handleOpenWhy()}
            onOpenWorldLab={() => setActiveModal('WORLD_LAB')}
            onOpenDiscoveries={() => setActiveModal('DISCOVERIES')}
          />

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
            onOpenWorldLab={() => setActiveModal('WORLD_LAB')}
          />

          {showIntro && !selectedEntity && !activeModal && (
            <FirstLightHint
              onDismiss={dismissIntro}
              onStartTime={() => {
                dismissIntro();
                if (state.isPaused) handleTogglePlay();
              }}
            />
          )}
        </>
      )}

      {isImmersionMode && (
        <ImmersionOverlay state={state} onExitImmersion={() => setIsImmersionMode(false)} onTogglePlay={handleTogglePlay} />
      )}

      {pendingWorld && <GenesisOverlay eraLabel={pendingWorld.startingEra || 'PREBIOTIC'} eraSummary={eraProfile.summary} />}

      {activeModal === 'WHY' && (
        <WhyModal nodeId={whyNodeId} state={state} onClose={() => setActiveModal(null)} onSelectNode={nodeId => setWhyNodeId(nodeId)} />
      )}

      {activeModal === 'TREE_OF_LIFE' && (
        <TreeOfLifeModal
          state={state}
          onClose={() => setActiveModal(null)}
          onSelectSpecies={sId => setSelectedEntity({ type: 'SPECIES', id: sId })}
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
          onSelectCoordinates={(x, y) => setSelectedEntity({ type: 'TILE', id: `${x},${y}` })}
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
          onSelectCoordinates={(x, y) => setSelectedEntity({ type: 'TILE', id: `${x},${y}` })}
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
            setSelectedEntity(null);
            setPinnedEntity(null);
            setState({ ...restoredEngine.getState() });
          }}
          onResetWorld={handleCreateNewWorld}
        />
      )}

      {activeModal === 'HOTKEYS' && <HotkeysModal onClose={() => setActiveModal(null)} />}

      {activeModal === 'SETTINGS' && (
        <SettingsModal
          currentViewMode={viewMode}
          onSetViewMode={setViewMode}
          showEffects={showEffects}
          onSetShowEffects={setShowEffects}
          onClose={() => setActiveModal(null)}
        />
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
          onSelectSpecies={sId => setSelectedEntity({ type: 'SPECIES', id: sId })}
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
