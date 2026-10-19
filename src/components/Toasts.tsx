import { useEffect } from 'react';
import { useToasts, type Toast } from '@/store/toasts';

const LIFETIME = 5000;

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), LIFETIME);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div className="pointer-events-auto flex max-w-full items-center gap-4 bg-fg py-2 pr-2 pl-4 text-bg">
      <p className="min-w-0 truncate">
        <span className="font-medium">{toast.title}</span>
        {toast.body && <span className="opacity-60"> · {toast.body}</span>}
      </p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.run();
            dismiss(toast.id);
          }}
          className="h-7 shrink-0 px-2 font-mono text-[12px] uppercase underline underline-offset-4"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="h-7 shrink-0 px-2 opacity-60 hover:opacity-100">
        ×
      </button>
    </div>
  );
}
