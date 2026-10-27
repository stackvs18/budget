import { create } from 'zustand';
import { SaveConflict, ServerUnreachable, fetchData, saveData, saveOnExit, type StorageMode } from '@/lib/api';
import { pickStart, readLocal, savedAtOf, writeLocal } from '@/lib/localCopy';
import { SEED, migrate, uid } from '@/lib/migrate';
import { moveItem, moveItemToCategory } from '@/lib/reorder';
import { toast } from '@/store/toasts';
import type { BudgetData, Category, Display, Income, Item, Priority, Settings } from '@/types';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface BudgetStore {
  data: BudgetData | null;
  loadError: boolean;
  saveState: SaveState;
  /** Where data is being saved: data.json via the server, or this browser */
  storage: StorageMode;
  /** The data server isn't answering; changes are being kept in this browser until it's back */
  serverDown: boolean;
  /** Generic escape hatch: every action below goes through this. */
  update: (fn: (data: BudgetData) => BudgetData) => void;
}

export const useBudget = create<BudgetStore>()((set) => ({
  data: null,
  loadError: false,
  saveState: 'idle',
  storage: 'server',
  serverDown: false,
  update: (fn) => set((s) => (s.data ? { data: fn(s.data) } : s)),
}));

/** Read the loaded data inside components. Only rendered once data exists. */
export function useData<T>(select: (data: BudgetData) => T): T {
  return useBudget((s) => select(s.data!));
}

const update = (fn: (data: BudgetData) => BudgetData) => useBudget.getState().update(fn);
const replace = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>) =>
  list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));

// ---------- loading & saving ----------
//
// Every change is written to a copy in this browser first (instant, can't fail
// because a server is down), then sent to the data server a moment later.
// If the server is unreachable, saving keeps retrying and the browser copy is
// restored on the next load, so nothing typed is ever lost.
//
// Several devices can share one server. Each save says which server version it
// was made on (`base`); if another device saved in between, the server refuses
// instead of overwriting, and this device shows the latest with a "Use mine" option.
// Devices also pull in changes when you return to them, and every few seconds.

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let savedTimer: ReturnType<typeof setTimeout> | undefined;
let pingTimer: ReturnType<typeof setInterval> | undefined;
let pending: BudgetData | null = null;
/** Server version (savedAt) the data on screen is based on */
let base = 0;
/** Set while replacing the data with the server's, so it isn't saved straight back */
let applyingRemote = false;

const REFRESH_MS = 15_000;

function setServerDown(down: boolean) {
  if (useBudget.getState().serverDown === down) return;
  useBudget.setState({ serverDown: down });
  clearInterval(pingTimer);
  // While it's down, check every few seconds so saving resumes on its own.
  if (down) pingTimer = setInterval(() => void reconnect(), 5000);
}

async function reconnect() {
  try {
    const res = await fetch('/api/data', { method: 'GET', cache: 'no-store' });
    if (!res.ok) return;
  } catch {
    return;
  }
  setServerDown(false);
  if (pending) await flush();
}

/** Shows what the server has, without saving it back. */
function applyRemote(raw: unknown) {
  const data = migrate(raw);
  base = savedAtOf(raw);
  applyingRemote = true;
  useBudget.setState({ data });
  applyingRemote = false;
  writeLocal(data, true, base);
}

/** Offers to put this device's version back after it lost to another device's save. */
function offerMine(mine: BudgetData, title: string, body: string) {
  toast({ title, body, duration: 20_000, action: { label: 'Use mine', run: () => useBudget.setState({ data: mine }) } });
}

async function flush() {
  clearTimeout(saveTimer);
  if (!pending) return;
  const data = pending;
  pending = null;
  try {
    const savedAt = await saveData(data, base);
    base = savedAt;
    setServerDown(false);
    // Only mark the browser copy as synced if nothing changed while we were saving.
    if (!pending && useBudget.getState().data === data) writeLocal(data, true, base);
    useBudget.setState({ saveState: pending ? 'saving' : 'saved' });
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      if (useBudget.getState().saveState === 'saved') useBudget.setState({ saveState: 'idle' });
    }, 1800);
  } catch (err) {
    if (err instanceof SaveConflict) {
      pending = null;
      applyRemote(err.latest);
      useBudget.setState({ saveState: 'idle' });
      offerMine(data, 'Changed on another device', 'showing the latest; your last edit here was not saved');
      return;
    }
    pending ??= data;
    useBudget.setState({ saveState: 'error' });
    if (useBudget.getState().storage === 'server') setServerDown(true);
    saveTimer = setTimeout(flush, 4000);
  }
}

