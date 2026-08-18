// WORLDSEED — world topology semantics.
//
// A topology is a statement about what is adjacent to what, and that has to be answered the
// same way everywhere a physical process crosses a tile boundary: migration, water flow,
// atmospheric transport, contagion, trade and camera wrapping.
//
// It deliberately does NOT force one rule on every world. A spherical planet wraps in
// longitude and terminates at the poles; a torus wraps in both axes; a bounded slab, a sky
// archipelago and a cavern system genuinely end, and things that reach the edge leave.

import { WorldTopology } from '../../types/simulation';

export interface TopologyRules {
  /** Longitude wraps around (east edge meets west edge). */
  wrapsX: boolean;
  /** Latitude wraps around (north edge meets south edge). */
  wrapsY: boolean;
  /** Anything reaching the boundary leaves the world instead of stopping at it. */
  openEdges: boolean;
  /** Poles behave as a convergence: a spherical world has them, a cylinder does not. */
  hasPoles: boolean;
}

const RULES: Record<WorldTopology, TopologyRules> = {
  SPHERICAL: { wrapsX: true, wrapsY: false, openEdges: false, hasPoles: true },
  TOROIDAL_WRAP: { wrapsX: true, wrapsY: true, openEdges: false, hasPoles: false },
  // A habitat ring and an O'Neill cylinder are continuous the long way around and capped by
  // end walls, so longitude wraps but latitude is a hard boundary — not a pole.
  CYLINDRICAL_HABITAT: { wrapsX: true, wrapsY: false, openEdges: false, hasPoles: false },
  RINGWORLD_SEGMENT: { wrapsX: true, wrapsY: false, openEdges: false, hasPoles: false },
  // These three genuinely end. Water, air, migrants and disease that reach the rim are gone.
  PLANAR_BOUNDED: { wrapsX: false, wrapsY: false, openEdges: true, hasPoles: false },
  FLOATING_ISLANDS: { wrapsX: false, wrapsY: false, openEdges: true, hasPoles: false },
  LAYERED_CAVERNS: { wrapsX: false, wrapsY: false, openEdges: true, hasPoles: false }
};

export const topologyRules = (topology: WorldTopology | undefined): TopologyRules =>
  RULES[topology || 'SPHERICAL'] ?? RULES.SPHERICAL;

/**
 * Resolves a neighbouring coordinate under a topology.
 * Returns null when the step leaves the world entirely.
 */
export function stepCoordinate(
  x: number,
  y: number,
  dx: number,
  dy: number,
  width: number,
  height: number,
  topology: WorldTopology | undefined
): { x: number; y: number } | null {
  const rules = topologyRules(topology);
  let nx = x + dx;
  let ny = y + dy;

  if (rules.wrapsX) nx = ((nx % width) + width) % width;
  else if (nx < 0 || nx >= width) return null;

  if (rules.wrapsY) ny = ((ny % height) + height) % height;
  else if (ny < 0 || ny >= height) {
    // A spherical world has poles: you cannot walk off them, you stop.
    if (rules.hasPoles && !rules.openEdges) ny = Math.max(0, Math.min(height - 1, ny));
    else if (rules.openEdges) return null;
    else ny = Math.max(0, Math.min(height - 1, ny));
  }

  return { x: nx, y: ny };
}

/** True when the tile sits on a boundary that things can fall or drain off. */
export function isOpenEdge(x: number, y: number, width: number, height: number, topology: WorldTopology | undefined): boolean {
  const rules = topologyRules(topology);
  if (!rules.openEdges) return false;
  return x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1;
}

/**
 * Shortest travel distance between two tiles under a topology. Wrapping axes may be crossed
 * the short way; bounded axes may not.
 */
export function topologicalDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
  width: number,
  height: number,
  topology: WorldTopology | undefined
): number {
  const rules = topologyRules(topology);
  let dx = Math.abs(a.x - b.x);
  if (rules.wrapsX && dx > width / 2) dx = width - dx;
  let dy = Math.abs(a.y - b.y);
  if (rules.wrapsY && dy > height / 2) dy = height - dy;
  return Math.sqrt(dx * dx + dy * dy);
}
