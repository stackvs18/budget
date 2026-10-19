import { memo } from 'react';
import { ChevronDown, ExternalLink, StickyNote } from 'lucide-react';
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

export const ItemRow = memo(function ItemRow({ item }: { item: Item }) {
  const expanded = useUI((s) => s.expandedItem === item.id);
  const priorities = useData((d) => d.priorities);
  const bought = item.status === 'bought';
  const href = safeUrl(item.link);

  return (
    <li>
      <div className={cn('item-grid -mx-2 px-2 py-[var(--row-py)] transition-colors hover:bg-raised', expanded && 'bg-raised')}>
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

        <select
          value={item.priorityId}
          aria-label="Priority"
          onChange={(e) => actions.updateItem(item.id, { priorityId: e.target.value })}
          className="h-8 min-w-0 appearance-none justify-self-start bg-transparent font-mono text-[11px] text-muted uppercase outline-none [grid-area:prio] hover:text-fg"
        >
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

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
      </div>

      {expanded && <ItemDetails item={item} />}
    </li>
  );
});

function ItemDetails({ item }: { item: Item }) {
  const fmt = useFormatter();
  const categories = useData((d) => d.categories);
  const priorities = useData((d) => d.priorities);

  const remove = () => {
    const { item: removed, index } = actions.removeItem(item.id);
    useUI.setState({ expandedItem: null });
    toast({ title: 'Deleted', body: removed.name, action: { label: 'Undo', run: () => actions.restoreItem(removed, index) } });
  };

  const step = 'grid size-8 place-items-center text-muted hover:text-fg';

  return (
    <div className="grid gap-x-6 gap-y-4 pt-2 pb-6 sm:grid-cols-4 sm:pl-7">
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
      <div className="flex items-center justify-between gap-4 sm:col-span-4">
        <span className="font-mono text-[12px] text-muted tabular-nums">
          {item.price == null ? 'No price yet' : item.qty > 1 ? `${fmt.money(item.price)} × ${item.qty} = ${fmt.money(cost(item))}` : fmt.money(cost(item))}
        </span>
        <button type="button" onClick={remove} className="h-8 font-mono text-[12px] text-muted uppercase hover:text-fg">
          Delete
        </button>
      </div>
    </div>
  );
}
