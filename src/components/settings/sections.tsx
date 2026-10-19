import { Field, MoneyInput, Select, TextInput, TextTabs, Toggle, fieldClass } from '@/components/ui/inputs';
import { useFormatter, useTotals } from '@/hooks';
import { actions, useData } from '@/store/budget';
import type { BudgetMode, ThemeMode } from '@/types';

export function Group({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="grid gap-4">
      <div>
        <h3 className="display text-[24px]">{title}</h3>
        {hint && <p className="mt-1 text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function AddRowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="h-9 justify-self-start font-mono text-[12px] text-muted uppercase hover:text-fg">
      + {children}
    </button>
  );
}

const LOCALES = [
  { value: 'en-IN', label: '1,00,000 (Indian)' },
  { value: 'en-US', label: '100,000 (International)' },
  { value: 'de-DE', label: '100.000 (European)' },
  { value: 'fr-FR', label: '100 000 (Spaced)' },
];

export function MoneySettings() {
  const settings = useData((d) => d.settings);
  const fmt = useFormatter();
  const t = useTotals();
  const set = actions.updateSettings;

  return (
    <>
      <Group title="Plan">
        <Field label="Name">
          <TextInput value={settings.title} required maxLength={40} onValueChange={(title) => set({ title })} />
        </Field>
      </Group>

      <Group title="Balance" hint="What you have now, and the lowest you'll let it drop.">
        <div className="grid grid-cols-2 gap-6">
          <Field label="Starting balance">
            <MoneyInput value={settings.startBalance} onValueChange={(v) => set({ startBalance: v ?? 0 })} />
          </Field>
          <Field label="Lowest I'll go">
            <MoneyInput value={settings.floor} onValueChange={(v) => set({ floor: v ?? 0 })} />
          </Field>
        </div>
      </Group>

      <Group title="Spending budget" hint="How much of it you allow yourself to use.">
        <TextTabs<BudgetMode>
          label="Budget mode"
          value={settings.budgetMode}
          onChange={(budgetMode) => set({ budgetMode })}
          options={[
            { value: 'above-floor', label: 'Everything above floor' },
            { value: 'fixed', label: 'Fixed amount' },
          ]}
        />
        {settings.budgetMode === 'fixed' ? (
          <Field label="Budget" hint={`You'll still be told if the plan takes you below ${fmt.money(settings.floor)}.`}>
            <MoneyInput value={settings.fixedBudget} onValueChange={(v) => set({ fixedBudget: v ?? 0 })} />
          </Field>
        ) : (
          <p className="text-muted">
            Balance + counted income − floor = <span className="text-fg tabular-nums">{fmt.money(t.budget)}</span>
          </p>
        )}
        <Field label={`Mark as tight when less than ${settings.warnAt}% is left`}>
          <input type="range" min={0} max={50} step={5} value={settings.warnAt} onChange={(e) => set({ warnAt: Number(e.target.value) })} className="w-full" />
        </Field>
      </Group>

      <Group title="Currency">
        <div className="grid grid-cols-[80px_1fr_90px] gap-6">
          <Field label="Symbol">
            <TextInput value={settings.currency.symbol} maxLength={4} onValueChange={(symbol) => set({ currency: { ...settings.currency, symbol } })} />
          </Field>
          <Field label="Number style">
            <Select value={settings.currency.locale} onChange={(e) => set({ currency: { ...settings.currency, locale: e.target.value } })}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Decimals">
            <Select value={settings.currency.decimals} onChange={(e) => set({ currency: { ...settings.currency, decimals: Number(e.target.value) } })}>
              <option value={0}>None</option>
              <option value={2}>2</option>
            </Select>
          </Field>
        </div>
        <p className="font-mono text-[12px] text-muted">Preview {fmt.money(123456.78)}</p>
      </Group>
    </>
  );
}

export function IncomeSettings() {
  const incomes = useData((d) => d.incomes);

  return (
    <Group title="Incoming money" hint="Money you're expecting. Only switched-on entries count toward your balance.">
      {incomes.length > 0 && (
        <ul className="grid gap-6">
          {incomes.map((income) => (
            <li key={income.id} className="grid gap-3">
              <div className="flex items-center gap-3">
                <Toggle checked={income.counted} onChange={(counted) => actions.updateIncome(income.id, { counted })} label="Count this income" />
                <TextInput value={income.label} required maxLength={60} aria-label="Label" onValueChange={(label) => actions.updateIncome(income.id, { label })} className="flex-1" />
                <button type="button" onClick={() => actions.removeIncome(income.id)} className="h-8 font-mono text-[12px] text-muted uppercase hover:text-fg">
                  Delete
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6 pl-11">
                <MoneyInput value={income.amount} aria-label="Amount" onValueChange={(v) => actions.updateIncome(income.id, { amount: v ?? 0 })} />
                <input type="date" value={income.date} aria-label="Expected date" onChange={(e) => actions.updateIncome(income.id, { date: e.target.value })} className={fieldClass} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddRowButton onClick={actions.addIncome}>Add income</AddRowButton>
    </Group>
  );
}

export function DisplaySettings() {
  const display = useData((d) => d.display);
  const set = actions.updateDisplay;

  return (
    <>
      <Group title="Theme">
        <TextTabs<ThemeMode>
          label="Theme"
          value={display.theme}
          onChange={(theme) => set({ theme })}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </Group>
      <Group title="Density">
        <TextTabs
          label="Density"
          value={display.density}
          onChange={(density) => set({ density })}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </Group>
    </>
  );
}
