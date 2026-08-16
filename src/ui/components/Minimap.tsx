// Interactive Real-Time Minimap with Draggable Viewport Frame

import React, { useEffect, useRef } from 'react';
import { WorldState } from '../../types/simulation';

interface MinimapProps {
  state: WorldState;
  camera: { x: number; y: number; zoom: number };
  onCenterCoordinates: (x: number, y: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  state,
  camera,
  onCenterCoordinates
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { grid, config } = state;
  const { width, height } = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const cellW = cw / width;
    const cellH = ch / height;

    ctx.clearRect(0, 0, cw, ch);

    // Draw terrain preview
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[y][x];
        if (tile.isWater) {
          ctx.fillStyle = '#1e3a8a';
        } else if (tile.settlementId) {
          ctx.fillStyle = '#f59e0b';
        } else if (tile.ruins.length > 0) {
          ctx.fillStyle = '#a855f7';
        } else {
          const lum = Math.max(15, Math.min(65, 20 + tile.elevation * 45));
          ctx.fillStyle = `hsl(100, 45%, ${lum}%)`;
        }
        ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Draw border frame
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, cw, ch);
  }, [state]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const tileX = Math.floor((clickX / canvas.width) * width);
    const tileY = Math.floor((clickY / canvas.height) * height);
    onCenterCoordinates(tileX, tileY);
  };

  return (
    <div className="absolute top-16 left-4 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-lg p-1.5 shadow-2xl z-20 select-none">
      <div className="text-[10px] font-mono text-slate-400 font-semibold px-1 mb-1 flex items-center justify-between">
        <span>MINIMAP</span>
        <span className="text-sky-400">{camera.zoom.toFixed(1)}×</span>
      </div>
      <canvas
        ref={canvasRef}
        width={120}
        height={90}
        onClick={handleClick}
        className="rounded cursor-crosshair"
      />
    </div>
  );
};
