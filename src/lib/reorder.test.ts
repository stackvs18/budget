import { describe, expect, it } from 'vitest';
import { moveItem, moveItemToCategory } from './reorder';
import type { Item } from '@/types';

const item = (id: string, categoryId: string): Item => ({
  id, name: id, categoryId, priorityId: 'want', price: null, qty: 1, status: 'idea', note: '', link: '',
});
const ids = (items: Item[]) => items.map((i) => `${i.id}@${i.categoryId}`).join(' ');
const list = [item('a', 'x'), item('b', 'x'), item('c', 'x'), item('d', 'y')];

describe('moveItem', () => {
  it('moves down within a category', () => {
    expect(ids(moveItem(list, 'a', 'c'))).toBe('b@x c@x a@x d@y');
  });

  it('moves up within a category', () => {
    expect(ids(moveItem(list, 'c', 'a'))).toBe('c@x a@x b@x d@y');
  });

  it('takes on the category of the item it lands on', () => {
    expect(ids(moveItem(list, 'a', 'd'))).toBe('b@x c@x d@y a@y');
    expect(ids(moveItem(list, 'd', 'b'))).toBe('a@x d@x b@x c@x');
  });

  it('returns the same array when nothing changes', () => {
    expect(moveItem(list, 'a', 'a')).toBe(list);
    expect(moveItem(list, 'a', 'missing')).toBe(list);
  });
});

describe('moveItemToCategory', () => {
  it('appends to the end of the target category', () => {
    expect(ids(moveItemToCategory(list, 'd', 'x'))).toBe('a@x b@x c@x d@x');
    expect(ids(moveItemToCategory(list, 'a', 'y'))).toBe('b@x c@x d@y a@y');
  });

  it('handles an empty category', () => {
    expect(ids(moveItemToCategory(list, 'b', 'z'))).toBe('a@x c@x d@y b@z');
  });

  it('does nothing when already there', () => {
    expect(moveItemToCategory(list, 'a', 'x')).toBe(list);
  });
});
