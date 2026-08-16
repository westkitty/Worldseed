// Multi-Layer & Multi-View Cinematic Canvas Renderer supporting 6 Presentation Modes

import React, { useEffect, useRef, useState } from 'react';
import { BiomeType, InspectionSelection, Tile, WorldState, WorldViewMode } from '../../types/simulation';
import { PRNG } from '../../simulation/math/prng';
import { Camera3D, WorldProjectionEngine } from '../../visuals/views/projections';
import { WorldViewRenderer } from '../../visuals/views/WorldViewRenderer';
import { ParticleEngine } from '../../visuals/particles/particleEngine';
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
  selectedEntity,
  pinnedEntity,
  onSelectEntity,
  onUnpinEntity,
  onOpenWhy
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleEngineRef = useRef<ParticleEngine>(new ParticleEngine());

  // 3D & 2D Camera state
  const [camera, setCamera] = useState<Camera3D>({
    x: 0,
    y: 0,
    zoom: 1.0,
    rotX: 0.15, // Pitch
    rotY: 0.0   // Yaw
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragThresholdPassed, setDragThresholdPassed] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

  const { grid, config } = state;
  const { width, height } = config;

  // Center on coordinates
  const handleCenterCoordinates = (tileX: number, tileY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (viewMode === 'GLOBE' || viewMode === 'SNOW_GLOBE' || viewMode === 'ORBITAL_VIEW') {
      const u = tileX / width;
      const targetRotY = -(u - 0.5) * (Math.PI * 2) - Math.PI / 2;
      setCamera(prev => ({ ...prev, rotY: targetRotY, x: 0, y: 0 }));
    } else {
      const tileSize = (Math.min(canvas.width, canvas.height) / height) * camera.zoom;
      const targetX = canvas.width / 2 - (tileX + 0.5) * tileSize;
      const targetY = canvas.height / 2 - (tileY + 0.5) * tileSize;
      setCamera(prev => ({ ...prev, x: targetX, y: targetY }));
    }
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragThresholdPassed(false);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (isDragging) {
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setDragThresholdPassed(true);
      }

      if (viewMode === 'GLOBE' || viewMode === 'SNOW_GLOBE' || viewMode === 'ORBITAL_VIEW') {
        // Orbit / Rotate spherical views
        setCamera(prev => ({
          ...prev,
          rotY: prev.rotY + dx * 0.008,
          rotX: Math.max(-1.2, Math.min(1.2, prev.rotX + dy * 0.008))
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      } else {
        // Pan planar views
        setCamera(prev => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }

    // Raycast hover tile
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const hit = WorldProjectionEngine.screenToGrid(
      mouseX,
      mouseY,
      canvas.width,
      canvas.height,
      camera,
      viewMode,
      width,
      height
    );

    setHoveredTile(hit);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragThresholdPassed && hoveredTile) {
      const tile = grid[hoveredTile.y][hoveredTile.x];
      if (tile.settlementId) {
        onSelectEntity({ type: 'SETTLEMENT', id: tile.settlementId });
      } else if (tile.ruins.length > 0) {
        onSelectEntity({ type: 'RUIN', id: tile.ruins[0].id });
      } else if (tile.dominantSpeciesId) {
        onSelectEntity({ type: 'SPECIES', id: tile.dominantSpeciesId });
      } else {
        onSelectEntity({ type: 'TILE', id: `${hoveredTile.x},${hoveredTile.y}` });
      }
    }
    setIsDragging(false);
    setDragThresholdPassed(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.4, Math.min(10.0, prev.zoom * zoomFactor))
    }));
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.02;

      // Render Active World View Mode
      WorldViewRenderer.renderView(
        ctx,
        canvas.width,
        canvas.height,
        state,
        viewMode,
        camera,
        hoveredTile,
        time
      );

      // Particle Overlay (Weather & Ambient effects)
      if (viewMode === 'FLAT_ATLAS' || viewMode === 'SQUARE_TILE') {
        const tileSize = (Math.min(canvas.width, canvas.height) / height) * camera.zoom;
        const originX = (canvas.width - width * tileSize) / 2 + camera.x;
        const originY = (canvas.height - height * tileSize) / 2 + camera.y;

        particleEngineRef.current.update(width, height, time);
        particleEngineRef.current.render(ctx, originX, originY, tileSize, canvas.width, canvas.height);
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrameId);
  }, [state, activeLayer, viewMode, camera, hoveredTile]);

  // Sync canvas size on mount & window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.parentElement?.clientWidth || 800;
        canvasRef.current.height = canvasRef.current.parentElement?.clientHeight || 600;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentHoveredTileData = hoveredTile ? grid[hoveredTile.y]?.[hoveredTile.x] : null;

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Minimap HUD */}
      <Minimap
        state={state}
        camera={{ x: camera.x, y: camera.y, zoom: camera.zoom }}
        onCenterCoordinates={handleCenterCoordinates}
      />

      {/* Map Layer Legend HUD */}
      <MapLegend
        activeLayer={activeLayer}
        state={state}
      />

      {/* Pinned Entity Follower */}
      <PinnedEntityFollower
        pinnedEntity={pinnedEntity}
        state={state}
        onUnpin={onUnpinEntity}
        onJumpToCoordinates={handleCenterCoordinates}
        onOpenWhy={onOpenWhy}
      />

      {/* Mini Hover HUD */}
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
