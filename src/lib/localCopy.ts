/**
 * A copy of the plan kept in this browser, written on every change.
 * It means nothing is lost if the data server is down: the next load
 * restores it and sends it on to the server.
 */
const KEY = 'budget:local';
/** Static-host mode used to keep raw data under this key. */
const LEGACY_KEY = 'budget:data';

export interface LocalCopy {
  data: unknown;
  /** When this copy was written (ms since epoch) */
  savedAt: number;
  /** True once the server has confirmed it has this exact data */
  synced: boolean;
  /** The server version (its savedAt) these changes were made on top of */
  base?: number;
}

/** The server's version stamp on a saved plan, or 0 if it has none. */
export function savedAtOf(raw: unknown): number {
  const value = raw && typeof raw === 'object' ? (raw as { savedAt?: unknown }).savedAt : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function readLocal(): LocalCopy | null {
  try {
    const text = localStorage.getItem(KEY);
    if (text) return JSON.parse(text) as LocalCopy;
    const legacy = localStorage.getItem(LEGACY_KEY);
    return legacy ? { data: JSON.parse(legacy), savedAt: 0, synced: true } : null;
  } catch {
    return null;
  }
}

/** Returns false when the browser blocks storage (e.g. some private windows). */
export function writeLocal(data: unknown, synced: boolean, base: number): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ data, savedAt: Date.now(), synced, base } satisfies LocalCopy));
    return true;
  } catch {
    return false;
  }
}

/**
 * Picks what to open with, given what the server has and this browser's copy.
 * - server:   nothing unsaved here
 * - local:    unsaved changes here, and the server hasn't changed since they were made
 * - conflict: unsaved changes here, but another device has saved since
 */
export function pickStart(server: unknown, local: LocalCopy | null): 'server' | 'local' | 'conflict' {
  if (!local || local.synced) return 'server';
  const serverSavedAt = savedAtOf(server);
  // Copies written before versions were tracked: fall back to "newest wins".
  const base = local.base ?? (local.savedAt > serverSavedAt ? serverSavedAt : -1);
  return serverSavedAt <= base ? 'local' : 'conflict';
}
