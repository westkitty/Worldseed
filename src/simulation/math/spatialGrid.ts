// Fast O(1) Spatial Hash Grid Index for Biological & Civil Geographic Queries

export class SpatialGridIndex<T extends { x: number; y: number }> {
  private cellSize: number;
  private grid: Map<string, T[]> = new Map();

  constructor(cellSize: number = 4) {
    this.cellSize = cellSize;
  }

  public clear() {
    this.grid.clear();
  }

  private getKey(x: number, y: number): string {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    return `${gx},${gy}`;
  }

  public insert(item: T) {
    const key = this.getKey(item.x, item.y);
    let list = this.grid.get(key);
    if (!list) {
      list = [];
      this.grid.set(key, list);
    }
    list.push(item);
  }

  // Find all items within radius (with toroidal wrapping support)
  public queryRadius(x: number, y: number, radius: number, mapWidth: number, mapHeight: number): T[] {
    const results: T[] = [];
    const minGx = Math.floor((x - radius) / this.cellSize);
    const maxGx = Math.floor((x + radius) / this.cellSize);
    const minGy = Math.floor((y - radius) / this.cellSize);
    const maxGy = Math.floor((y + radius) / this.cellSize);

    const r2 = radius * radius;

    for (let gy = minGy; gy <= maxGy; gy++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        const key = `${gx},${gy}`;
        const cellItems = this.grid.get(key);
        if (!cellItems) continue;

        for (const item of cellItems) {
          let dx = Math.abs(item.x - x);
          if (dx > mapWidth / 2) dx = mapWidth - dx;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= r2) {
            results.push(item);
          }
        }
      }
    }

    return results;
  }
}
