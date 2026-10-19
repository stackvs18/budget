/** idea = on the list, planned = ticked, bought = money actually spent */
export type Status = 'idea' | 'planned' | 'bought';

export interface Item {
  id: string;
  name: string;
  categoryId: string;
  priorityId: string;
  price: number | null;
  qty: number;
  status: Status;
  note: string;
  link: string;
}

export interface Category {
  id: string;
  name: string;
  /** Optional spending limit for this category */
  budget: number | null;
}

export interface Priority {
  id: string;
  name: string;
}

export interface Income {
  id: string;
  label: string;
  amount: number;
  date: string;
  /** Only counted incomes are added to the balance */
  counted: boolean;
}

export interface Currency {
  symbol: string;
  locale: string;
  decimals: number;
}

export type BudgetMode = 'above-floor' | 'fixed';

export interface Settings {
  title: string;
  currency: Currency;
  startBalance: number;
  /** The lowest the balance should ever go */
  floor: number;
  /** above-floor: budget = balance + income - floor. fixed: budget = fixedBudget */
  budgetMode: BudgetMode;
  fixedBudget: number;
  /** Below this % of budget left, the summary turns amber */
  warnAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type SortMode = 'manual' | 'price-desc' | 'price-asc' | 'priority' | 'name';
export type FilterMode = 'all' | 'planned' | 'bought' | 'open' | 'unpriced';

export interface Display {
  theme: ThemeMode;
  density: 'comfortable' | 'compact';
  sort: SortMode;
  filter: FilterMode;
}

export interface BudgetData {
  version: 2;
  settings: Settings;
  display: Display;
  incomes: Income[];
  priorities: Priority[];
  categories: Category[];
  items: Item[];
}

export type Tone = 'ok' | 'tight' | 'over';
