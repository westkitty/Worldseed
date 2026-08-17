import React, { useEffect, useRef } from 'react';
import { WorldState } from '../../types/simulation';

interface MinimapProps {
  state: WorldState;
  camera: { x: number; y: number; zoom: number };
  onCenterCoordinates: (x: number, y: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ state, camera, onCenterCoordinates }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { grid, config } = state;
  const { width, height } = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellW = canvas.width / width;
    const cellH = canvas.height / height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[y][x];
        if (tile.isWater) ctx.fillStyle = '#0b3c63';
        else if (tile.settlementId) ctx.fillStyle = '#d4a24c';
        else if (tile.ruins.length > 0) ctx.fillStyle = '#8b78b8';
        else {
          const lum = Math.max(18, Math.min(54, 24 + tile.elevation * 36));
          ctx.fillStyle = `hsl(112, 35%, ${lum}%)`;
        }
        ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }, [grid, height, width]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tileX = Math.floor(((e.clientX - rect.left) / rect.width) * width);
    const tileY = Math.floor(((e.clientY - rect.top) / rect.height) * height);
    onCenterCoordinates(tileX, tileY);
  };

  return (
    <div className="group absolute left-4 top-20 z-20 rounded-xl border border-white/8 bg-slate-950/35 p-1.5 opacity-35 shadow-xl backdrop-blur-lg transition duration-200 hover:bg-slate-950/75 hover:opacity-100">
      <canvas ref={canvasRef} width={96} height={72} onClick={handleClick} className="rounded-lg cursor-crosshair" aria-label="World minimap" />
      <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 rounded-b-lg bg-gradient-to-t from-slate-950/75 to-transparent px-1.5 pt-3 text-right text-[8px] font-mono text-slate-300 opacity-0 transition group-hover:opacity-100">
        {camera.zoom.toFixed(1)}×
      </div>
    </div>
  );
};
