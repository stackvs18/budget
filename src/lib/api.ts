import type { BudgetData } from '@/types';
import { readLocal, writeLocal } from './localCopy';

const ENDPOINT = '/api/data';

/**
 * server:  a data server is running (npm start / npm run serve), data lives in data.json.
 * browser: static hosting (Vercel, Netlify…) with no data server, data lives in this browser.
 *
 * Any backend that answers GET/PUT /api/data with the plan as JSON (a Vercel function
 * backed by a database, for example) works in server mode without client changes.
 */
export type StorageMode = 'server' | 'browser';
let mode: StorageMode = 'server';

/** The data server couldn't be reached at all (not running, no network). */
export class ServerUnreachable extends Error {}

export async function fetchData(): Promise<{ raw: unknown; mode: StorageMode }> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { cache: 'no-store' });
  } catch {
    throw new ServerUnreachable('No data server');
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');

  if (res.ok && isJson) {
    mode = 'server';
    return { raw: await res.json(), mode };
  }
  // 404, or a static host answering with index.html: no data server here.
  if (res.status === 404 || (res.ok && !isJson)) {
    mode = 'browser';
    return { raw: readLocal()?.data ?? null, mode };
  }
  throw new Error(`Load failed: ${res.status}`);
}

export async function saveData(data: BudgetData) {
  if (mode === 'browser') {
    if (!writeLocal(data, true)) throw new Error('Browser storage is blocked');
    return;
  }
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

/** Last-chance save while the tab closes. The browser copy is already written. */
export function saveOnExit(data: BudgetData) {
  if (mode === 'browser') return;
  fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  }).catch(() => {});
}
