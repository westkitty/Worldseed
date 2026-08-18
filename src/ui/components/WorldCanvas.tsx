// WORLDSEED — World surface host
//
// Owns the 2D cartographic canvas, the WebGL hero renderer, pointer/keyboard navigation
// and the world-informed effect layer. The world fills this element; every other piece of
// interface floats over it.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InspectionSelection, WorldState, WorldViewMode } from '../../types/simulation';
import { Camera3D, WorldProjectionEngine } from '../../visuals/views/projections';
import { WorldViewRenderer } from '../../visuals/views/WorldViewRenderer';
import { ParticleEngine } from '../../visuals/particles/particleEngine';
import { ThreeWorldRenderer } from '../../visuals/3d/ThreeWorldRenderer';
import { PlanetSurfaceCompositor, SurfaceLayer } from '../../visuals/terrain/planetSurface';
import { Minimap } from './Minimap';
import { MapLegend } from './MapLegend';
import { PinnedEntityFollower } from './PinnedEntityFollower';

export type MapLayerMode = SurfaceLayer;

interface WorldCanvasProps {
  state: WorldState;
  activeLayer: MapLayerMode;
  viewMode: WorldViewMode;
  selectedEntity: InspectionSelection | null;
  pinnedEntity: InspectionSelection | null;
  showEffects: boolean;
  onSelectEntity: (selection: InspectionSelection | null) => void;
  onUnpinEntity: () => void;
  onOpenWhy: (nodeId: string) => void;
}

const is3DMode = (mode: WorldViewMode) =>
  mode === 'GLOBE' || mode === 'SNOW_GLOBE' || mode === 'RELIEF_DIORAMA' || mode === 'ORBITAL_VIEW';

/** Resolves whichever tile the current selection lives on, for on-world highlighting. */
const selectionTile = (state: WorldState, selection: InspectionSelection | null): { x: number; y: number } | null => {
  if (!selection) return null;
  switch (selection.type) {
    case 'TILE': {
      const [x, y] = selection.id.split(',').map(Number);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }
    case 'SETTLEMENT': {
      const s = state.settlements[selection.id];
      return s ? { x: s.tileX, y: s.tileY } : null;
    }
    case 'SPECIES': {
      const s = state.species[selection.id];
      return s ? { x: s.originTile.x, y: s.originTile.y } : null;
    }
    default:
      return null;
  }
};

