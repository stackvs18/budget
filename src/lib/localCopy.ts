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
export function writeLocal(data: unknown, synced: boolean): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ data, savedAt: Date.now(), synced } satisfies LocalCopy));
    return true;
  } catch {
    return false;
  }
}

/**
 * Picks what to open with. The browser copy wins only when it holds changes
 * the server never received and is newer than what the server has.
 */
export function pickStart(server: unknown, local: LocalCopy | null): 'server' | 'local' {
  if (!local || local.synced) return 'server';
  const serverSavedAt =
    server && typeof server === 'object' && typeof (server as { savedAt?: unknown }).savedAt === 'number'
      ? (server as { savedAt: number }).savedAt
      : 0;
  return local.savedAt > serverSavedAt ? 'local' : 'server';
}
