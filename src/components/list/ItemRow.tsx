import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ExternalLink, GripVertical, StickyNote, Trash2 } from 'lucide-react';
import { Field, MoneyInput, Select, TextInput, inlineClass } from '@/components/ui/inputs';
import { useFormatter } from '@/hooks';
import { cost } from '@/lib/calc';
import { cn } from '@/lib/cn';
import { safeUrl } from '@/lib/url';
import { actions, useData } from '@/store/budget';
import { toast } from '@/store/toasts';
import { useUI } from '@/store/ui';
import type { Item, Status } from '@/types';

/** Moves focus to the next price field down the page, like Enter in a spreadsheet column. */
function focusNextPrice(current: HTMLInputElement) {
  const prices = [...document.querySelectorAll<HTMLInputElement>('[data-price-input]')];
  const next = prices[prices.indexOf(current) + 1];
  if (next) next.focus();
  else current.blur();
}

const STATUS: Record<Status, { label: string; className: string }> = {
  idea: { label: 'Idea', className: 'text-faint hover:text-muted' },
  planned: { label: 'Planned', className: 'text-fg' },
  bought: { label: 'Bought', className: 'bg-fg text-bg' },
};

/** Deletes straight away; the message that appears offers Undo. */
function deleteItem(id: string) {
  const { item, index } = actions.removeItem(id);
  if (useUI.getState().expandedItem === id) useUI.setState({ expandedItem: null });
  toast({ title: 'Deleted', body: item.name, action: { label: 'Undo', run: () => actions.restoreItem(item, index) } });
}

export const ItemRow = memo(function ItemRow({ item }: { item: Item }) {
  const expanded = useUI((s) => s.expandedItem === item.id);
  const priorities = useData((d) => d.priorities);
  // Dragging follows list order, so it's only on when that's the sort.
  const canDrag = useData((d) => d.display.sort === 'manual');
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canDrag,
  });
  const bought = item.status === 'bought';
  const href = safeUrl(item.link);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-20 bg-bg shadow-[0_8px_24px_-8px_rgb(0_0_0/0.25)]')}
    >
      <div className={cn('item-grid -mx-2 px-2 py-[var(--row-py)] transition-colors hover:bg-raised', (expanded || isDragging) && 'bg-raised')}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={!canDrag}
          aria-label={`Drag to reorder ${item.name}`}
          title={canDrag ? 'Drag to reorder (or focus and use Space + arrow keys)' : 'Switch sort to “List order” to drag'}
          className={cn(
            'grid h-8 w-5 touch-none place-items-center text-faint [grid-area:grip]',
            canDrag ? 'cursor-grab hover:text-fg active:cursor-grabbing' : 'cursor-not-allowed opacity-30',
          )}
        >
          <GripVertical className="size-4" />
        </button>
        <input
          type="checkbox"
          checked={item.status !== 'idea'}
          onChange={() => actions.toggleTick(item.id)}
          aria-label={`Plan ${item.name}`}
          className="size-4 [grid-area:tick]"
        />

        <div className="flex min-w-0 items-center gap-2 [grid-area:name]">
          <TextInput
            value={item.name}
            required
            maxLength={120}
            aria-label="Item name"
            onValueChange={(name) => actions.updateItem(item.id, { name })}
            className={cn(inlineClass, 'min-w-0 flex-1 text-[15px]', bought && 'text-faint line-through')}
          />
          {item.qty > 1 && <span className="font-mono text-[11px] text-muted">×{item.qty}</span>}
          {item.note && <StickyNote className="size-3.5 shrink-0 text-faint" aria-label="Has a note" />}
          {href && (
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Open link" className="shrink-0 text-faint hover:text-fg">
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        <Select
          value={item.priorityId}
          aria-label={`Priority of ${item.name}`}
          onChange={(e) => actions.updateItem(item.id, { priorityId: e.target.value })}
          className="w-28 [grid-area:prio] sm:w-full"
          selectClassName="h-8 border-line text-sm"
        >
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>

        <MoneyInput
          value={item.price}
          onValueChange={(price) => actions.updateItem(item.id, { price })}
          placeholder="—"
          aria-label={`Price of ${item.name}`}
          data-price-input
          className={cn(inlineClass, 'w-full text-[15px] [grid-area:price]', bought && 'text-faint')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              focusNextPrice(e.currentTarget);
            }
          }}
        />

        <button
          type="button"
          onClick={() => actions.cycleStatus(item.id)}
          title="Click to change: Idea → Planned → Bought"
          className={cn('h-6 justify-self-start px-1.5 font-mono text-[11px] uppercase transition-colors [grid-area:status]', STATUS[item.status].className)}
        >
          {STATUS[item.status].label}
        </button>

        <button
          type="button"
          aria-label={expanded ? 'Hide details' : 'Show details'}
          aria-expanded={expanded}
          onClick={() => useUI.setState({ expandedItem: expanded ? null : item.id })}
          className="grid size-8 place-items-center text-faint hover:text-fg [grid-area:more]"
        >
          <ChevronDown className={cn('size-4', expanded && 'rotate-180')} />
        </button>

        <button
          type="button"
          aria-label={`Delete ${item.name}`}
          title="Delete (you can undo)"
          onClick={() => deleteItem(item.id)}
          className="grid size-8 place-items-center text-faint transition-colors hover:text-fg [grid-area:del]"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {expanded && <ItemDetails item={item} />}
    </li>
  );
});

function ItemDetails({ item }: { item: Item }) {
  const fmt = useFormatter();
  const categories = useData((d) => d.categories);
  const priorities = useData((d) => d.priorities);

  const step = 'grid size-8 place-items-center text-muted hover:text-fg';

  return (
    <div className="grid gap-x-6 gap-y-4 pt-2 pb-6 sm:grid-cols-4 sm:pl-12">
      <Field label="Quantity">
        <div className="flex h-9 items-center justify-between border-b border-line">
          <button type="button" aria-label="Less" className={step} onClick={() => actions.updateItem(item.id, { qty: Math.max(1, item.qty - 1) })}>−</button>
          <span className="tabular-nums">{item.qty}</span>
          <button type="button" aria-label="More" className={step} onClick={() => actions.updateItem(item.id, { qty: item.qty + 1 })}>+</button>
        </div>
      </Field>
      <Field label="Category">
        <Select value={item.categoryId} onChange={(e) => actions.updateItem(item.id, { categoryId: e.target.value })}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Priority">
        <Select value={item.priorityId} onChange={(e) => actions.updateItem(item.id, { priorityId: e.target.value })}>
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select value={item.status} onChange={(e) => actions.updateItem(item.id, { status: e.target.value as Status })}>
          <option value="idea">Idea</option>
          <option value="planned">Planned</option>
          <option value="bought">Bought</option>
        </Select>
      </Field>
      <Field label="Note" className="sm:col-span-2">
        <TextInput value={item.note} maxLength={300} placeholder="Size, colour, where to buy…" onValueChange={(note) => actions.updateItem(item.id, { note })} />
      </Field>
      <Field label="Link" className="sm:col-span-2">
        <TextInput value={item.link} type="url" maxLength={2000} placeholder="https://…" onValueChange={(link) => actions.updateItem(item.id, { link: link.trim() })} />
      </Field>
      <p className="font-mono text-[12px] text-muted tabular-nums sm:col-span-4">
        {item.price == null ? 'No price yet' : item.qty > 1 ? `${fmt.money(item.price)} × ${item.qty} = ${fmt.money(cost(item))}` : fmt.money(cost(item))}
      </p>
    </div>
  );
}
