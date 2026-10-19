import type { Currency } from '@/types';

/** Longest whole-number part a money field accepts (up to 999 billion). */
const MAX_DIGITS = 12;

export interface Formatter {
  decimals: number;
  /** "₹6,000" / "−₹1,200" */
  money: (n: number) => string;
  /** "6,000" without symbol, "" for null */
  plain: (n: number | null) => string;
  /** Ungrouped number for editing, using the locale's decimal mark: "6000", "1234,5" */
  edit: (n: number | null) => string;
  /** Strips anything that isn't a digit or a single decimal mark, and caps the length */
  sanitize: (text: string) => string;
  /** Sanitized text → number, or null when empty */
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

  const sanitize = (text: string) => {
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

  return {
    decimals,
    money: (n) => `${round(n) < 0 ? '−' : ''}${symbol}${nf.format(Math.abs(round(n)))}`,
    plain: (n) => (n == null ? '' : nf.format(round(n))),
    edit: (n) => (n == null ? '' : String(round(n)).replace('.', decimalMark)),
    sanitize,
    parse: (text) => {
      const clean = sanitize(text);
      if (!clean || clean === decimalMark) return null;
      const n = Number(clean.replace(decimalMark, '.'));
      return Number.isFinite(n) ? n : null;
    },
  };
}
