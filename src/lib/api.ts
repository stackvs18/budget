import type { BudgetData } from '@/types';

const ENDPOINT = '/api/data';
const LOCAL_KEY = 'budget:data';

/**
 * server:  a data server is running (npm start / npm run serve), data lives in data.json.
 * browser: static hosting (Vercel, Netlify…) with no data server, data lives in this browser's localStorage.
 */
export type StorageMode = 'server' | 'browser';
let mode: StorageMode = 'server';

export async function fetchData(): Promise<{ raw: unknown; mode: StorageMode }> {
  // A network error throws here, which shows the "can't reach the server" screen.
  const res = await fetch(ENDPOINT, { cache: 'no-store' });
  const isJson = res.headers.get('content-type')?.includes('application/json');

  if (res.ok && isJson) {
    mode = 'server';
    return { raw: await res.json(), mode };
  }
  // 404, or a static host answering with index.html: no data server here.
  if (res.status === 404 || (res.ok && !isJson)) {
    mode = 'browser';
    const saved = localStorage.getItem(LOCAL_KEY);
    return { raw: saved ? JSON.parse(saved) : null, mode };
  }
  throw new Error(`Load failed: ${res.status}`);
}

export async function saveData(data: BudgetData) {
  if (mode === 'browser') {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    return;
  }
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

/** Last-chance save while the tab closes. */
export function saveOnExit(data: BudgetData) {
  if (mode === 'browser') {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    return;
  }
  fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  });
}
