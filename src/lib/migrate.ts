import seed from '../../seed.json';
import type { BudgetData, Category, Display, Income, Item, Priority, Settings, Status } from '@/types';

/** Blank starting plan: no items or categories, default priorities. */
export const SEED = seed as BudgetData;

export const uid = () => crypto.randomUUID().slice(0, 8);

type Loose = Record<string, unknown>;

const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const list = (v: unknown): Loose[] => (Array.isArray(v) ? v.filter(isObject) : []);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const money = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;

const STATUSES = ['idea', 'planned', 'bought'] as const;

function normalizeSettings(raw: unknown): Settings {
  const s = isObject(raw) ? raw : {};
  const c = isObject(s.currency) ? s.currency : {};
  const d = SEED.settings;
  return {
    title: str(s.title).trim() || d.title,
    currency: {
      symbol: str(c.symbol, d.currency.symbol).slice(0, 4),
      locale: str(c.locale) || d.currency.locale,
      decimals: c.decimals === 2 ? 2 : 0,
    },
    startBalance: num(s.startBalance),
    floor: num(s.floor),
    budgetMode: oneOf(s.budgetMode, ['above-floor', 'fixed'], d.budgetMode),
    fixedBudget: num(s.fixedBudget),
    warnAt: Math.min(Math.max(num(s.warnAt, d.warnAt), 0), 50),
  };
}

function normalizeDisplay(raw: unknown): Display {
  const s = isObject(raw) ? raw : {};
  const d = SEED.display;
  return {
    theme: oneOf(s.theme, ['light', 'dark', 'system'], d.theme),
    density: oneOf(s.density, ['comfortable', 'compact'], d.density),
    sort: oneOf(s.sort, ['manual', 'price-desc', 'price-asc', 'priority', 'name'], d.sort),
    filter: oneOf(s.filter, ['all', 'planned', 'bought', 'open', 'unpriced'], d.filter),
  };
}

/** Makes any saved or imported object safe to render: right types, valid references, no surprises. */
function normalize(raw: Loose): BudgetData {
  const priorities: Priority[] = list(raw.priorities).map((p) => ({ id: str(p.id) || uid(), name: str(p.name).trim() || 'Priority' }));
  if (!priorities.length) priorities.push(...structuredClone(SEED.priorities));

  const categories: Category[] = list(raw.categories).map((c) => ({
    id: str(c.id) || uid(),
    name: str(c.name).trim() || 'Category',
    budget: money(c.budget),
  }));

  const items: Item[] = list(raw.items).map((i) => ({
    id: str(i.id) || uid(),
    name: str(i.name).trim() || 'Untitled',
    categoryId: str(i.categoryId),
    priorityId: str(i.priorityId),
    price: money(i.price),
    qty: Math.max(1, Math.floor(num(i.qty, 1))),
    status: oneOf(i.status, STATUSES, 'idea'),
    note: str(i.note),
    link: str(i.link),
  }));

  // Items must point at a real category, or they'd count in totals without being shown.
  const categoryIds = new Set(categories.map((c) => c.id));
  if (items.some((i) => !categoryIds.has(i.categoryId))) {
    let fallback = categories.find((c) => c.name === 'Uncategorized');
    if (!fallback) categories.push((fallback = { id: uid(), name: 'Uncategorized', budget: null }));
    for (const item of items) if (!categoryIds.has(item.categoryId)) item.categoryId = fallback.id;
  }
  const priorityIds = new Set(priorities.map((p) => p.id));
  for (const item of items) if (!priorityIds.has(item.priorityId)) item.priorityId = priorities[0].id;

  const incomes: Income[] = list(raw.incomes).map((i) => ({
    id: str(i.id) || uid(),
    label: str(i.label).trim() || 'Income',
    amount: money(i.amount) ?? 0,
    date: str(i.date),
    counted: i.counted !== false,
  }));

  return {
    version: 2,
    settings: normalizeSettings(raw.settings),
    display: normalizeDisplay(raw.display),
    incomes,
    priorities,
    categories,
    items,
  };
}

interface V1Data {
  settings: { startBalance: number; floor: number; incoming: number; countIncoming: boolean };
  items: { id: string; name: string; category: string; price: number | null; priority: string; status: Status }[];
}

/** Converts the first (vanilla JS) version's data.json into the current shape. */
function fromV1(old: V1Data): Loose {
  const categories: Category[] = [];
  const categoryId = (name: string) => {
    let category = categories.find((c) => c.name === name);
    if (!category) categories.push((category = { id: uid(), name, budget: null }));
    return category.id;
  };

  return {
    settings: { ...SEED.settings, startBalance: old.settings?.startBalance, floor: old.settings?.floor },
    display: SEED.display,
    priorities: SEED.priorities,
    incomes: old.settings?.incoming
      ? [{ id: uid(), label: 'Later this month', amount: old.settings.incoming, date: '', counted: old.settings.countIncoming }]
      : [],
    categories,
    items: (old.items ?? []).map((item) => ({ ...item, categoryId: categoryId(item.category), priorityId: item.priority })),
  };
}

/** Accepts anything we've ever saved (or imported) and returns valid, current-shape data. */
export function migrate(raw: unknown): BudgetData {
  if (!isObject(raw)) return structuredClone(SEED);
  return normalize(raw.version === 2 ? raw : fromV1(raw as unknown as V1Data));
}

/** True for anything that looks like an export from this app (any version). */
export function isBudgetData(raw: unknown): boolean {
  return isObject(raw) && Array.isArray(raw.items) && isObject(raw.settings);
}