/** "Retry now" from the offline banner. */
export const retrySave = () => (pending ? flush() : reconnect());

/** Pulls in changes saved from another device, unless this one has unsaved edits. */
async function refreshFromServer() {
  const s = useBudget.getState();
  if (!s.data || s.storage !== 'server' || s.serverDown || pending || document.visibilityState !== 'visible') return;
  try {
    const { raw } = await fetchData();
    if (!pending && savedAtOf(raw) > base) applyRemote(raw);
  } catch {
    // Unreachable: the next save attempt will notice and show the banner.
  }
}

let loading: Promise<void> | null = null;

/** Loads once per page; later calls (e.g. StrictMode's double effect) share the first request. */
export function loadBudget() {
  loading ??= load();
  return loading;
}

export function retryLoad() {
  loading = null;
  return loadBudget();
}

async function load() {
  const local = readLocal();

  let result: Awaited<ReturnType<typeof fetchData>>;
  try {
    result = await fetchData();
  } catch (err) {
    // Server not running: open the copy from this browser and keep trying to save it.
    if (err instanceof ServerUnreachable && local) {
      const data = migrate(local.data);
      base = local.base ?? 0;
      useBudget.setState({ data, loadError: false, storage: 'server', saveState: local.synced ? 'idle' : 'error' });
      if (!local.synced) pending = data;
      setServerDown(true);
      return;
    }
    useBudget.setState({ loadError: true });
    return;
  }

  const { raw, mode } = result;
  const pick = mode === 'server' ? pickStart(raw, local) : 'server';
  base = savedAtOf(raw);
  const data = migrate(pick === 'local' ? local!.data : (raw ?? structuredClone(SEED)));
  useBudget.setState({ data, loadError: false, storage: mode });
  writeLocal(data, pick !== 'local', base);

  if (pick === 'local') {
    pending = data;
    await flush();
    toast({ title: 'Recovered', body: 'unsaved changes from last time were saved' });
  } else if (pick === 'conflict') {
    offerMine(migrate(local!.data), 'Updated from another device', 'changes left unsaved on this one were not applied');
  } else if (!raw || (raw as { version?: number }).version !== 2) {
    // Persist straight away when we created or upgraded the file.
    pending = data;
    void flush();
  }
}

useBudget.subscribe((state, prev) => {
  if (applyingRemote || !prev.data || state.data === prev.data || !state.data) return;
  writeLocal(state.data, false, base);
  pending = state.data;
  if (state.saveState !== 'saving' && state.saveState !== 'error') useBudget.setState({ saveState: 'saving' });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 450);
});

window.addEventListener('pagehide', () => {
  if (pending) saveOnExit(pending, base);
});

// Pick up other devices' changes when you come back to this one, and while it's open.
document.addEventListener('visibilitychange', () => void refreshFromServer());
window.addEventListener('focus', () => void refreshFromServer());
setInterval(() => void refreshFromServer(), REFRESH_MS);

// ---------- actions ----------

