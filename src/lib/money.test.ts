import { describe, expect, it } from 'vitest';
import { makeFormatter } from './money';

const inr = makeFormatter({ symbol: '₹', locale: 'en-IN', decimals: 0 });
const inr2 = makeFormatter({ symbol: '₹', locale: 'en-IN', decimals: 2 });
const eur = makeFormatter({ symbol: '€', locale: 'de-DE', decimals: 2 });

describe('formatting', () => {
  it('uses Indian grouping and the currency symbol', () => {
    expect(inr.money(150000)).toBe('₹1,50,000');
    expect(inr.plain(6000)).toBe('6,000');
    expect(inr.plain(null)).toBe('');
  });

  it('puts the minus sign before the symbol', () => {
    expect(inr.money(-960)).toBe('−₹960');
  });

  it('rounds to the configured decimals', () => {
    expect(inr.money(99.6)).toBe('₹100');
    expect(inr2.money(99.555)).toBe('₹99.56');
  });

  it('gives an ungrouped value for editing, in the locale decimal mark', () => {
    expect(inr.edit(15000)).toBe('15000');
    expect(eur.edit(1234.5)).toBe('1234,5');
    expect(inr.edit(null)).toBe('');
  });
});

describe('price input', () => {
  it('drops letters and symbols', () => {
    expect(inr.sanitize('abc')).toBe('');
    expect(inr.sanitize('6k')).toBe('6');
    expect(inr.sanitize('₹6,000')).toBe('6000');
    expect(inr.sanitize('12-3+4e5')).toBe('12345');
  });

  it('allows a single decimal mark only when decimals are on', () => {
    expect(inr.sanitize('99.50')).toBe('99');
    expect(inr2.sanitize('99.5.0')).toBe('99.50');
    expect(inr2.sanitize('1.239')).toBe('1.23');
    expect(eur.sanitize('12,5')).toBe('12,5');
    expect(eur.sanitize('1.234,5')).toBe('1234,5');
  });

  it('caps absurdly long numbers', () => {
    expect(inr.sanitize('1234567890123456')).toHaveLength(12);
  });

  it('parses clean text into numbers', () => {
    expect(inr.parse('6000')).toBe(6000);
    expect(inr.parse('')).toBeNull();
    expect(inr.parse('letters')).toBeNull();
    expect(inr2.parse('.')).toBeNull();
    expect(inr2.parse('99.5')).toBe(99.5);
    expect(eur.parse('1234,5')).toBe(1234.5);
  });
});
