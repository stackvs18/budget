import { describe, expect, it } from 'vitest';
import { computeTotals, cost } from './calc';
import { SEED } from './migrate';
import type { BudgetData, Item } from '@/types';

const item = (patch: Partial<Item>): Item => ({
  id: Math.random().toString(36).slice(2),
  name: 'Thing',
  categoryId: 'c',
  priorityId: 'want',
  price: null,
  qty: 1,
  status: 'idea',
  note: '',
  link: '',
  ...patch,
});

const plan = (items: Item[], settings: Partial<BudgetData['settings']> = {}, incomes: BudgetData['incomes'] = []): BudgetData => ({
  ...structuredClone(SEED),
  settings: { ...SEED.settings, startBalance: 15000, floor: 6000, ...settings },
  categories: [{ id: 'c', name: 'Stuff', budget: null }],
  incomes,
  items,
});

describe('computeTotals', () => {
  it('drops the balance by ticked items (the shoes example)', () => {
    const t = computeTotals(plan([item({ price: 6000, status: 'planned' })]));
    expect(t.afterPlan).toBe(9000);
    expect(t.budget).toBe(9000);
    expect(t.left).toBe(3000);
    expect(t.aboveFloor).toBe(3000);
    expect(t.tone).toBe('ok');
  });

  it('ignores unticked items and items without a price', () => {
    const t = computeTotals(plan([item({ price: 6000 }), item({ status: 'planned' })]));
    expect(t.afterPlan).toBe(15000);
    expect(t.unpricedTicked).toHaveLength(1);
    expect(t.unpriced).toBe(1);
  });

  it('counts bought separately from planned', () => {
    const t = computeTotals(plan([item({ price: 1999, status: 'bought' }), item({ price: 6000, status: 'planned' })]));
    expect(t.bought).toBe(1999);
    expect(t.planned).toBe(6000);
    expect(t.afterPlan).toBe(7001);
  });

  it('multiplies by quantity', () => {
    expect(cost(item({ price: 250, qty: 3 }))).toBe(750);
  });

  it('flags going below the floor as over', () => {
    const t = computeTotals(plan([item({ price: 9960, status: 'planned' })]));
    expect(t.left).toBe(-960);
    expect(t.tone).toBe('over');
  });

  it('flags tight when less than warnAt% of the budget is left', () => {
    const t = computeTotals(plan([item({ price: 8000, status: 'planned' })], { warnAt: 15 }));
    expect(t.left).toBe(1000);
    expect(t.tone).toBe('tight');
  });

  it('adds only counted income', () => {
    const t = computeTotals(
      plan([], {}, [
        { id: 'a', label: 'Salary', amount: 3000, date: '', counted: true },
        { id: 'b', label: 'Maybe', amount: 500, date: '', counted: false },
      ]),
    );
    expect(t.incoming).toBe(3000);
    expect(t.budget).toBe(12000);
  });

  it('uses a fixed budget when set, but still watches the floor', () => {
    const t = computeTotals(plan([item({ price: 9500, status: 'planned' })], { budgetMode: 'fixed', fixedBudget: 10000 }));
    expect(t.budget).toBe(10000);
    expect(t.left).toBe(500);
    expect(t.aboveFloor).toBe(-500);
    expect(t.tone).toBe('over');
  });

  it('never reports a negative budget', () => {
    const t = computeTotals(plan([], { startBalance: 1000, floor: 6000 }));
    expect(t.budget).toBe(0);
  });
});