export const actions = {
  updateSettings: (patch: Partial<Settings>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
  updateDisplay: (patch: Partial<Display>) => update((d) => ({ ...d, display: { ...d.display, ...patch } })),

  // items
  addItem(partial: Partial<Item> & Pick<Item, 'name' | 'categoryId'>) {
    const item: Item = {
      id: uid(),
      priorityId: useBudget.getState().data?.priorities[0]?.id ?? '',
      price: null,
      qty: 1,
      status: 'idea',
      note: '',
      link: '',
      ...partial,
    };
    update((d) => ({ ...d, items: [...d.items, item] }));
    return item;
  },
  updateItem: (id: string, patch: Partial<Item>) => update((d) => ({ ...d, items: replace(d.items, id, patch) })),
  removeItem(id: string) {
    const items = useBudget.getState().data?.items ?? [];
    const index = items.findIndex((i) => i.id === id);
    update((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
    return { item: items[index], index };
  },
  /** Drag and drop: puts `activeId` where `overId` is, taking on that item's category. */
  moveItem: (activeId: string, overId: string) => update((d) => ({ ...d, items: moveItem(d.items, activeId, overId) })),
  /** Drag and drop onto a category (e.g. an empty one): moves the item to the end of it. */
  moveItemToCategory: (id: string, categoryId: string) =>
    update((d) => ({ ...d, items: moveItemToCategory(d.items, id, categoryId) })),
  restoreItem: (item: Item, index: number) =>
    update((d) => ({ ...d, items: [...d.items.slice(0, index), item, ...d.items.slice(index)] })),
  toggleTick: (id: string) =>
    update((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, status: i.status === 'idea' ? 'planned' : 'idea' } : i)),
    })),
  toggleBought: (id: string) =>
    update((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === id ? { ...i, status: i.status === 'bought' ? 'planned' : 'bought' } : i)),
    })),
  /** idea → planned → bought → idea */
  cycleStatus: (id: string) =>
    update((d) => ({
      ...d,
      items: d.items.map((i) =>
        i.id === id ? { ...i, status: i.status === 'idea' ? 'planned' : i.status === 'planned' ? 'bought' : 'idea' } : i,
      ),
    })),
  setStatus: (ids: string[], status: Item['status']) =>
    update((d) => ({ ...d, items: d.items.map((i) => (ids.includes(i.id) ? { ...i, status } : i)) })),
  clearTicks: () =>
    update((d) => ({ ...d, items: d.items.map((i) => (i.status === 'planned' ? { ...i, status: 'idea' } : i)) })),

  // categories
  addCategory(name = 'New category') {
    const category: Category = { id: uid(), name, budget: null };
    update((d) => ({ ...d, categories: [...d.categories, category] }));
    return category;
  },
  updateCategory: (id: string, patch: Partial<Category>) =>
    update((d) => ({ ...d, categories: replace(d.categories, id, patch) })),
  setCategories: (categories: Category[]) => update((d) => ({ ...d, categories })),
  /** Deletes a category and moves its items into `moveTo` (needed only if it has items). */
  removeCategory: (id: string, moveTo = '') =>
    update((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id),
      items: d.items.map((i) => (i.categoryId === id ? { ...i, categoryId: moveTo } : i)),
    })),

  // priorities
  addPriority(name = 'New priority') {
    const priority: Priority = { id: uid(), name };
    update((d) => ({ ...d, priorities: [...d.priorities, priority] }));
  },
  updatePriority: (id: string, patch: Partial<Priority>) =>
    update((d) => ({ ...d, priorities: replace(d.priorities, id, patch) })),
  setPriorities: (priorities: Priority[]) => update((d) => ({ ...d, priorities })),
  removePriority: (id: string, moveTo: string) =>
    update((d) => ({
      ...d,
      priorities: d.priorities.filter((p) => p.id !== id),
      items: d.items.map((i) => (i.priorityId === id ? { ...i, priorityId: moveTo } : i)),
    })),

  // incomes
  addIncome: () =>
    update((d) => ({
      ...d,
      incomes: [...d.incomes, { id: uid(), label: 'Income', amount: 0, date: '', counted: true } satisfies Income],
    })),
  updateIncome: (id: string, patch: Partial<Income>) => update((d) => ({ ...d, incomes: replace(d.incomes, id, patch) })),
  removeIncome: (id: string) => update((d) => ({ ...d, incomes: d.incomes.filter((i) => i.id !== id) })),

  // whole data
  replaceAll: (data: BudgetData) => update(() => data),
  resetToStarter: () => update((d) => ({ ...structuredClone(SEED), display: d.display })),
  clearItems: () => update((d) => ({ ...d, items: [] })),
};
