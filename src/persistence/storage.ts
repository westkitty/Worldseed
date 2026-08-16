// Local-first IndexedDB persistence, JSON export/import, and shareable seed encoder

import { WorldState } from '../types/simulation';

const DB_NAME = 'WORLDSEED_DB';
const DB_VERSION = 1;
const STORE_WORLDS = 'worlds';

export class PersistenceManager {
  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_WORLDS)) {
          db.createObjectStore(STORE_WORLDS, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Save world state by ID / Name
  public static async saveWorld(id: string, name: string, state: WorldState): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORLDS, 'readwrite');
      const store = tx.objectStore(STORE_WORLDS);
      const payload = {
        id,
        name,
        savedAt: new Date().toISOString(),
        state
      };
      const req = store.put(payload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Load world state
  public static async loadWorld(id: string): Promise<WorldState | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORLDS, 'readonly');
      const store = tx.objectStore(STORE_WORLDS);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) resolve(req.result.state);
        else resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // List all saved worlds
  public static async listSavedWorlds(): Promise<Array<{ id: string; name: string; savedAt: string; year: number }>> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORLDS, 'readonly');
      const store = tx.objectStore(STORE_WORLDS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []).map(r => ({
          id: r.id,
          name: r.name,
          savedAt: r.savedAt,
          year: r.state?.currentYear || 0
        }));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Delete saved world
  public static async deleteWorld(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORLDS, 'readwrite');
      const store = tx.objectStore(STORE_WORLDS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Export world state to JSON file download
  public static exportWorldToFile(state: WorldState, filename: string = 'worldseed_planet.json') {
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import world state from JSON string
  public static importWorldFromJSON(jsonString: string): WorldState {
    const parsed = JSON.parse(jsonString);
    if (!parsed.config || !parsed.grid || !parsed.species) {
      throw new Error('Invalid WORLDSEED save data format');
    }
    return parsed as WorldState;
  }

  // Encode compact shareable seed config
  public static encodeSeedString(config: { seed: number; preset: string; seaLevel: number }): string {
    const json = JSON.stringify(config);
    return btoa(json);
  }

  // Decode shareable seed config
  public static decodeSeedString(seedStr: string): { seed: number; preset: string; seaLevel: number } | null {
    try {
      const json = atob(seedStr);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
