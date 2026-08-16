// Multi-Layer & Multi-View Cinematic Canvas Renderer supporting 6 Presentation Modes
// Features True WebGL 3D Rendering (Three.js) for Globe, Snow Globe, Relief Diorama, Orbital Cosmos

import React, { useEffect, useRef, useState } from 'react';
import { InspectionSelection, WorldState, WorldViewMode } from '../../types/simulation';
import { Camera3D, WorldProjectionEngine } from '../../visuals/views/projections';
import { WorldViewRenderer } from '../../visuals/views/WorldViewRenderer';
import { ParticleEngine } from '../../visuals/particles/particleEngine';
import { ThreeWorldRenderer } from '../../visuals/3d/ThreeWorldRenderer';
import { Minimap } from './Minimap';
import { MapLegend } from './MapLegend';
import { PinnedEntityFollower } from './PinnedEntityFollower';

export type MapLayerMode =
  | 'PHYSICAL'
  | 'BIOMES'
  | 'TEMPERATURE'
  | 'RAINFALL'
  | 'BIODIVERSITY'
  | 'POLITICAL'
  | 'SETTLEMENTS'
  | 'CULTURES'
  | 'LANGUAGES'
  | 'DISEASES'
  | 'RUINS_ARCHAEOLOGY'
  | 'ENVIRONMENTAL_SCARS';

