import type { Item } from '@/types';

/** Puts `activeId` where `overId` sits, taking on that item's category. Same array back if nothing changes. */
export function moveItem(items: Item[], activeId: string, overId: string): Item[] {
  const from = items.findIndex((i) => i.id === activeId);
  const to = items.findIndex((i) => i.id === overId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, { ...moved, categoryId: items[to].categoryId });
  return next;
}

/** Moves an item to the end of a category (used when dropping onto a category rather than an item). */
export function moveItemToCategory(items: Item[], id: string, categoryId: string): Item[] {
  const moving = items.find((i) => i.id === id);
  if (!moving || moving.categoryId === categoryId) return items;
  const rest = items.filter((i) => i.id !== id);
  const lastInCategory = rest.findLastIndex((i) => i.categoryId === categoryId);
  const at = lastInCategory === -1 ? rest.length : lastInCategory + 1;
  return [...rest.slice(0, at), { ...moving, categoryId }, ...rest.slice(at)];
}
