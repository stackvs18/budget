import { ArrowDown, ArrowUp } from 'lucide-react';
import { AddRowButton, Group } from '@/components/settings/sections';
import { ConfirmButton, MoneyInput, TextInput } from '@/components/ui/inputs';
import { actions, useData } from '@/store/budget';
import { toast } from '@/store/toasts';
import type { Category, Priority } from '@/types';

function move<T>(list: T[], index: number, by: -1 | 1): T[] {
  const next = [...list];
  const [entry] = next.splice(index, 1);
  next.splice(index + by, 0, entry);
  return next;
}

function OrderButtons<T>({ list, index, onChange }: { list: T[]; index: number; onChange: (list: T[]) => void }) {
  const button = 'grid size-7 place-items-center text-faint hover:text-fg disabled:opacity-20';
  return (
    <span className="flex shrink-0">
      <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onChange(move(list, index, -1))} className={button}>
        <ArrowUp className="size-3.5" />
      </button>
      <button type="button" aria-label="Move down" disabled={index === list.length - 1} onClick={() => onChange(move(list, index, 1))} className={button}>
        <ArrowDown className="size-3.5" />
      </button>
    </span>
  );
}

export function CategorySettings() {
  const categories = useData((d) => d.categories);
  const items = useData((d) => d.items);

  const remove = (category: Category) => {
    const fallback = categories.find((c) => c.id !== category.id);
    const moved = items.filter((i) => i.categoryId === category.id).length;
    actions.removeCategory(category.id, fallback?.id);
    toast({ title: `Deleted ${category.name}`, body: moved && fallback ? `${moved} item${moved === 1 ? '' : 's'} moved to ${fallback.name}` : undefined });
  };

  return (
    <Group title="Categories" hint="A limit shows how much of it you've used, and flags it when you go over.">
      {categories.length === 0 && <p className="text-faint">No categories yet. Add one here, or type a new name when adding an item.</p>}
      <ul className="grid">
        {categories.map((category, index) => {
          const count = items.filter((i) => i.categoryId === category.id).length;
          const isLastWithItems = categories.length === 1 && count > 0;
          return (
            <li key={category.id} className="flex items-center gap-3 border-b border-line">
              <OrderButtons list={categories} index={index} onChange={actions.setCategories} />
              <TextInput value={category.name} required maxLength={60} aria-label="Category name" onValueChange={(name) => actions.updateCategory(category.id, { name })} className="min-w-0 flex-1 border-transparent" />
              <MoneyInput
                value={category.budget}
                placeholder="No limit"
                aria-label={`Limit for ${category.name}`}
                onValueChange={(budget) => actions.updateCategory(category.id, { budget })}
                className="w-24 shrink-0 border-transparent"
              />
              {count === 0 ? (
                <button type="button" onClick={() => remove(category)} className="h-8 shrink-0 px-2 font-mono text-[12px] text-muted uppercase hover:text-fg">
                  Delete
                </button>
              ) : (
                <ConfirmButton
                  onConfirm={() => remove(category)}
                  disabled={isLastWithItems}
                  confirmLabel={`Move ${count}?`}
                  title={isLastWithItems ? 'Add another category first, so its items have somewhere to go' : `Its ${count} items move to another category`}
                >
                  Delete
                </ConfirmButton>
              )}
            </li>
          );
        })}
      </ul>
      <AddRowButton onClick={() => actions.addCategory()}>Add category</AddRowButton>
    </Group>
  );
}

export function PrioritySettings() {
  const priorities = useData((d) => d.priorities);

  const remove = (priority: Priority) => {
    const fallback = priorities.find((p) => p.id !== priority.id)!;
    actions.removePriority(priority.id, fallback.id);
    toast({ title: `Deleted ${priority.name}`, body: `its items are now ${fallback.name}` });
  };

  return (
    <Group title="Priorities" hint="How much you need something. The order here is used by Sort → Priority.">
      <ul className="grid">
        {priorities.map((priority, index) => (
          <li key={priority.id} className="flex items-center gap-3 border-b border-line">
            <OrderButtons list={priorities} index={index} onChange={actions.setPriorities} />
            <TextInput value={priority.name} required maxLength={30} aria-label="Priority name" onValueChange={(name) => actions.updatePriority(priority.id, { name })} className="min-w-0 flex-1 border-transparent" />
            <ConfirmButton onConfirm={() => remove(priority)} disabled={priorities.length < 2}>
              Delete
            </ConfirmButton>
          </li>
        ))}
      </ul>
      <AddRowButton onClick={() => actions.addPriority()}>Add priority</AddRowButton>
    </Group>
  );
}