interface WorldCanvasProps {
  state: WorldState;
  activeLayer: MapLayerMode;
  viewMode: WorldViewMode;
  selectedEntity: InspectionSelection | null;
  pinnedEntity: InspectionSelection | null;
  onSelectEntity: (selection: InspectionSelection | null) => void;
  onUnpinEntity: () => void;
  onOpenWhy: (nodeId: string) => void;
}

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  state,
  activeLayer,
  viewMode,
  selectedEntity: _selectedEntity,
  pinnedEntity,
  onSelectEntity,
  onUnpinEntity,
  onOpenWhy
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeContainerRef = useRef<HTMLDivElement | null>(null);
  const threeRendererRef = useRef<ThreeWorldRenderer | null>(null);
  const particleEngineRef = useRef<ParticleEngine>(new ParticleEngine());

  const is3DView = viewMode === 'GLOBE' || viewMode === 'SNOW_GLOBE' || viewMode === 'RELIEF_DIORAMA' || viewMode === 'ORBITAL_VIEW';

  const [camera, setCamera] = useState<Camera3D>({ x: 0, y: 0, zoom: 1.0, rotX: 0.15, rotY: 0.0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragThresholdPassed, setDragThresholdPassed] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

  const { grid, config } = state;
  const { width, height } = config;

  useEffect(() => {
    if (is3DView && threeContainerRef.current) {
      if (!threeRendererRef.current) threeRendererRef.current = new ThreeWorldRenderer(threeContainerRef.current);
      threeRendererRef.current.updateScene(state, viewMode);
    } else if (threeRendererRef.current) {
      threeRendererRef.current.dispose();
      threeRendererRef.current = null;
    }

    return () => {
      if (!is3DView && threeRendererRef.current) {
        threeRendererRef.current.dispose();
        threeRendererRef.current = null;
      }
    };
  }, [is3DView, viewMode, state]);

  const handleCenterCoordinates = (tileX: number, tileY: number) => {
    const canvas = canvasRef.current;
    if (is3DView && threeRendererRef.current) {
      const u = tileX / width;
      threeRendererRef.current.rotY = -(u - 0.5) * (Math.PI * 2) - Math.PI / 2;
      return;
    }
    if (!canvas) return;

    const tileSize = (Math.min(canvas.width, canvas.height) / height) * camera.zoom;
    const targetX = canvas.width / 2 - (tileX + 0.5) * tileSize;
    const targetY = canvas.height / 2 - (tileY + 0.5) * tileSize;
    setCamera(prev => ({ ...prev, x: targetX, y: targetY }));
  };

  const selectTileAt = (coords: { x: number; y: number } | null) => {
    if (!coords) return;
    const tile = grid[coords.y]?.[coords.x];
    if (!tile) return;

    if (tile.settlementId) onSelectEntity({ type: 'SETTLEMENT', id: tile.settlementId });
    else if (tile.ruins.length > 0) onSelectEntity({ type: 'RUIN', id: tile.ruins[0].id });
    else if (tile.dominantSpeciesId) onSelectEntity({ type: 'SPECIES', id: tile.dominantSpeciesId });
    else onSelectEntity({ type: 'TILE', id: `${coords.x},${coords.y}` });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragThresholdPassed(false);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (isDragging) {
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setDragThresholdPassed(true);

      if (is3DView && threeRendererRef.current) {
        threeRendererRef.current.rotate(dx, dy);
      } else {
        setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      }
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (!is3DView && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setHoveredTile(WorldProjectionEngine.screenToGrid(
        mouseX,
        mouseY,
        canvasRef.current.width,
        canvasRef.current.height,
        camera,
        viewMode,
        width,
        height
      ));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragThresholdPassed) {
      if (is3DView && threeRendererRef.current) {
        selectTileAt(threeRendererRef.current.pickTile(e.clientX, e.clientY, state));
      } else {
        selectTileAt(hoveredTile);
      }
    }
    setIsDragging(false);
    setDragThresholdPassed(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragThresholdPassed(false);
    if (!is3DView) setHoveredTile(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (is3DView && threeRendererRef.current) {
      threeRendererRef.current.zoom(e.deltaY);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const baseTileSize = Math.min(canvas.width, canvas.height) / height;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

    setCamera(prev => {
      const oldTileSize = baseTileSize * prev.zoom;
      const oldOriginX = (canvas.width - width * oldTileSize) / 2 + prev.x;
      const oldOriginY = (canvas.height - height * oldTileSize) / 2 + prev.y;
      const worldX = (mouseX - oldOriginX) / oldTileSize;
      const worldY = (mouseY - oldOriginY) / oldTileSize;

      const nextZoom = Math.max(0.4, Math.min(10.0, prev.zoom * zoomFactor));
      const newTileSize = baseTileSize * nextZoom;
      const baseOriginX = (canvas.width - width * newTileSize) / 2;
      const baseOriginY = (canvas.height - height * newTileSize) / 2;

      return {
        ...prev,
        zoom: nextZoom,
        x: mouseX - worldX * newTileSize - baseOriginX,
        y: mouseY - worldY * newTileSize - baseOriginY
      };
    });
  };

  useEffect(() => {
    if (is3DView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let time = 0;
    const render = () => {
      time += 0.02;
      WorldViewRenderer.renderView(ctx, canvas.width, canvas.height, state, viewMode, camera, hoveredTile, time);

      const tileSize = (Math.min(canvas.width, canvas.height) / height) * camera.zoom;
      const originX = (canvas.width - width * tileSize) / 2 + camera.x;
      const originY = (canvas.height - height * tileSize) / 2 + camera.y;
      particleEngineRef.current.update(width, height, time);
      particleEngineRef.current.render(ctx, originX, originY, tileSize, canvas.width, canvas.height);

      animFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameId);
  }, [is3DView, state, activeLayer, viewMode, camera, hoveredTile, height, width]);

  useEffect(() => {
    const handleResize = () => {
      const parent = containerRef.current;
      if (!parent) return;
      const w = parent.clientWidth || 800;
      const h = parent.clientHeight || 600;

      if (canvasRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
      }
      threeRendererRef.current?.resize(w, h);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentHoveredTileData = hoveredTile ? grid[hoveredTile.y]?.[hoveredTile.x] : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-slate-950 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {is3DView && <div ref={threeContainerRef} className="w-full h-full absolute inset-0 pointer-events-none" />}
      {!is3DView && <canvas ref={canvasRef} className="w-full h-full" />}

      <Minimap state={state} camera={{ x: camera.x, y: camera.y, zoom: camera.zoom }} onCenterCoordinates={handleCenterCoordinates} />
      <MapLegend activeLayer={activeLayer} state={state} />
      <PinnedEntityFollower
        pinnedEntity={pinnedEntity}
        state={state}
        onUnpin={onUnpinEntity}
        onJumpToCoordinates={handleCenterCoordinates}
        onOpenWhy={onOpenWhy}
      />

      {currentHoveredTileData && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-lg p-3 text-xs text-slate-200 shadow-2xl pointer-events-none min-w-[220px]">
          <div className="flex items-center justify-between font-mono font-semibold text-sky-400 mb-1 border-b border-slate-700 pb-1">
            <span>Tile ({currentHoveredTileData.x}, {currentHoveredTileData.y})</span>
            <span className="text-amber-400">{currentHoveredTileData.biome.replace('_', ' ')}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px] text-slate-300">
            <div>Elev: <span className="text-white">{Math.round(currentHoveredTileData.elevation * 1000)}m</span></div>
            <div>Temp: <span className="text-white">{currentHoveredTileData.currentTemp}°C</span></div>
            <div>Rain: <span className="text-white">{Math.round(currentHoveredTileData.rainfall * 100)}%</span></div>
            <div>Moist: <span className="text-white">{Math.round(currentHoveredTileData.moisture * 100)}%</span></div>
            <div>Biomass: <span className="text-emerald-400">{currentHoveredTileData.biomass}</span></div>
            <div>Pop: <span className="text-amber-400">{currentHoveredTileData.populationDensity}</span></div>
          </div>
          {currentHoveredTileData.settlementId && state.settlements[currentHoveredTileData.settlementId] && (
            <div className="mt-2 pt-1 border-t border-slate-700 font-sans text-amber-300 font-medium">
              🏛️ {state.settlements[currentHoveredTileData.settlementId].name} ({state.settlements[currentHoveredTileData.settlementId].tier})
            </div>
          )}
          {currentHoveredTileData.ruins.length > 0 && (
            <div className="mt-1 font-sans text-purple-300 font-medium">
              🏺 Ancient Ruins of {currentHoveredTileData.ruins[0].originalName}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
