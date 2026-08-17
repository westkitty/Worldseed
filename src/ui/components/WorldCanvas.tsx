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

const hashHue = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
};

const layerColor = (
  state: WorldState,
  tile: WorldState['grid'][number][number],
  layer: MapLayerMode
): string => {
  switch (layer) {
    case 'TEMPERATURE': {
      const t = Math.max(0, Math.min(1, (tile.currentTemp + 35) / 85));
      return `hsla(${220 - t * 220}, 72%, 48%, 0.72)`;
    }
    case 'RAINFALL': {
      const rain = Math.max(0, Math.min(1, tile.rainfall));
      return `hsla(${210 - rain * 25}, 76%, ${22 + rain * 42}%, 0.72)`;
    }
    case 'BIODIVERSITY': {
      const activity = Math.max(0, Math.min(1, (tile.biomass / 1000 + tile.vegetationDensity) / 2));
      return `hsla(${25 + activity * 115}, 62%, ${26 + activity * 30}%, 0.68)`;
    }
    case 'POLITICAL':
      return tile.polityId ? `hsla(${hashHue(tile.polityId)}, 58%, 48%, 0.72)` : 'rgba(15, 23, 42, 0.24)';
    case 'SETTLEMENTS':
      if (tile.settlementId) return 'rgba(230, 174, 69, 0.78)';
      if (tile.infrastructureLevel > 0) return 'rgba(126, 92, 47, 0.54)';
      return 'rgba(15, 23, 42, 0.22)';
    case 'CULTURES': {
      if (!tile.dominantCultureId) return 'rgba(15, 23, 42, 0.24)';
      const culture = state.cultures[tile.dominantCultureId];
      return culture?.colorHex ? `${culture.colorHex}bb` : `hsla(${hashHue(tile.dominantCultureId)}, 55%, 48%, 0.7)`;
    }
    case 'LANGUAGES': {
      const languageId = tile.dominantCultureId ? state.cultures[tile.dominantCultureId]?.languageId : undefined;
      return languageId ? `hsla(${hashHue(languageId)}, 58%, 50%, 0.72)` : 'rgba(15, 23, 42, 0.24)';
    }
    case 'DISEASES':
      return tile.activeContagionIds.length > 0 ? 'rgba(190, 70, 76, 0.8)' : 'rgba(15, 23, 42, 0.22)';
    case 'RUINS_ARCHAEOLOGY':
      return tile.ruins.length > 0 || tile.fossils.length > 0 ? 'rgba(145, 108, 176, 0.78)' : 'rgba(28, 25, 23, 0.22)';
    case 'ENVIRONMENTAL_SCARS': {
      const damage = Math.max(0, Math.min(1, Math.max(tile.environmentalDamage, tile.pollution, tile.erosionLevel)));
      return damage > 0.05 ? `hsla(${42 - damage * 42}, 68%, ${43 - damage * 16}%, 0.72)` : 'rgba(15, 23, 42, 0.12)';
    }
    default:
      return 'rgba(0,0,0,0)';
  }
};

