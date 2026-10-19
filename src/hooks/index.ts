import { useMemo } from 'react';
import { computeTotals } from '@/lib/calc';
import { makeFormatter } from '@/lib/money';
import { useBudget, useData } from '@/store/budget';

export function useFormatter() {
  const currency = useData((d) => d.settings.currency);
  return useMemo(() => makeFormatter(currency), [currency]);
}

export function useTotals() {
  const data = useBudget((s) => s.data!);
  return useMemo(() => computeTotals(data), [data]);
}
