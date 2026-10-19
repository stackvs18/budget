import type { FilterMode, Item, Priority, SortMode } from '@/types';
import { cost } from './calc';

interface ViewOptions {
  filter: FilterMode;
  sort: SortMode;
  search: string;
  priorities: Priority[];
}

const FILTERS: Record<FilterMode, (item: Item) => boolean> = {
  all: () => true,
  planned: (i) => i.status === 'planned',
  bought: (i) => i.status === 'bought',
  open: (i) => i.status !== 'bought',
  unpriced: (i) => i.price == null,
};

export function visibleItems(items: Item[], { filter, sort, search, priorities }: ViewOptions): Item[] {
  const query = search.trim().toLowerCase();
  const list = items.filter(
    (i) => FILTERS[filter](i) && (!query || i.name.toLowerCase().includes(query) || i.note.toLowerCase().includes(query)),
  );

  const rank = (i: Item) => {
    const index = priorities.findIndex((p) => p.id === i.priorityId);
    return index === -1 ? priorities.length : index;
  };

  switch (sort) {
    case 'price-desc':
      return list.sort((a, b) => cost(b) - cost(a));
    case 'price-asc':
      return list.sort((a, b) => (a.price == null ? 1 : b.price == null ? -1 : cost(a) - cost(b)));
    case 'priority':
      return list.sort((a, b) => rank(a) - rank(b));
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return list;
  }
}
