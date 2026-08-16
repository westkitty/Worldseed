// Local-first IndexedDB persistence, versioned JSON export/import, and shareable seed recipes

import { WorldConfig, WorldState } from '../types/simulation';

const DB_NAME = 'WORLDSEED_DB';
const DB_VERSION = 1;
const STORE_WORLDS = 'worlds';
const SAVE_FORMAT = 'WORLDSEED_SAVE';
const SAVE_SCHEMA_VERSION = 1;
const RECIPE_FORMAT = 'WORLDSEED_RECIPE';
const RECIPE_SCHEMA_VERSION = 1;

interface SaveEnvelope {
  format: typeof SAVE_FORMAT;
  version: number;
  savedAt: string;
  state: WorldState;
}

interface RecipeEnvelope {
  format: typeof RECIPE_FORMAT;
  version: number;
  config: Partial<WorldConfig> & { seed: number; preset: string; seaLevel: number };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
      req.onerror = () => reject(req.error ?? new Error('WORLDSEED IndexedDB open failed'));
    });
  }

  private static validateWorldState(value: unknown): WorldState {
    if (!isObject(value)) throw new Error('WORLDSEED save is not an object');
    const config = value.config;
    const grid = value.grid;
    const species = value.species;

    if (!isObject(config)) throw new Error('WORLDSEED save is missing world configuration');
    if (!Number.isFinite(config.seed)) throw new Error('WORLDSEED save has an invalid seed');
    if (!Number.isInteger(config.width) || Number(config.width) <= 0) throw new Error('WORLDSEED save has an invalid width');
    if (!Number.isInteger(config.height) || Number(config.height) <= 0) throw new Error('WORLDSEED save has an invalid height');
    if (!Array.isArray(grid) || grid.length !== Number(config.height)) throw new Error('WORLDSEED save grid height does not match configuration');
    if (grid.some(row => !Array.isArray(row) || row.length !== Number(config.width))) throw new Error('WORLDSEED save grid width does not match configuration');
    if (!isObject(species)) throw new Error('WORLDSEED save is missing species state');
    if (!Number.isFinite(value.currentYear)) throw new Error('WORLDSEED save has an invalid current year');

    return value as unknown as WorldState;
  }

  private static unwrapSavedState(value: unknown): WorldState {
    if (isObject(value) && value.format === SAVE_FORMAT) {
      const version = Number(value.version);
      if (!Number.isInteger(version) || version < 1) throw new Error('WORLDSEED save has an invalid schema version');
      if (version > SAVE_SCHEMA_VERSION) {
        throw new Error(`WORLDSEED save schema ${version} is newer than this app supports (${SAVE_SCHEMA_VERSION})`);
      }
      return this.validateWorldState(value.state);
    }

    // Backward compatibility with pre-versioned WORLDSEED JSON/IndexedDB saves.
    return this.validateWorldState(value);
  }

  public static async saveWorld(id: string, name: string, state: WorldState): Promise<void> {
    const db = await this.openDB();
    const validatedState = this.validateWorldState(state);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORLDS, 'readwrite');
      const store = tx.objectStore(STORE_WORLDS);
      const payload = {
        id,
        name,
        savedAt: new Date().toISOString(),
        schemaVersion: SAVE_SCHEMA_VERSION,
        state: validatedState
      };
      const req = store.put(payload);
      req.onerror = () => reject(req.error ?? new Error('WORLDSEED save failed'));
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('WORLDSEED save transaction failed'));
      };
    });
  }

  public static async loadWorld(id: string): Promise<WorldState | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORLDS, 'readonly');
      const req = tx.objectStore(STORE_WORLDS).get(id);
      req.onsuccess = () => {
        try {
          if (!req.result) resolve(null);
          else {
            const record = req.result as { schemaVersion?: number; state?: unknown };
            if ((record.schemaVersion ?? 0) > SAVE_SCHEMA_VERSION) {
              throw new Error(`Saved world schema ${record.schemaVersion} is newer than this app supports (${SAVE_SCHEMA_VERSION})`);
            }
            resolve(this.unwrapSavedState(record.state));
          }
        } catch (error) {
          reject(error);
        } finally {
          db.close();
        }
      };
      req.onerror = () => {
        db.close();
        reject(req.error ?? new Error('WORLDSEED load failed'));
      };
    });
  }

  public static async listSavedWorlds(): Promise<Array<{ id: string; name: string; savedAt: string; year: number }>> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_WORLDS, 'readonly').objectStore(STORE_WORLDS).getAll();
      req.onsuccess = () => {
        const list = (req.result || []).map(r => ({
          id: String(r.id),
          name: String(r.name),
          savedAt: String(r.savedAt),
          year: Number(r.state?.currentYear) || 0
        }));
        db.close();
        resolve(list);
      };
      req.onerror = () => {
        db.close();
        reject(req.error ?? new Error('WORLDSEED save-list read failed'));
      };
    });
  }

  public static async deleteWorld(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORLDS, 'readwrite');
      tx.objectStore(STORE_WORLDS).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('WORLDSEED delete failed'));
      };
    });
  }

  public static exportWorldToFile(state: WorldState, filename = 'worldseed_planet.json') {
    const envelope: SaveEnvelope = {
      format: SAVE_FORMAT,
      version: SAVE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      state: this.validateWorldState(state)
    };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  public static importWorldFromJSON(jsonString: string): WorldState {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('WORLDSEED save is not valid JSON');
    }
    return this.unwrapSavedState(parsed);
  }

  public static encodeSeedString(config: Partial<WorldConfig> & { seed: number; preset: string; seaLevel: number }): string {
    const envelope: RecipeEnvelope = {
      format: RECIPE_FORMAT,
      version: RECIPE_SCHEMA_VERSION,
      config
    };
    return btoa(JSON.stringify(envelope));
  }

  public static decodeSeedString(seedStr: string): (Partial<WorldConfig> & { seed: number; preset: string; seaLevel: number }) | null {
    try {
      const parsed = JSON.parse(atob(seedStr)) as unknown;
      if (isObject(parsed) && parsed.format === RECIPE_FORMAT) {
        if (Number(parsed.version) > RECIPE_SCHEMA_VERSION || !isObject(parsed.config)) return null;
        const config = parsed.config;
        if (!Number.isFinite(config.seed) || typeof config.preset !== 'string' || !Number.isFinite(config.seaLevel)) return null;
        return config as Partial<WorldConfig> & { seed: number; preset: string; seaLevel: number };
      }

      // Backward compatibility with the original compact seed object.
      if (isObject(parsed) && Number.isFinite(parsed.seed) && typeof parsed.preset === 'string' && Number.isFinite(parsed.seaLevel)) {
        return parsed as Partial<WorldConfig> & { seed: number; preset: string; seaLevel: number };
      }
      return null;
    } catch {
      return null;
    }
  }
}
