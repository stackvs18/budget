import { describe, expect, it } from 'vitest';
import { isBudgetData, migrate } from './migrate';
import { safeUrl } from './url';

describe('migrate', () => {
  it('returns a blank plan for missing data', () => {
    const data = migrate(null);
    expect(data.items).toEqual([]);
    expect(data.categories).toEqual([]);
    expect(data.priorities.map((p) => p.name)).toEqual(['Need', 'Want', 'Later']);
    expect(data.display.theme).toBe('light');
  });

  it('upgrades the first version of data.json', () => {
    const data = migrate({
      settings: { startBalance: 15000, floor: 6000, incoming: 3000, countIncoming: false },
      items: [
        { id: 'shoes', name: 'Shoes', category: 'Clothing', price: 6600, priority: 'want', status: 'planned' },
        { id: 'jeans', name: 'Jeans', category: 'Clothing', price: null, priority: 'want', status: 'idea' },
      ],
    });
    expect(data.version).toBe(2);
    expect(data.settings.startBalance).toBe(15000);
    expect(data.categories.map((c) => c.name)).toEqual(['Clothing']);
    expect(data.items[0]).toMatchObject({ name: 'Shoes', price: 6600, status: 'planned', qty: 1, categoryId: data.categories[0].id });
    expect(data.incomes[0]).toMatchObject({ amount: 3000, counted: false });
  });

  it('repairs bad types from a hand-edited or foreign file', () => {
    const data = migrate({
      version: 2,
      settings: { startBalance: '15000', warnAt: 900, currency: { symbol: '₹₹₹₹₹₹', decimals: 7 } },
      display: { theme: 'neon' },
      priorities: [{ id: 'need', name: 'Need' }],
      categories: [{ id: 'c', name: 'Stuff', budget: -5 }],
      items: [{ id: 'x', name: '  ', categoryId: 'c', priorityId: 'need', price: '6000', qty: -2, status: 'maybe' }],
    });
    expect(data.settings.startBalance).toBe(0);
    expect(data.settings.warnAt).toBe(50);
    expect(data.settings.currency.symbol).toHaveLength(4);
    expect(data.settings.currency.decimals).toBe(0);
    expect(data.display.theme).toBe('light');
    expect(data.categories[0].budget).toBeNull();
    expect(data.items[0]).toMatchObject({ name: 'Untitled', price: null, qty: 1, status: 'idea' });
  });

  it('rescues items whose category no longer exists', () => {
    const data = migrate({
      version: 2,
      settings: {},
      categories: [],
      items: [{ id: 'x', name: 'Orphan', categoryId: 'gone', priorityId: 'gone', price: 100 }],
    });
    expect(data.categories.map((c) => c.name)).toEqual(['Uncategorized']);
    expect(data.items[0].categoryId).toBe(data.categories[0].id);
    expect(data.items[0].priorityId).toBe(data.priorities[0].id);
  });

  it('recognises exports', () => {
    expect(isBudgetData({ items: [], settings: {} })).toBe(true);
    expect(isBudgetData({ hello: 'world' })).toBe(false);
    expect(isBudgetData([])).toBe(false);
  });
});

describe('safeUrl', () => {
  it('adds https to bare domains', () => {
    expect(safeUrl('amazon.in/shoes')).toBe('https://amazon.in/shoes');
  });

  it('keeps http and https links', () => {
    expect(safeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('refuses script and other schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,hi')).toBeNull();
    expect(safeUrl('')).toBeNull();
  });
});
