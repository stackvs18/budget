import type { Currency } from '@/types';
import { evaluate } from './expression';

/** Longest whole-number part a money field accepts (up to 999 billion). */
const MAX_DIGITS = 12;
const MAX_AMOUNT = 10 ** MAX_DIGITS - 1;
/** Longest sum a money field accepts, e.g. "199*2+2-1". */
const MAX_EXPRESSION = 60;

const OPERATOR = /[+\-*/x×÷()%]/;

export interface Formatter {
  decimals: number;
  /** "₹6,000" / "−₹1,200" */
  money: (n: number) => string;
  /** "6,000" without symbol, "" for null */
  plain: (n: number | null) => string;
  /** Ungrouped number for editing, using the locale's decimal mark: "6000", "1234,5" */
  edit: (n: number | null) => string;
  /** Keeps only what a money field accepts: a number, or a sum like "199*2+2-1" */
  sanitize: (text: string) => string;
  /** True when the text is a sum to calculate rather than a plain number */
  isExpression: (text: string) => boolean;
  /** Sanitized text → amount (sums are calculated and rounded), or null when empty or invalid */
  parse: (text: string) => number | null;
}

function numberFormat(locale: string, decimals: number) {
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  } catch {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  }
}

export function makeFormatter({ symbol, locale, decimals }: Currency): Formatter {
  const nf = numberFormat(locale, decimals);
  const decimalMark = nf.formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.';
  const round = (n: number) => Number(n.toFixed(decimals));
  const isExpression = (text: string) => OPERATOR.test(text);

  const sanitizeNumber = (text: string) => {
    let whole = '';
    let fraction = '';
    let seenMark = false;
    for (const ch of text) {
      if (ch >= '0' && ch <= '9') {
        if (!seenMark && whole.length < MAX_DIGITS) whole += ch;
        else if (seenMark && fraction.length < decimals) fraction += ch;
      } else if (ch === decimalMark && !seenMark) {
        // With 0 decimals the mark still ends the whole part, so "99.50" means 99, not 9950.
        seenMark = true;
      }
      // Everything else (letters, symbols, grouping separators) is dropped.
    }
    return seenMark && decimals > 0 ? `${whole}${decimalMark}${fraction}` : whole;
  };

  // In a sum, keep digits, the decimal mark, operators and %; × and x mean *, ÷ means /.
  const sanitizeExpression = (text: string) =>
    Array.from(text, (ch) => (ch === '×' || ch === 'x' ? '*' : ch === '÷' ? '/' : ch))
      .filter((ch) => (ch >= '0' && ch <= '9') || ch === decimalMark || '+-*/()%'.includes(ch))
      .join('')
      .slice(0, MAX_EXPRESSION);

  const sanitize = (text: string) => (isExpression(text) ? sanitizeExpression(text) : sanitizeNumber(text));

  return {
    decimals,
    money: (n) => `${round(n) < 0 ? '−' : ''}${symbol}${nf.format(Math.abs(round(n)))}`,
    plain: (n) => (n == null ? '' : nf.format(round(n))),
    edit: (n) => (n == null ? '' : String(round(n)).replace('.', decimalMark)),
    sanitize,
    isExpression,
    parse: (text) => {
      const clean = sanitize(text);
      if (isExpression(clean)) {
        const value = evaluate(clean, decimalMark);
        // Amounts can't be negative or absurdly large.
        return value != null && value >= 0 && value <= MAX_AMOUNT ? round(value) : null;
      }
      if (!clean || clean === decimalMark) return null;
      const n = Number(clean.replace(decimalMark, '.'));
      return Number.isFinite(n) ? n : null;
    },
  };
}
