import { Badge, MoneyInput, Toggle, inlineClass } from '@/components/ui/inputs';
import { useFormatter, useTotals } from '@/hooks';
import { groupTotals } from '@/lib/calc';
import { cn } from '@/lib/cn';
import { actions, useData } from '@/store/budget';
import { openSettings, scrollToCategory, useUI } from '@/store/ui';

export function Summary() {
  return (
    <div className="grid gap-12">
      <Headline />
      <Readouts />
      <Incomes />
      <CategoryIndex />
      <Priorities />
    </div>
  );
}

function Headline() {
  const fmt = useFormatter();
  const t = useTotals();
  const scale = Math.max(t.budget, t.used, 1);
  const pct = (n: number) => `${(n / scale) * 100}%`;
  const empty = t.start === 0 && t.used === 0;

  return (
    <section>
      <div className="flex items-center gap-2">
        <span className="label">After plan</span>
        {t.tone === 'over' && <Badge>Over budget</Badge>}
        {t.tone === 'tight' && <Badge outline>Tight</Badge>}
      </div>
      <p className="display mt-1 text-[52px] tabular-nums">{fmt.money(t.afterPlan)}</p>
      <p className="mt-1 text-muted">
        {empty
          ? 'Set your balance below to begin.'
          : t.aboveFloor >= 0
            ? `${fmt.money(t.aboveFloor)} above your ${fmt.money(t.floor)} floor`
            : `${fmt.money(-t.aboveFloor)} below your ${fmt.money(t.floor)} floor`}
      </p>

      <div className="relative mt-6 h-1 bg-line" aria-hidden>
        <div className="absolute inset-y-0 left-0 bg-fg" style={{ width: pct(t.bought) }} />
        <div className="absolute inset-y-0 bg-fg/30" style={{ left: pct(t.bought), width: pct(t.planned) }} />
        {t.used > t.budget && <div className="absolute -inset-y-1.5 w-px bg-fg" style={{ left: pct(t.budget) }} />}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-faint tabular-nums">
        <span>Spent {fmt.money(t.bought)} · Planned {fmt.money(t.planned)}</span>
        <span>{Math.round(t.usedPct)}%</span>
      </div>
    </section>
  );
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex h-9 items-center justify-between gap-4 border-b border-line">
      <dt className={strong ? 'font-medium' : 'text-muted'}>{label}</dt>
      <dd className={cn('tabular-nums', strong && 'font-medium')}>{children}</dd>
    </div>
  );
}

function Readouts() {
  const fmt = useFormatter();
  const t = useTotals();
  const settings = useData((d) => d.settings);
  const editable = cn(inlineClass, 'w-28 text-right text-sm');

  return (
    <section>
      <span className="label">Numbers</span>
      <dl className="mt-2">
        <Row label="Starting balance">
          <MoneyInput value={settings.startBalance} onValueChange={(v) => actions.updateSettings({ startBalance: v ?? 0 })} aria-label="Starting balance" className={editable} />
        </Row>
        <Row label="Incoming">+{fmt.money(t.incoming)}</Row>
        <Row label="Spent">−{fmt.money(t.bought)}</Row>
        <Row label="Planned">−{fmt.money(t.planned)}</Row>
        <Row label="After plan" strong>{fmt.money(t.afterPlan)}</Row>
        <Row label="Lowest I'll go">
          <MoneyInput value={settings.floor} onValueChange={(v) => actions.updateSettings({ floor: v ?? 0 })} aria-label="Lowest balance" className={editable} />
        </Row>
        <Row label={settings.budgetMode === 'fixed' ? 'Budget (fixed)' : 'Budget'}>{fmt.money(t.budget)}</Row>
        <Row label="Left to spend" strong>{fmt.money(t.left)}</Row>
      </dl>

      {t.aboveFloor < 0 && !(t.start === 0 && t.used === 0) && (
        <p className="mt-3 text-muted">This plan takes you {fmt.money(-t.aboveFloor)} below your floor.</p>
      )}
      {t.unpricedTicked.length > 0 && (
        <p className="mt-3 text-muted">
          {t.unpricedTicked.length === 1
            ? `${t.unpricedTicked[0].name} is ticked but has no price.`
            : `${t.unpricedTicked.length} ticked items have no price yet.`}
        </p>
      )}
    </section>
  );
}

function Incomes() {
  const fmt = useFormatter();
  const incomes = useData((d) => d.incomes);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="label">Incoming</span>
        <button type="button" onClick={() => openSettings('income')} className="font-mono text-[11px] text-faint uppercase hover:text-fg">
          + Add
        </button>
      </div>
      {incomes.length === 0 ? (
        <p className="mt-2 text-faint">Money you're expecting goes here.</p>
      ) : (
        <ul className="mt-2">
          {incomes.map((income) => (
            <li key={income.id} className="flex h-9 items-center gap-3 border-b border-line">
              <Toggle checked={income.counted} onChange={(counted) => actions.updateIncome(income.id, { counted })} label={`Count ${income.label}`} />
              <span className={cn('min-w-0 flex-1 truncate', !income.counted && 'text-muted')}>{income.label}</span>
              <span className={cn('tabular-nums', !income.counted && 'text-faint')}>+{fmt.money(income.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Big grey list of categories, after vraj.me: hover one to bring it forward, click to jump. */
function CategoryIndex() {
  const fmt = useFormatter();
  const categories = useData((d) => d.categories);
  const items = useData((d) => d.items);
  const active = useUI((s) => s.activeCategory);
  if (!categories.length) return null;

  return (
    <section>
      <span className="label">Categories</span>
      <ul className="dim-group mt-2">
        {categories.map((c) => {
          const used = groupTotals(items.filter((i) => i.categoryId === c.id)).used;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => scrollToCategory(c.id)}
                className={cn('dim-item display py-0.5 text-left text-[26px]', c.id === active ? 'text-fg' : 'text-muted')}
              >
                {c.name}
                {used > 0 && <sup className="ml-1.5 font-mono text-[11px] font-normal tracking-normal text-faint">{fmt.money(used)}</sup>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Priorities() {
  const fmt = useFormatter();
  const priorities = useData((d) => d.priorities);
  const items = useData((d) => d.items);
  if (!items.length) return null;

  return (
    <section>
      <span className="label">By priority · whole list</span>
      <dl className="mt-2">
        {priorities.map((p) => {
          const g = groupTotals(items.filter((i) => i.priorityId === p.id));
          return (
            <Row key={p.id} label={`${p.name} (${g.count})`}>
              {fmt.money(g.listed)}
            </Row>
          );
        })}
      </dl>
    </section>
  );
}

/** Always-visible totals on phones, where the summary scrolls away. */
export function MobileBar() {
  const fmt = useFormatter();
  const t = useTotals();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-bg px-6 py-3 lg:hidden">
      <div>
        <span className="label block">After plan</span>
        <span className="display text-xl tabular-nums">{fmt.money(t.afterPlan)}</span>
      </div>
      <div className="text-right">
        <span className="label block">Left</span>
        <span className="tabular-nums">{fmt.money(t.left)}</span>
        {t.tone === 'over' && <span className="ml-2"><Badge>Over</Badge></span>}
      </div>
    </div>
  );
}