const drawLayerOverlay = (
  ctx: CanvasRenderingContext2D,
  state: WorldState,
  layer: MapLayerMode,
  camera: Camera3D,
  canvasWidth: number,
  canvasHeight: number
) => {
  if (layer === 'PHYSICAL' || layer === 'BIOMES') return;
  const { width, height } = state.config;
  const tileSize = (Math.min(canvasWidth, canvasHeight) / height) * camera.zoom;
  const originX = (canvasWidth - width * tileSize) / 2 + camera.x;
  const originY = (canvasHeight - height * tileSize) / 2 + camera.y;

  ctx.save();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = originX + x * tileSize;
      const py = originY + y * tileSize;
      if (px + tileSize < 0 || px > canvasWidth || py + tileSize < 0 || py > canvasHeight) continue;
      ctx.fillStyle = layerColor(state, state.grid[y][x], layer);
      ctx.fillRect(px, py, tileSize + 0.5, tileSize + 0.5);
    }
  }
  ctx.restore();
};

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
  const pendingVisualStateRef = useRef(state);
  const activeLayerRef = useRef(activeLayer);
  const viewModeRef = useRef(viewMode);
  const visualUpdateTimerRef = useRef<number | null>(null);

  const is3DView = viewMode === 'GLOBE' || viewMode === 'SNOW_GLOBE' || viewMode === 'RELIEF_DIORAMA' || viewMode === 'ORBITAL_VIEW';

  const [camera, setCamera] = useState<Camera3D>({ x: 0, y: 0, zoom: 1, rotX: 0.15, rotY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragThresholdPassed, setDragThresholdPassed] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);

  const { grid, config } = state;
  const { width, height } = config;

  useEffect(() => {
    pendingVisualStateRef.current = state;
  }, [state]);

  useEffect(() => {
    activeLayerRef.current = activeLayer;
    viewModeRef.current = viewMode;
    pendingVisualStateRef.current = state;

    if (visualUpdateTimerRef.current !== null) {
      window.clearTimeout(visualUpdateTimerRef.current);
      visualUpdateTimerRef.current = null;
    }

    if (is3DView && threeContainerRef.current) {
      if (!threeRendererRef.current) threeRendererRef.current = new ThreeWorldRenderer(threeContainerRef.current);
      threeRendererRef.current.updateScene(state, viewMode, activeLayer);
    } else if (threeRendererRef.current) {
      threeRendererRef.current.dispose();
      threeRendererRef.current = null;
    }
  }, [is3DView, viewMode, activeLayer]);

  useEffect(() => {
    if (!is3DView || !threeRendererRef.current) return;
    pendingVisualStateRef.current = state;

    if (visualUpdateTimerRef.current === null) {
      visualUpdateTimerRef.current = window.setTimeout(() => {
        visualUpdateTimerRef.current = null;
        threeRendererRef.current?.updateScene(
          pendingVisualStateRef.current,
          viewModeRef.current,
          activeLayerRef.current
        );
      }, 220);
    }
  }, [state, is3DView]);

  useEffect(() => () => {
    if (visualUpdateTimerRef.current !== null) window.clearTimeout(visualUpdateTimerRef.current);
    threeRendererRef.current?.dispose();
    threeRendererRef.current = null;
  }, []);

  const handleCenterCoordinates = (tileX: number, tileY: number) => {
    if (is3DView && threeRendererRef.current) {
      threeRendererRef.current.focusTile(tileX, tileY, width, height);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const tileSize = (Math.min(canvas.width, canvas.height) / height) * camera.zoom;
    const baseOriginX = (canvas.width - width * tileSize) / 2;
    const baseOriginY = (canvas.height - height * tileSize) / 2;
    setCamera(prev => ({
      ...prev,
      x: canvas.width / 2 - (tileX + 0.5) * tileSize - baseOriginX,
      y: canvas.height / 2 - (tileY + 0.5) * tileSize - baseOriginY
    }));
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
      if (is3DView && threeRendererRef.current) threeRendererRef.current.rotate(dx, dy);
      else setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (is3DView && threeRendererRef.current) {
      setHoveredTile(threeRendererRef.current.pickTile(e.clientX, e.clientY, state));
    } else if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setHoveredTile(WorldProjectionEngine.screenToGrid(
        e.clientX - rect.left,
        e.clientY - rect.top,
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
      const coords = is3DView && threeRendererRef.current
        ? threeRendererRef.current.pickTile(e.clientX, e.clientY, state)
        : hoveredTile;
      selectTileAt(coords);
    }
    setIsDragging(false);
    setDragThresholdPassed(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragThresholdPassed(false);
    setHoveredTile(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
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
      const nextZoom = Math.max(0.4, Math.min(10, prev.zoom * zoomFactor));
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
      drawLayerOverlay(ctx, state, activeLayer, camera, canvas.width, canvas.height);

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

  useEffect(() => {
    const handleCameraKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;

      const key = event.key.toLowerCase();
      const movement = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
      const isZoomIn = key === '+' || key === '=';
      const isZoomOut = key === '-' || key === '_';
      const isFlatReset = key === 'home' && !is3DView;
      if (!movement.has(key) && !isZoomIn && !isZoomOut && !isFlatReset) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const step = event.shiftKey ? 70 : 28;

      if (is3DView && threeRendererRef.current) {
        if (key === 'a' || key === 'arrowleft') threeRendererRef.current.rotate(-step, 0);
        else if (key === 'd' || key === 'arrowright') threeRendererRef.current.rotate(step, 0);
        else if (key === 'w' || key === 'arrowup') threeRendererRef.current.rotate(0, -step);
        else if (key === 's' || key === 'arrowdown') threeRendererRef.current.rotate(0, step);
        else if (isZoomIn) threeRendererRef.current.zoom(-160);
        else if (isZoomOut) threeRendererRef.current.zoom(160);
        return;
      }

      if (isFlatReset) {
        setCamera(prev => ({ ...prev, x: 0, y: 0, zoom: 1 }));
        return;
      }

      if (isZoomIn || isZoomOut) {
        setCamera(prev => ({ ...prev, zoom: Math.max(0.4, Math.min(10, prev.zoom * (isZoomIn ? 1.15 : 0.87))) }));
        return;
      }

      setCamera(prev => ({
        ...prev,
        x: prev.x + (key === 'a' || key === 'arrowleft' ? step : key === 'd' || key === 'arrowright' ? -step : 0),
        y: prev.y + (key === 'w' || key === 'arrowup' ? step : key === 's' || key === 'arrowdown' ? -step : 0)
      }));
    };

    window.addEventListener('keydown', handleCameraKey, true);
    return () => window.removeEventListener('keydown', handleCameraKey, true);
  }, [is3DView]);

  const currentHoveredTileData = hoveredTile ? grid[hoveredTile.y]?.[hoveredTile.x] : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-[#02060b] cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {is3DView && <div ref={threeContainerRef} className="absolute inset-0 h-full w-full pointer-events-none" />}
      {!is3DView && <canvas ref={canvasRef} className="h-full w-full" />}

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
        <div className="pointer-events-none absolute bottom-20 left-4 max-w-[260px] rounded-xl border border-white/8 bg-slate-950/64 px-3 py-2 text-[10px] text-slate-300 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="font-medium capitalize text-slate-100">{currentHoveredTileData.biome.replaceAll('_', ' ').toLowerCase()}</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-slate-500">{currentHoveredTileData.x}, {currentHoveredTileData.y}</span>
          </div>
          <div className="mt-1 text-slate-500">
            {Math.round(currentHoveredTileData.elevation * 1000)} m · {currentHoveredTileData.currentTemp} °C · {Math.round(currentHoveredTileData.rainfall * 100)}% rain
          </div>
          {currentHoveredTileData.settlementId && state.settlements[currentHoveredTileData.settlementId] && (
            <div className="mt-1 font-medium text-amber-200">{state.settlements[currentHoveredTileData.settlementId].name}</div>
          )}
          {currentHoveredTileData.ruins.length > 0 && (
            <div className="mt-1 font-medium text-violet-200">Ruins of {currentHoveredTileData.ruins[0].originalName}</div>
          )}
        </div>
      )}
    </div>
  );
};
