import { SaveBadge } from '@/components/SaveBadge';
import { useData } from '@/store/budget';
import { focusAddBar, openSettings } from '@/store/ui';

export function Header() {
  const title = useData((d) => d.settings.title);

  return (
    <header className="sticky top-0 z-30 bg-bg">
      <div className="flex h-14 max-w-[1320px] items-center justify-between gap-6 px-6 md:px-8">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0 })}
          title="Back to top"
          className="label h-8 truncate transition-colors hover:text-fg"
        >
          {title}
        </button>
        <nav className="dim-group flex shrink-0 items-center gap-5 font-mono text-[12px] text-muted">
          <SaveBadge />
          <button type="button" onClick={focusAddBar} className="dim-item h-8">
            Add
          </button>
          <button type="button" onClick={() => openSettings()} className="dim-item h-8">
            Settings
          </button>
        </nav>
      </div>
    </header>
  );
}
