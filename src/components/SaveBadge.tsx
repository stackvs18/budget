import { cn } from '@/lib/cn';
import { useBudget } from '@/store/budget';
import { openSettings } from '@/store/ui';

/** Save state; click it to see where data lives and to export it. */
export function SaveBadge() {
  const state = useBudget((s) => s.saveState);
  const storage = useBudget((s) => s.storage);

  const label =
    state === 'saving' ? 'Saving…'
    : state === 'error' ? (storage === 'browser' ? 'Not saved' : 'Offline, retrying')
    : storage === 'browser' ? 'Saved in browser'
    : 'Saved';

  const title =
    state === 'error'
      ? storage === 'browser'
        ? "This browser is blocking storage (private window?). Export a backup from Settings → Data."
        : "Can't reach the server. Changes will save once it's back."
      : storage === 'browser'
        ? 'Saved in this browser only. Click for export and backup.'
        : 'Saved to data.json. Click for export and backup.';

  return (
    <button
      type="button"
      role="status"
      title={title}
      onClick={() => openSettings('data')}
      className={cn('dim-item h-8', state === 'error' ? 'bg-fg px-1.5 text-bg hover:text-bg' : 'text-faint')}
    >
      {label}
    </button>
  );
}
