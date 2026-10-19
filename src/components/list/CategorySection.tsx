import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ItemRow } from '@/components/list/ItemRow';
import { Badge, MoneyInput, fieldClass } from '@/components/ui/inputs';
import { useFormatter } from '@/hooks';
import { groupTotals } from '@/lib/calc';
import { cn } from '@/lib/cn';
import { actions } from '@/store/budget';
import type { Category, Item } from '@/types';

interface Props {
  category: Category;
  /** Every item in the category, for totals */
  allItems: Item[];
  /** Items after search/filter/sort */
  items: Item[];
  filtered: boolean;
}

export function CategorySection({ category, allItems, items, filtered }: Props) {
  const fmt = useFormatter();
  const g = groupTotals(allItems);
  const limit = category.budget;
  const over = limit != null && g.used > limit;
  // The whole section accepts drops, so items can be dragged into an empty category too.
  const { setNodeRef, isOver } = useDroppable({ id: `category:${category.id}` });

  return (
    <section ref={setNodeRef} id={`cat-${category.id}`} data-category-id={category.id} className="scroll-mt-20 pt-14">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-3">
        <h2 className="display text-[32px] md:text-[40px]">{category.name}</h2>
        <p className="flex items-center gap-2 font-mono text-[12px] text-muted tabular-nums">
          {over && <Badge>Over</Badge>}
          <span className="text-fg">{fmt.money(g.used)}</span>
          {limit != null ? `/ ${fmt.money(limit)} limit` : `of ${fmt.money(g.listed)}`}
        </p>
      </header>

      {limit != null && (
        <div className="h-px bg-line">
          <div className="h-full bg-fg" style={{ width: `${Math.min((g.used / Math.max(limit, 1)) * 100, 100)}%` }} />
        </div>
      )}

      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={cn('divide-y divide-line border-t transition-colors', isOver ? 'border-fg' : 'border-line')}>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      </SortableContext>
      {!items.length && (
        <p className={cn('py-3 transition-colors', isOver ? 'text-fg' : 'text-faint')}>
          {isOver ? 'Drop here' : filtered ? 'Nothing matches here.' : 'Nothing here yet.'}
        </p>
      )}
      <QuickAdd categoryId={category.id} />
    </section>
  );
}

/** Inline adder under each category: name, price, Enter. */
function QuickAdd({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 h-8 font-mono text-[12px] text-faint uppercase hover:text-fg">
        + Add item
      </button>
    );
  }

  const close = () => {
    setOpen(false);
    setName('');
    setPrice(null);
  };

  return (
    <form
      className="mt-2 flex items-end gap-4"
      onKeyDown={(e) => e.key === 'Escape' && close()}
      onBlur={(e) => {
        // Close when focus leaves the form with nothing typed.
        if (!e.currentTarget.contains(e.relatedTarget) && !name.trim() && price == null) close();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return nameRef.current?.focus();
        actions.addItem({ name: name.trim(), price, categoryId });
        setName('');
        setPrice(null);
        setResetKey((k) => k + 1);
        nameRef.current?.focus();
      }}
    >
      <input
        ref={nameRef}
        autoFocus
        value={name}
        maxLength={120}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        aria-label="New item name"
        className={cn(fieldClass, 'flex-1 border-fg text-[15px]')}
      />
      <MoneyInput key={resetKey} value={price} onValueChange={setPrice} placeholder="Price" aria-label="New item price" className="w-28 border-fg" />
      <button type="submit" className="h-9 shrink-0 font-mono text-[12px] uppercase hover:text-muted">
        Add
      </button>
    </form>
  );
}
