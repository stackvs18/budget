import { retrySave, useBudget } from '@/store/budget';

/** Shown while the data server is unreachable, so it's never a silent failure. */
export function OfflineBanner() {
  const serverDown = useBudget((s) => s.serverDown);
  if (!serverDown) return null;

  return (
    <div role="alert" className="sticky top-14 z-20 bg-fg text-bg">
      <div className="flex max-w-[1320px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3 md:px-8">
        <p className="max-w-3xl">
          <span className="font-medium">The app's server isn't running, so changes aren't reaching data.json.</span>{' '}
          <span className="opacity-70">
            They're kept safe in this browser and will be written to data.json automatically once you start it again (double-click
            start.bat, and keep that window open).
          </span>
        </p>
        <button type="button" onClick={() => void retrySave()} className="h-8 shrink-0 font-mono text-[12px] uppercase underline underline-offset-4">
          Retry now
        </button>
      </div>
    </div>
  );
}
