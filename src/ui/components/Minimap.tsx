import React, { useEffect, useRef, useState } from 'react';
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
  const [keyboardCursor, setKeyboardCursor] = useState({ x: Math.floor(width / 2), y: Math.floor(height / 2) });
  const visualEpoch = Math.floor(state.currentYear / 5);

  useEffect(() => { setKeyboardCursor({ x: Math.floor(width / 2), y: Math.floor(height / 2) }); }, [width, height, state.config.seed]);

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
        if (tile.isWater) ctx.fillStyle = '#0b466e';
        else if (tile.settlementId) ctx.fillStyle = '#edbd60';
        else if (tile.ruins.length > 0) ctx.fillStyle = '#a68ad0';
        else { const lum = Math.max(20, Math.min(58, 27 + tile.elevation * 36)); ctx.fillStyle = `hsl(112, 35%, ${lum}%)`; }
        ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(keyboardCursor.x * cellW, keyboardCursor.y * cellH, Math.max(2, cellW), Math.max(2, cellH));
  }, [grid, height, width, visualEpoch, state.events.length, keyboardCursor]);

  const centerClamped = (x: number, y: number) => {
    const safeX = Math.max(0, Math.min(width - 1, x));
    const safeY = Math.max(0, Math.min(height - 1, y));
    setKeyboardCursor({ x: safeX, y: safeY });
    onCenterCoordinates(safeX, safeY);
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    centerClamped(Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * width), Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * height));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const jump = event.shiftKey ? 6 : 2;
    let { x, y } = keyboardCursor;
    if (event.key === 'ArrowLeft') x -= jump;
    else if (event.key === 'ArrowRight') x += jump;
    else if (event.key === 'ArrowUp') y -= jump;
    else if (event.key === 'ArrowDown') y += jump;
    else if (event.key === 'Home') { x = Math.floor(width / 2); y = Math.floor(height / 2); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); centerClamped(x, y); return; }
    else return;
    event.preventDefault();
    centerClamped(x, y);
  };

  return (
    <div className="group absolute left-4 top-20 z-20 rounded-xl border border-white/10 bg-slate-950/58 p-1.5 opacity-65 shadow-xl backdrop-blur-lg transition duration-200 hover:bg-slate-950/82 hover:opacity-100 focus-within:opacity-100">
      <canvas ref={canvasRef} width={112} height={84} onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={0} className="cursor-crosshair rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sky-300" aria-label="World minimap. Use arrow keys to move the map focus, Shift plus arrows for larger jumps, or click a location." />
      <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 rounded-b-lg bg-gradient-to-t from-slate-950/80 to-transparent px-1.5 pt-3 text-right text-[9px] font-mono text-slate-200 opacity-50 transition group-hover:opacity-100 group-focus-within:opacity-100">{camera.zoom.toFixed(1)}×</div>
    </div>
  );
};
