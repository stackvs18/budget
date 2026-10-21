import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ItemsPanel } from '@/components/list/ItemsPanel';
import { SettingsDrawer } from '@/components/settings/SettingsDrawer';
import { MobileBar, Summary } from '@/components/summary/Summary';
import { Toasts } from '@/components/Toasts';
import { useDocumentSync, useScrollSpy } from '@/hooks/useDocumentSync';
import { loadBudget, retryLoad, useBudget } from '@/store/budget';

export function App() {
  const loaded = useBudget((s) => s.data !== null);
  const loadError = useBudget((s) => s.loadError);

  useEffect(() => {
    loadBudget();
  }, []);

  if (loadError) return <LoadError />;
  if (!loaded) return null;
  return <Workspace />;
}

function Workspace() {
  useDocumentSync();
  useScrollSpy();

  return (
    <>
      <Header />
      <OfflineBanner />
      <main className="grid max-w-[1320px] gap-x-20 gap-y-16 px-6 pt-6 pb-32 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:pb-20">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <ItemsPanel />
        </div>
        {/* After the list on phones (the bottom bar carries the key numbers); sticky sidebar on desktop. */}
        <aside className="no-scrollbar lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
          <Summary />
        </aside>
      </main>
      <MobileBar />
      <Toasts />
      <SettingsDrawer />
    </>
  );
}

function LoadError() {
  return (
    <div className="px-6 pt-24 md:px-8">
      <p className="label">Can't reach the server</p>
      <h1 className="display mt-2 text-[44px]">Your data couldn't load.</h1>
      <p className="mt-3 max-w-md text-muted">
        Start the app with <code className="font-mono text-fg">npm start</code> or double-click <code className="font-mono text-fg">start.bat</code> in the budget-tracker folder.
      </p>
      <button
        type="button"
        onClick={() => {
          useBudget.setState({ loadError: false });
          retryLoad();
        }}
        className="mt-6 h-9 bg-fg px-5 font-mono text-[12px] text-bg uppercase"
      >
        Retry
      </button>
    </div>
  );
}