export const WorldCanvas: React.FC<WorldCanvasProps> = ({
  state,
  activeLayer,
  viewMode,
  selectedEntity,
  pinnedEntity,
  showEffects,
  onSelectEntity,
  onUnpinEntity,
  onOpenWhy
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeContainerRef = useRef<HTMLDivElement | null>(null);
  const threeRendererRef = useRef<ThreeWorldRenderer | null>(null);
  const particleEngineRef = useRef<ParticleEngine>(new ParticleEngine());
  const compositorRef = useRef<PlanetSurfaceCompositor>(new PlanetSurfaceCompositor(10));

  // The render loop reads live values through refs, so it is started once and never
  // restarted by a simulation tick, a hover or a camera nudge.
  const stateRef = useRef(state);
  const layerRef = useRef(activeLayer);
  const viewRef = useRef(viewMode);
  const cameraRef = useRef<Camera3D>({ x: 0, y: 0, zoom: 1, rotX: 0.15, rotY: 0 });
  const hoveredRef = useRef<{ x: number; y: number } | null>(null);
  const selectedTileRef = useRef<{ x: number; y: number } | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const surfaceRevisionRef = useRef(-1);

  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [, forceCameraRepaint] = useState(0);
  const [surfaceCanvas, setSurfaceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [, setLocatorTick] = useState(0);

  const is3DView = is3DMode(viewMode);
  const { grid, config } = state;
  const { width, height } = config;

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  stateRef.current = state;
  layerRef.current = activeLayer;
  viewRef.current = viewMode;
  selectedTileRef.current = selectionTile(state, selectedEntity);

  // ---------------------------------------------------------------- 3D lifecycle

  useEffect(() => {
    if (!is3DView) {
      threeRendererRef.current?.dispose();
      threeRendererRef.current = null;
      return;
    }
    if (!threeContainerRef.current) return;
    if (!threeRendererRef.current) {
      threeRendererRef.current = new ThreeWorldRenderer(threeContainerRef.current);
      const { width: w, height: h } = sizeRef.current;
      if (w > 0 && h > 0) threeRendererRef.current.resize(w, h);
    }
    threeRendererRef.current.updateScene(state, viewMode, activeLayer);
    threeRendererRef.current.setSelection(state, selectedTileRef.current);
  }, [is3DView, viewMode, activeLayer, state, selectedEntity]);

  useEffect(
    () => () => {
      threeRendererRef.current?.dispose();
      threeRendererRef.current = null;
      compositorRef.current.dispose();
    },
    []
  );

  // ---------------------------------------------------------------- sizing

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const applySize = () => {
      const w = Math.max(1, Math.round(parent.clientWidth));
      const h = Math.max(1, Math.round(parent.clientHeight));
      sizeRef.current = { width: w, height: h };

      const canvas = canvasRef.current;
      if (canvas) {
        // Backing store follows the device pixel ratio so terrain, labels and hairlines are
        // crisp on retina displays instead of being upscaled from CSS pixels.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const bw = Math.round(w * dpr);
        const bh = Math.round(h * dpr);
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      threeRendererRef.current?.resize(w, h);
    };

    applySize();
    // A ResizeObserver also catches layout changes that no window resize reports, such as
    // entering Immersion Mode or the inspector opening on a narrow viewport.
    const observer = new ResizeObserver(applySize);
    observer.observe(parent);
    window.addEventListener('resize', applySize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', applySize);
    };
  }, []);

  // ---------------------------------------------------------------- 2D render loop

  useEffect(() => {
    particleEngineRef.current.setEnabled(showEffects && !reducedMotion);
  }, [showEffects, reducedMotion]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const render = () => {
      frame = requestAnimationFrame(render);
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const liveState = stateRef.current;

      // The surface is composited in every mode — the locator map needs it even while the
      // WebGL hero views own the main canvas. Compositing is cached, so an unchanged world
      // costs nothing here.
      const composed = compositorRef.current.compose(liveState, layerRef.current, surfaceSignature(liveState));
      const surface = composed.canvas;
      if (composed.revision !== surfaceRevisionRef.current) {
        surfaceRevisionRef.current = composed.revision;
        setSurfaceCanvas(surface);
        setLocatorTick(t => t + 1);
      }

      if (is3DMode(viewRef.current)) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const dpr = canvas.width / Math.max(1, sizeRef.current.width);
      const cw = sizeRef.current.width;
      const ch = sizeRef.current.height;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      WorldViewRenderer.renderView(ctx, cw, ch, liveState, viewRef.current, cameraRef.current, hoveredRef.current, now / 1000, {
        surface,
        selectedTile: selectedTileRef.current
      });

      const frameMetrics = WorldProjectionEngine.frame(cw, ch, liveState.config.width, liveState.config.height, cameraRef.current);
      particleEngineRef.current.update(liveState, dt);
      particleEngineRef.current.render(ctx, frameMetrics.originX, frameMetrics.originY, frameMetrics.tileSize, cw, ch);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  // ---------------------------------------------------------------- navigation

  const setCamera = useCallback((next: (prev: Camera3D) => Camera3D) => {
    cameraRef.current = next(cameraRef.current);
    forceCameraRepaint(v => v + 1);
  }, []);

  const handleCenterCoordinates = useCallback(
    (tileX: number, tileY: number) => {
      if (is3DMode(viewRef.current) && threeRendererRef.current) {
        threeRendererRef.current.focusTile(tileX, tileY, width, height);
        return;
      }
      const { width: cw, height: ch } = sizeRef.current;
      setCamera(prev => {
        const neutral = WorldProjectionEngine.frame(cw, ch, width, height, { ...prev, x: 0, y: 0 });
        return {
          ...prev,
          x: cw / 2 - (tileX + 0.5) * neutral.tileSize - neutral.originX,
          y: ch / 2 - (tileY + 0.5) * neutral.tileSize - neutral.originY
        };
      });
    },
    [height, setCamera, width]
  );

  const selectTileAt = useCallback(
    (coords: { x: number; y: number } | null) => {
      if (!coords) {
        onSelectEntity(null);
        return;
      }
      const tile = grid[coords.y]?.[coords.x];
      if (!tile) return;

      if (tile.settlementId) onSelectEntity({ type: 'SETTLEMENT', id: tile.settlementId });
      else if (tile.ruins.length > 0) onSelectEntity({ type: 'RUIN', id: tile.ruins[0].id });
      else if (tile.dominantSpeciesId) onSelectEntity({ type: 'SPECIES', id: tile.dominantSpeciesId });
      else onSelectEntity({ type: 'TILE', id: `${coords.x},${coords.y}` });
    },
    [grid, onSelectEntity]
  );

  const pointerStateRef = useRef({ id: -1, x: 0, y: 0, moved: false, active: false });
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  const tileUnderPointer = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (is3DMode(viewRef.current)) {
        return threeRendererRef.current?.pickTile(clientX, clientY, stateRef.current) ?? null;
      }
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return WorldProjectionEngine.screenToGrid(
        clientX - rect.left,
        clientY - rect.top,
        sizeRef.current.width,
        sizeRef.current.height,
        cameraRef.current,
        viewRef.current,
        width,
        height
      );
    },
    [height, width]
  );

  const applyZoom = useCallback(
    (delta: number, focusX: number, focusY: number) => {
      if (is3DMode(viewRef.current)) {
        threeRendererRef.current?.zoom(delta);
        return;
      }
      const { width: cw, height: ch } = sizeRef.current;
      setCamera(prev => {
        const before = WorldProjectionEngine.frame(cw, ch, width, height, prev);
        const worldX = (focusX - before.originX) / before.tileSize;
        const worldY = (focusY - before.originY) / before.tileSize;
        const nextZoom = Math.max(0.45, Math.min(12, prev.zoom * (delta < 0 ? 1.14 : 1 / 1.14)));
        const candidate = { ...prev, zoom: nextZoom, x: 0, y: 0 };
        const after = WorldProjectionEngine.frame(cw, ch, width, height, candidate);
        return {
          ...prev,
          zoom: nextZoom,
          x: focusX - worldX * after.tileSize - after.originX,
          y: focusY - worldY * after.tileSize - after.originY
        };
      });
    },
    [height, setCamera, width]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointerStateRef.current.active) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointerStateRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, active: true };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pinchRef.current.has(e.pointerId)) pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger pinch on touch devices maps to zoom.
    if (pinchRef.current.size >= 2) {
      const points = Array.from(pinchRef.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const prev = pinchDistanceRef.current;
      pinchDistanceRef.current = dist;
      if (prev > 0 && Math.abs(dist - prev) > 1.5) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const midX = (points[0].x + points[1].x) / 2 - (rect?.left ?? 0);
        const midY = (points[0].y + points[1].y) / 2 - (rect?.top ?? 0);
        applyZoom(dist > prev ? -100 : 100, midX, midY);
      }
      return;
    }

    const pointer = pointerStateRef.current;
    if (pointer.active && pointer.id === e.pointerId) {
      const dx = e.clientX - pointer.x;
      const dy = e.clientY - pointer.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pointer.moved = true;
      pointer.x = e.clientX;
      pointer.y = e.clientY;

      if (is3DMode(viewRef.current)) threeRendererRef.current?.rotate(dx, dy);
      else setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    if (e.pointerType === 'touch') return;
    const tile = tileUnderPointer(e.clientX, e.clientY);
    hoveredRef.current = tile;
    setHoveredTile(prev => (prev?.x === tile?.x && prev?.y === tile?.y ? prev : tile));
  };

  const pinchDistanceRef = useRef(0);

  const endPointer = (e: React.PointerEvent, select: boolean) => {
    pinchRef.current.delete(e.pointerId);
    if (pinchRef.current.size < 2) pinchDistanceRef.current = 0;

    const pointer = pointerStateRef.current;
    if (pointer.active && pointer.id === e.pointerId) {
      if (select && !pointer.moved) selectTileAt(tileUnderPointer(e.clientX, e.clientY));
      pointerStateRef.current = { id: -1, x: 0, y: 0, moved: false, active: false };
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    endPointer(e, false);
    hoveredRef.current = null;
    setHoveredTile(null);
  };

  // Wheel is bound natively so it can be non-passive and stop the page from scrolling
  // underneath the world.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      applyZoom(e.deltaY, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoom]);

  // ---------------------------------------------------------------- keyboard camera

  useEffect(() => {
    const handleCameraKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const movement = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
      const isZoomIn = key === '+' || key === '=';
      const isZoomOut = key === '-' || key === '_';
      const isReset = key === 'home';
      if (!movement.has(key) && !isZoomIn && !isZoomOut && !isReset) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const step = event.shiftKey ? 70 : 28;

      if (is3DMode(viewRef.current) && threeRendererRef.current) {
        const renderer = threeRendererRef.current;
        if (key === 'a' || key === 'arrowleft') renderer.rotate(-step, 0);
        else if (key === 'd' || key === 'arrowright') renderer.rotate(step, 0);
        else if (key === 'w' || key === 'arrowup') renderer.rotate(0, -step);
        else if (key === 's' || key === 'arrowdown') renderer.rotate(0, step);
        else if (isZoomIn) renderer.zoom(-260);
        else if (isZoomOut) renderer.zoom(260);
        else if (isReset) {
          renderer.rotX = 0.26;
          renderer.rotY = 0.6;
        }
        return;
      }

      const { width: cw, height: ch } = sizeRef.current;
      if (isReset) {
        setCamera(prev => ({ ...prev, x: 0, y: 0, zoom: 1 }));
        return;
      }
      if (isZoomIn || isZoomOut) {
        applyZoom(isZoomIn ? -100 : 100, cw / 2, ch / 2);
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
  }, [applyZoom, setCamera]);

  const hoveredTileData = hoveredTile ? grid[hoveredTile.y]?.[hoveredTile.x] : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ background: 'var(--ws-void)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={e => endPointer(e, true)}
      onPointerCancel={e => endPointer(e, false)}
      onPointerLeave={handlePointerLeave}
    >
      {is3DView && <div ref={threeContainerRef} className="w-full h-full absolute inset-0 pointer-events-none" />}
      {!is3DView && <canvas ref={canvasRef} className="block w-full h-full" aria-hidden="true" />}

      <Minimap
        state={state}
        camera={cameraRef.current}
        viewMode={viewMode}
        surface={surfaceCanvas}
        viewportSize={sizeRef.current}
        onCenterCoordinates={handleCenterCoordinates}
      />
      <MapLegend activeLayer={activeLayer} state={state} />
      <PinnedEntityFollower
        pinnedEntity={pinnedEntity}
        state={state}
        onUnpin={onUnpinEntity}
        onJumpToCoordinates={handleCenterCoordinates}
        onOpenWhy={onOpenWhy}
      />

      {hoveredTileData && (
        <div className="ws-panel absolute bottom-4 left-4 px-3 py-2 text-xs pointer-events-none min-w-[214px] ws-rise" role="status">
          <div className="flex items-baseline justify-between gap-4 pb-1.5 mb-1.5 border-b" style={{ borderColor: 'var(--ws-hairline)' }}>
            <span className="text-[11.5px] font-medium" style={{ color: 'var(--ws-ink)' }}>
              {hoveredTileData.biome.replace(/_/g, ' ').toLowerCase()}
            </span>
            <span className="ws-numeric text-[10px]" style={{ color: 'var(--ws-ink-faint)' }}>
              {hoveredTileData.x}, {hoveredTileData.y}
            </span>
          </div>
          <div className="flex items-center gap-x-3 ws-numeric text-[11px] flex-wrap" style={{ color: 'var(--ws-ink-muted)' }}>
            <span>{Math.round(hoveredTileData.elevation * 1000)}m</span>
            <span style={{ color: 'var(--ws-hairline-strong)' }}>·</span>
            <span>{hoveredTileData.currentTemp}°C</span>
            <span style={{ color: 'var(--ws-hairline-strong)' }}>·</span>
            <span>{Math.round(hoveredTileData.rainfall * 100)}% rain</span>
            <span style={{ color: 'var(--ws-hairline-strong)' }}>·</span>
            <span style={{ color: 'var(--ws-life)' }}>{Math.round(hoveredTileData.biomass)} biomass</span>
          </div>
          {hoveredTileData.settlementId && state.settlements[hoveredTileData.settlementId] && (
            <div className="mt-1.5 pt-1.5 border-t text-[11px] font-medium" style={{ borderColor: 'var(--ws-hairline)', color: 'var(--ws-culture)' }}>
              {state.settlements[hoveredTileData.settlementId].name} · {state.settlements[hoveredTileData.settlementId].tier.toLowerCase()}
            </div>
          )}
          {hoveredTileData.ruins.length > 0 && (
            <div className="mt-1 text-[11px] font-medium" style={{ color: 'var(--ws-deep-time)' }}>
              ruins of {hoveredTileData.ruins[0].originalName}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Cheap change detector for the composited surface — see PlanetSurfaceCompositor. */
function surfaceSignature(state: WorldState): string {
  let settlementLoad = 0;
  for (const s of Object.values(state.settlements)) settlementLoad += s.population + (s.isAbandoned ? 1e6 : 0);
  return [
    state.config.seed,
    Math.floor(state.currentYear / 5),
    Object.keys(state.settlements).length,
    Object.keys(state.polities).length,
    Math.round(settlementLoad / 50),
    Math.round(state.stats.globalAvgTemperature * 4),
    Math.round(state.stats.forestCoverPercentage)
  ].join(':');
}
