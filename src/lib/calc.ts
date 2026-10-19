import type { BudgetData, Item, Tone } from '@/types';

export const cost = (item: Item) => (item.price == null ? 0 : item.price * item.qty);
export const sumCost = (items: Item[]) => items.reduce((total, item) => total + cost(item), 0);
export const isTicked = (item: Item) => item.status !== 'idea';

export interface Totals {
  start: number;
  incoming: number;
  available: number;
  bought: number;
  planned: number;
  /** Balance once every ticked item is paid for */
  afterPlan: number;
  floor: number;
  /** How far afterPlan sits above the floor (negative = below) */
  aboveFloor: number;
  budget: number;
  used: number;
  left: number;
  usedPct: number;
  tone: Tone;
  listed: number;
  unpriced: number;
  unpricedTicked: Item[];
}

export function computeTotals(data: BudgetData): Totals {
  const { settings, incomes, items } = data;
  const incoming = incomes.filter((i) => i.counted).reduce((t, i) => t + i.amount, 0);
  const available = settings.startBalance + incoming;
  const bought = sumCost(items.filter((i) => i.status === 'bought'));
  const planned = sumCost(items.filter((i) => i.status === 'planned'));
  const afterPlan = available - bought - planned;
  const aboveFloor = afterPlan - settings.floor;

  const budget = settings.budgetMode === 'fixed'
    ? settings.fixedBudget
    : Math.max(available - settings.floor, 0);
  const used = bought + planned;
  const left = budget - used;

  const over = left < 0 || aboveFloor < 0;
  const tight = !over && budget > 0 && left < (budget * settings.warnAt) / 100;

  return {
    start: settings.startBalance,
    incoming,
    available,
    bought,
    planned,
    afterPlan,
    floor: settings.floor,
    aboveFloor,
    budget,
    used,
    left,
    usedPct: budget > 0 ? (used / budget) * 100 : used > 0 ? 100 : 0,
    tone: over ? 'over' : tight ? 'tight' : 'ok',
    listed: sumCost(items),
    unpriced: items.filter((i) => i.price == null).length,
    unpricedTicked: items.filter((i) => isTicked(i) && i.price == null),
  };
}

export interface GroupTotals {
  count: number;
  listed: number;
  bought: number;
  planned: number;
  used: number;
}

export function groupTotals(items: Item[]): GroupTotals {
  const bought = sumCost(items.filter((i) => i.status === 'bought'));
  const planned = sumCost(items.filter((i) => i.status === 'planned'));
  return { count: items.length, listed: sumCost(items), bought, planned, used: bought + planned };
}
