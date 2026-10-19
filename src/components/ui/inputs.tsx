import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFormatter } from '@/hooks';
import { cn } from '@/lib/cn';

/** Underline field: no box, just a hairline that darkens on focus. */
export const fieldClass =
  'h-9 w-full border-0 border-b border-line bg-transparent px-0 text-sm outline-none transition-colors placeholder:text-faint hover:border-line-strong focus:border-fg';

/** Borderless field for inline editing inside rows and tables. */
export const inlineClass =
  'h-8 border-0 border-b border-transparent bg-transparent px-0 outline-none transition-colors hover:border-line focus:border-fg';

// ---------- money ----------

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | null;
  onValueChange: (value: number | null) => void;
}

/**
 * Numbers only. Shows "₹6,000" at rest and the bare number ("6000") while editing.
 * Letters and symbols are dropped as you type; totals update on every keystroke.
 */
export function MoneyInput({ value, onValueChange, className, onFocus, onBlur, ...rest }: MoneyInputProps) {
  const fmt = useFormatter();
  const display = (v: number | null) => (v == null ? '' : fmt.money(v));
  const [text, setText] = useState(() => display(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value == null ? '' : fmt.money(value));
  }, [value, fmt]);

  return (
    <input
      type="text"
      inputMode={fmt.decimals > 0 ? 'decimal' : 'numeric'}
      autoComplete="off"
      spellCheck={false}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        setText(fmt.edit(value));
        // Deferred: selecting during a click's focus is undone by its mouseup.
        const input = e.currentTarget;
        requestAnimationFrame(() => input.select());
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setText(display(value));
        onBlur?.(e);
      }}
      onChange={(e) => {
        const clean = fmt.sanitize(e.target.value);
        setText(clean);
        onValueChange(fmt.parse(clean));
      }}
      className={cn(fieldClass, 'text-right tabular-nums', className)}
      {...rest}
    />
  );
}

// ---------- text ----------

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (value: string) => void;
  /** Keep the old value instead of saving an empty string */
  required?: boolean;
}

export function TextInput({ value, onValueChange, required, className, onBlur, ...rest }: TextInputProps) {
  const [text, setText] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <input
      value={text}
      spellCheck={false}
      onFocus={() => (focused.current = true)}
      onBlur={(e) => {
        focused.current = false;
        if (required && !text.trim()) setText(value);
        onBlur?.(e);
      }}
      onChange={(e) => {
        setText(e.target.value);
        if (!required || e.target.value.trim()) onValueChange(e.target.value);
      }}
      className={cn(fieldClass, className)}
      {...rest}
    />
  );
}

// ---------- select ----------

export function Select({ className, selectClassName, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { selectClassName?: string }) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <select {...rest} className={cn(fieldClass, 'appearance-none pr-5', selectClassName)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-0 size-3.5 -translate-y-1/2 text-faint" />
    </span>
  );
}

// ---------- toggle ----------

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[18px] w-8 shrink-0 rounded-full border transition-colors duration-150',
        checked ? 'border-fg bg-fg' : 'border-line-strong bg-transparent',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 left-0.5 size-3 -translate-y-1/2 rounded-full transition-transform duration-150',
          checked ? 'translate-x-[14px] bg-bg' : 'bg-faint',
        )}
      />
    </button>
  );
}

// ---------- text tabs ----------

interface TabsProps<T extends string> {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
  label?: string;
}

/** Row of mono words; the chosen one is ink, the rest are faint. */
export function TextTabs<T extends string>({ value, options, onChange, className, label }: TabsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('dim-group flex flex-wrap gap-x-4 gap-y-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn('dim-item h-7 font-mono text-[12px] whitespace-nowrap uppercase', option.value === value ? 'text-fg' : 'text-faint')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---------- confirm ----------

interface ConfirmProps {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
}

/** First click arms it, second click within 3s runs it. No dialogs. */
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Sure? Click again', disabled, title, className }: ConfirmProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
      className={cn(
        'h-8 shrink-0 px-2 font-mono text-[12px] uppercase transition-colors disabled:pointer-events-none disabled:opacity-30',
        armed ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
        className,
      )}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

// ---------- layout ----------

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-1', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

/** Inverted tag for states that need attention (OVER, TIGHT). */
export function Badge({ children, outline }: { children: ReactNode; outline?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center px-1.5 font-mono text-[10px] leading-none uppercase',
        outline ? 'border border-fg text-fg' : 'bg-fg text-bg',
      )}
    >
      {children}
    </span>
  );
}
