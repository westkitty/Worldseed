// Locator map — shown only where a locator adds information: the two 2D cartographic views.
// The 3D hero views already communicate orientation directly, so a tiny duplicate screenshot
// there was permanent clutter rather than an instrument.

import React, { useEffect, useRef } from 'react';
import { WorldState, WorldViewMode } from '../../types/simulation';
import { Camera3D, WorldProjectionEngine } from '../../visuals/views/projections';

interface MinimapProps {
  state: WorldState;
  camera: Camera3D;
  viewMode: WorldViewMode;
  surface: HTMLCanvasElement | null;
  viewportSize: { width: number; height: number };
  onCenterCoordinates: (x: number, y: number) => void;
}

const MAP_W = 132;

export const Minimap: React.FC<MinimapProps> = ({ state, camera, viewMode, surface, viewportSize, onCenterCoordinates }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { config } = state;
  const { width, height } = config;
  const mapH = Math.round((MAP_W * height) / width);
  const isFlat = viewMode === 'FLAT_ATLAS' || viewMode === 'SQUARE_TILE';

  useEffect(() => {
    if (!isFlat) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (canvas.width !== MAP_W * dpr || canvas.height !== mapH * dpr) {
      canvas.width = MAP_W * dpr;
      canvas.height = mapH * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, MAP_W, mapH);

    if (surface) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(surface, 0, 0, MAP_W, mapH);
    } else {
      ctx.fillStyle = '#0a1018';
      ctx.fillRect(0, 0, MAP_W, mapH);
    }

    if (viewportSize.width > 0) {
      const frame = WorldProjectionEngine.frame(viewportSize.width, viewportSize.height, width, height, camera);
      const visX = (-frame.originX / frame.tileSize / width) * MAP_W;
      const visY = (-frame.originY / frame.tileSize / height) * mapH;
      const visW = (viewportSize.width / frame.tileSize / width) * MAP_W;
      const visH = (viewportSize.height / frame.tileSize / height) * mapH;

      ctx.save();
      ctx.strokeStyle = 'rgba(121, 203, 234, 0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.max(0.5, visX),
        Math.max(0.5, visY),
        Math.min(MAP_W - 1, visW),
        Math.min(mapH - 1, visH)
      );
      ctx.restore();
    }
  }, [state, surface, camera, isFlat, viewportSize.width, viewportSize.height, width, height, mapH]);

  if (!isFlat) return null;

  const jump = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tileX = Math.max(0, Math.min(width - 1, Math.floor(((clientX - rect.left) / rect.width) * width)));
    const tileY = Math.max(0, Math.min(height - 1, Math.floor(((clientY - rect.top) / rect.height) * height)));
    onCenterCoordinates(tileX, tileY);
  };

  return (
    <div className="ws-panel absolute top-4 left-4 p-1.5 z-20 select-none hidden sm:block">
      <canvas
        ref={canvasRef}
        style={{ width: MAP_W, height: mapH }}
        onPointerDown={e => {
          e.stopPropagation();
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          jump(e.clientX, e.clientY);
        }}
        onPointerMove={e => {
          if (e.buttons === 1) {
            e.stopPropagation();
            jump(e.clientX, e.clientY);
          }
        }}
        onPointerUp={e => e.stopPropagation()}
        className="rounded-[6px] cursor-crosshair block"
        aria-hidden="true"
      />
      <div className="flex items-center justify-between px-0.5 pt-1 ws-numeric text-[10px]" style={{ color: 'var(--ws-ink-faint)' }}>
        <span>{width}×{height}</span>
        <span>{camera.zoom.toFixed(1)}×</span>
      </div>
    </div>
  );
};
