import { useEffect, useRef } from 'react';
import { CategorySettings, PrioritySettings } from '@/components/settings/ListSettings';
import { DataSettings } from '@/components/settings/DataSettings';
import { DisplaySettings, IncomeSettings, MoneySettings } from '@/components/settings/sections';
import { TextTabs } from '@/components/ui/inputs';
import { useUI, type SettingsTab } from '@/store/ui';

const TABS: { value: SettingsTab; label: string }[] = [
  { value: 'money', label: 'Money' },
  { value: 'income', label: 'Income' },
  { value: 'categories', label: 'Categories' },
  { value: 'priorities', label: 'Priorities' },
  { value: 'display', label: 'Display' },
  { value: 'data', label: 'Data' },
];

const PANELS: Record<SettingsTab, () => React.ReactNode> = {
  money: MoneySettings,
  income: IncomeSettings,
  categories: CategorySettings,
  priorities: PrioritySettings,
  display: DisplaySettings,
  data: DataSettings,
};

export function SettingsDrawer() {
  const open = useUI((s) => s.settingsOpen);
  const tab = useUI((s) => s.settingsTab);
  const close = () => useUI.setState({ settingsOpen: false });
  const Panel = PANELS[tab];

  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus moves into the panel, the page behind stops scrolling, and both are restored on close.
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-fg/10" onClick={close} />
      <aside role="dialog" aria-modal="true" aria-label="Settings" className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-line bg-bg">
        <header className="flex h-14 items-center justify-between px-6">
          <span className="label">Settings</span>
          <button ref={closeButton} type="button" onClick={close} className="h-8 font-mono text-[12px] text-muted uppercase hover:text-fg">
            Close
          </button>
        </header>
        <div className="px-6 pb-4">
          <TextTabs label="Settings sections" value={tab} options={TABS} onChange={(settingsTab) => useUI.setState({ settingsTab })} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-10">
          <div className="grid gap-12">
            <Panel />
          </div>
        </div>
      </aside>
    </>
  );
}
