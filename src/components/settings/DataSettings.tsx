import { useRef } from 'react';
import { Group } from '@/components/settings/sections';
import { ConfirmButton } from '@/components/ui/inputs';
import { cost } from '@/lib/calc';
import { isBudgetData, migrate } from '@/lib/migrate';
import { actions, useBudget, useData } from '@/store/budget';
import { toast } from '@/store/toasts';

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

function toCsv() {
  const { items, categories, priorities } = useBudget.getState().data!;
  const quote = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const header = ['Name', 'Category', 'Priority', 'Status', 'Price', 'Qty', 'Total', 'Note', 'Link'];
  const rows = items.map((i) => [
    i.name,
    categories.find((c) => c.id === i.categoryId)?.name,
    priorities.find((p) => p.id === i.priorityId)?.name,
    i.status,
    i.price ?? '',
    i.qty,
    i.price == null ? '' : cost(i),
    i.note,
    i.link,
  ]);
  return [header, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');
}

const link = 'flex h-10 items-center border-b border-line text-left hover:text-muted';

export function DataSettings() {
  const itemCount = useData((d) => d.items.length);
  const storage = useBudget((s) => s.storage);
  const fileInput = useRef<HTMLInputElement>(null);

  const importFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      if (!isBudgetData(raw)) throw new Error('not a budget file');
      actions.replaceAll(migrate(raw));
      toast({ title: 'Imported', body: file.name });
    } catch {
      toast({ title: "Couldn't import", body: `${file.name} isn't a budget export` });
    }
  };

  return (
    <>
      <Group
        title="Your data"
        hint={
          storage === 'browser'
            ? "Saved in this browser only, so it isn't shared with your other devices and is lost if you clear site data. Export a backup now and then."
            : 'Auto-saves to data.json on the server. Each time the server starts, the previous file is copied to data.backup.json.'
        }
      >
        <div className="grid">
          <button type="button" className={link} onClick={() => download(`budget-${stamp()}.json`, JSON.stringify(useBudget.getState().data, null, 2), 'application/json')}>
            Export backup (.json)
          </button>
          <button type="button" className={link} onClick={() => fileInput.current?.click()}>
            Import backup
          </button>
          <button type="button" className={link} onClick={() => download(`budget-${stamp()}.csv`, toCsv(), 'text/csv')}>
            Export items (.csv)
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importFile(file);
            e.target.value = '';
          }}
        />
      </Group>

      <Group title="Start over" hint="Click once, then again to confirm. Export a backup first if you might want it back.">
        <div className="flex flex-wrap gap-4">
          <ConfirmButton onConfirm={() => { actions.clearItems(); toast({ title: 'Cleared', body: `${itemCount} items removed` }); }}>
            Remove all items
          </ConfirmButton>
          <ConfirmButton onConfirm={() => { actions.resetToStarter(); toast({ title: 'Reset', body: 'blank plan' }); }}>
            Reset everything
          </ConfirmButton>
        </div>
      </Group>
    </>
  );
}
