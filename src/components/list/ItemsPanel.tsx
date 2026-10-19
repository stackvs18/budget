import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CategorySection } from '@/components/list/CategorySection';
import { MoneyInput, Select, TextTabs, fieldClass } from '@/components/ui/inputs';
import { isTicked } from '@/lib/calc';
import { cn } from '@/lib/cn';
import { visibleItems } from '@/lib/view';
import { actions, useData } from '@/store/budget';
import { toast } from '@/store/toasts';
import { useUI } from '@/store/ui';
import type { FilterMode, SortMode } from '@/types';

const FILTERS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planned', label: 'Planned' },
  { value: 'bought', label: 'Bought' },
  { value: 'open', label: 'Not bought' },
  { value: 'unpriced', label: 'No price' },
];

const SORTS: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'List order' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'priority', label: 'Priority' },
  { value: 'name', label: 'Name' },
];

export function ItemsPanel() {
  const categories = useData((d) => d.categories);
  const priorities = useData((d) => d.priorities);
  const items = useData((d) => d.items);
  const { filter, sort } = useData((d) => d.display);
  const search = useUI((s) => s.search);
  const filtered = filter !== 'all' || search.trim() !== '';
  const planned = items.filter((i) => i.status === 'planned');

  const visible = useMemo(() => visibleItems(items, { filter, sort, search, priorities }), [items, filter, sort, search, priorities]);

  // A small movement threshold keeps clicks on the handle from starting a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const overId = String(over.id);
    if (overId.startsWith('category:')) actions.moveItemToCategory(String(active.id), overId.slice('category:'.length));
    else actions.moveItem(String(active.id), overId);
  };

  const untickAll = () => {
    const ids = planned.map((i) => i.id);
    actions.clearTicks();
    toast({ title: 'Unticked', body: `${ids.length} item${ids.length === 1 ? '' : 's'}`, action: { label: 'Undo', run: () => actions.setStatus(ids, 'planned') } });
  };

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="label">Items</span>
        <span className="label tabular-nums">{items.filter(isTicked).length} ticked / {items.length}</span>
      </div>

      <AddItemBar />

      {items.length > 0 && (
        <div className="mt-8 grid gap-3">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <input
              value={search}
              onChange={(e) => useUI.setState({ search: e.target.value })}
              placeholder="Search"
              aria-label="Search items"
              className={cn(fieldClass, 'w-auto min-w-[160px] flex-1')}
            />
            <Select value={sort} onChange={(e) => actions.updateDisplay({ sort: e.target.value as SortMode })} aria-label="Sort" className="w-[170px]">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TextTabs label="Filter" value={filter} options={FILTERS} onChange={(f) => actions.updateDisplay({ filter: f })} />
            {planned.length > 0 && (
              <button type="button" onClick={untickAll} className="h-7 font-mono text-[12px] text-faint uppercase hover:text-fg">
                Untick all
              </button>
            )}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {categories.map((category) => {
          const shown = visible.filter((i) => i.categoryId === category.id);
          if (filtered && !shown.length) return null;
          return (
            <CategorySection
              key={category.id}
              category={category}
              allItems={items.filter((i) => i.categoryId === category.id)}
              items={shown}
              filtered={filtered}
            />
          );
        })}
      </DndContext>

      {!categories.length && (
        <div className="pt-16">
          <p className="display text-[40px] text-faint md:text-[56px]">Nothing here yet.</p>
          <p className="mt-3 max-w-md text-muted">
            Type an item above and give it a category. A new category name creates that category. Set your balance on the right.
          </p>
        </div>
      )}
      {filtered && categories.length > 0 && !visible.length && <p className="pt-12 text-muted">No items match.</p>}
    </section>
  );
}

function AddItemBar() {
  const categories = useData((d) => d.categories);
  const priorities = useData((d) => d.priorities);
  const addFocus = useUI((s) => s.addFocus);
  const listId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [priorityId, setPriorityId] = useState(priorities[0]?.id ?? '');
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!addFocus) return;
    window.scrollTo({ top: 0 });
    nameRef.current?.focus();
  }, [addFocus]);

  const priority = priorities.some((p) => p.id === priorityId) ? priorityId : priorities[0]?.id ?? '';

  const submit = () => {
    const itemName = name.trim();
    if (!itemName) return nameRef.current?.focus();

    // Use the typed category, creating it if it's new.
    const categoryName = category.trim() || categories[0]?.name || 'General';
    const existing = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    const categoryId = existing?.id ?? actions.addCategory(categoryName).id;

    actions.addItem({ name: itemName, price, categoryId, priorityId: priority });
    setCategory(existing?.name ?? categoryName);
    setName('');
    setPrice(null);
    setResetKey((k) => k + 1);
    nameRef.current?.focus();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-3 grid grid-cols-2 items-end gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_170px_90px_110px_auto]"
    >
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add an item"
        aria-label="New item name"
        maxLength={120}
        className={cn(fieldClass, 'col-span-2 h-11 text-[17px] sm:col-span-1')}
      />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        list={listId}
        maxLength={60}
        placeholder={categories[0]?.name ?? 'Category'}
        aria-label="Category (type a new name to create one)"
        className={fieldClass}
      />
      <datalist id={listId}>
        {categories.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <Select value={priority} onChange={(e) => setPriorityId(e.target.value)} aria-label="Priority">
        {priorities.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
      <MoneyInput key={resetKey} value={price} onValueChange={setPrice} placeholder="Price" aria-label="Price" />
      <button type="submit" className="col-span-2 h-9 bg-fg px-5 font-mono text-[12px] text-bg uppercase hover:opacity-80 sm:col-span-1">
        Add
      </button>
    </form>
  );
}
