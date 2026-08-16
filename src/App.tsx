// WORLDSEED — Master Simulation Application with Megaloop Multi-View, Immersion Mode & 3D Tools

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers, Search, Volume2, VolumeX, Sparkles,
  Settings, Globe, Dna, Landmark, GitCompare
} from 'lucide-react';
import { WorldConfig, WorldState, InspectionSelection, WorldViewMode } from './types/simulation';
import { SimulationEngine } from './simulation/engine';
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

export const App: React.FC = () => {
  const engineRef = useRef<SimulationEngine | null>(null);
  const [state, setState] = useState<WorldState>(() => {
    const engine = new SimulationEngine(DEFAULT_CONFIG);
    engineRef.current = engine;
    return engine.getState();
  });

  const [activeLayer, setActiveLayer] = useState<MapLayerMode>('PHYSICAL');
  const [viewMode, setViewMode] = useState<WorldViewMode>('FLAT_ATLAS');
  const [selectedEntity, setSelectedEntity] = useState<InspectionSelection | null>(null);
  const [pinnedEntity, setPinnedEntity] = useState<InspectionSelection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isImmersionMode, setIsImmersionMode] = useState(false);

  const [activeModal, setActiveModal] = useState<
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
    | null
  >(null);
  const [whyNodeId, setWhyNodeId] = useState<string | null>(null);

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
    const newState = engineRef.current.step(years);
    setState({ ...newState });
  }, []);

  // The SimulationEngine owns the authoritative world state. Keep its runtime controls
  // synchronized with the React presentation copy so the next engine.step() cannot
  // silently restore stale isPaused/simulationSpeed values.
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
      const newState = engineRef.current.step(stepCount);
      setState({ ...newState });
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [state.isPaused, state.simulationSpeed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveModal(prev => (prev === 'COMMAND_PALETTE' ? null : 'COMMAND_PALETTE'));
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
        setSelectedEntity(null);
      } else if (e.key.toLowerCase() === 't') setActiveModal('TREE_OF_LIFE');
      else if (e.key.toLowerCase() === 'c') setActiveModal('CHRONICLE');
      else if (e.key.toLowerCase() === 'w') setActiveModal('WORLD_LAB');
      else if (e.key.toLowerCase() === 'd') setActiveModal('DISCOVERIES');
      else if (e.key.toLowerCase() === 'v') {
        const modes: WorldViewMode[] = ['FLAT_ATLAS', 'SQUARE_TILE', 'GLOBE', 'SNOW_GLOBE', 'RELIEF_DIORAMA', 'ORBITAL_VIEW'];
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
      return;
    }

    const foundSett = Object.values(state.settlements).find(s => s.name.toLowerCase().includes(q));
    if (foundSett) {
      setSelectedEntity({ type: 'SETTLEMENT', id: foundSett.id });
      setSearchQuery('');
      return;
    }

    const foundRuin = Object.values(state.ruins).find(r => r.originalName.toLowerCase().includes(q));
    if (foundRuin) {
      setSelectedEntity({ type: 'RUIN', id: foundRuin.id });
      setSearchQuery('');
    }
  };

  const handleCreateNewWorld = (newConfig: WorldConfig) => {
    const newEngine = new SimulationEngine(newConfig);
    engineRef.current = newEngine;
    setSelectedEntity(null);
    setPinnedEntity(null);
    setActiveModal(null);
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

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {!isImmersionMode && (
        <header className="h-14 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 flex items-center justify-between z-30 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal('NEW_WORLD_WIZARD')}
                className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 via-indigo-600 to-emerald-500 flex items-center justify-center font-serif font-black text-white text-base shadow-lg shadow-sky-950 hover:scale-105 transition-all"
                title="Open Planet Genesis Wizard"
              >
                W
              </button>
              <div>
                <h1 className="font-serif font-black tracking-wider text-sm text-white flex items-center gap-1.5">
                  <span>WORLDSEED</span>
                  <span className="text-[10px] font-mono font-normal text-sky-400 bg-sky-950 px-1.5 rounded border border-sky-800">
                    {state.config.genre || 'REALISTIC'}
                  </span>
                </h1>
                <div className="text-[10px] font-mono text-slate-400">
                  Seed: <span className="text-amber-400">{state.config.seed}</span> | Topology: <span className="text-sky-300">{state.config.topology || 'SPHERICAL'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative w-64 max-w-xs hidden md:block">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search species, cities, ruins..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg pl-8 pr-12 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
              />
              <kbd
                onClick={() => setActiveModal('COMMAND_PALETTE')}
                className="absolute right-2 top-2 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-slate-400 cursor-pointer hover:text-white"
              >
                ⌘K
              </kbd>
            </form>

            <button
              onClick={() => setActiveModal('NEW_WORLD_WIZARD')}
              className="px-2.5 py-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">New World</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs font-mono">
              <Globe size={14} className="text-amber-400" />
              <select
                value={viewMode}
                onChange={e => setViewMode(e.target.value as WorldViewMode)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="FLAT_ATLAS" className="bg-slate-900 text-white">Flat Atlas (2D)</option>
                <option value="SQUARE_TILE" className="bg-slate-900 text-white">Square Board (Slab)</option>
                <option value="GLOBE" className="bg-slate-900 text-white">3D Globe</option>
                <option value="SNOW_GLOBE" className="bg-slate-900 text-white">Snow Globe Diorama</option>
                <option value="RELIEF_DIORAMA" className="bg-slate-900 text-white">Relief Terrain Slab</option>
                <option value="ORBITAL_VIEW" className="bg-slate-900 text-white">Orbital Cosmos</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs font-mono">
              <Layers size={14} className="text-sky-400" />
              <select
                value={activeLayer}
                onChange={e => setActiveLayer(e.target.value as MapLayerMode)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="PHYSICAL" className="bg-slate-900 text-white">Physical Relief</option>
                <option value="BIOMES" className="bg-slate-900 text-white">Whittaker Biomes</option>
                <option value="TEMPERATURE" className="bg-slate-900 text-white">Temperature Thermal</option>
                <option value="RAINFALL" className="bg-slate-900 text-white">Rainfall & Moisture</option>
                <option value="BIODIVERSITY" className="bg-slate-900 text-white">Species Biodiversity</option>
                <option value="POLITICAL" className="bg-slate-900 text-white">Polity Territories</option>
                <option value="SETTLEMENTS" className="bg-slate-900 text-white">Cities & Roads</option>
                <option value="CULTURES" className="bg-slate-900 text-white">Cultural Footprints</option>
                <option value="LANGUAGES" className="bg-slate-900 text-white">Language Families</option>
                <option value="DISEASES" className="bg-slate-900 text-white">Contagion Vectors</option>
                <option value="RUINS_ARCHAEOLOGY" className="bg-slate-900 text-white">Ruins & Fossils</option>
                <option value="ENVIRONMENTAL_SCARS" className="bg-slate-900 text-white">Environmental Scars</option>
              </select>
            </div>

            <button
              onClick={() => setActiveModal('FIELD_GUIDE')}
              className="p-2 bg-slate-800 border border-slate-700 text-emerald-400 hover:text-white rounded-lg"
              title="3D Biological Field Guide"
            >
              <Dna size={16} />
            </button>

            <button
              onClick={() => setActiveModal('CIVILIZATION_DOSSIER')}
              className="p-2 bg-slate-800 border border-slate-700 text-amber-400 hover:text-white rounded-lg"
              title="Civilization Dossier & 3D Architecture"
            >
              <Landmark size={16} />
            </button>

            <button
              onClick={() => setActiveModal('TWIN_WORLDS')}
              className="p-2 bg-slate-800 border border-slate-700 text-indigo-400 hover:text-white rounded-lg"
              title="Twin-Worlds Counterfactuals"
            >
              <GitCompare size={16} />
            </button>

            <button
              onClick={() => setActiveModal('SETTINGS')}
              className="p-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg"
              title="Settings Hub"
            >
              <Settings size={16} />
            </button>

            <button
              onClick={toggleAudio}
              className={`p-2 rounded-lg border transition-all ${
                isAudioMuted
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-indigo-950 border-indigo-700 text-indigo-300 shadow-md shadow-indigo-950'
              }`}
              title={isAudioMuted ? 'Unmute Ambient Soundscape' : 'Mute Soundscape'}
              aria-label="Soundscape Audio"
            >
              {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 relative w-full h-full overflow-hidden">
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

        {isImmersionMode && (
          <ImmersionOverlay state={state} onExitImmersion={() => setIsImmersionMode(false)} onTogglePlay={handleTogglePlay} />
        )}

        {!isImmersionMode && (
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
          />
        )}
      </main>

      {!isImmersionMode && (
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
      )}

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
          state={state}
          onClose={() => setActiveModal(null)}
          onLoadWorld={loaded => {
            const newEngine = new SimulationEngine(loaded.config);
            (newEngine as any).state = loaded;
            engineRef.current = newEngine;
            setState({ ...loaded });
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
