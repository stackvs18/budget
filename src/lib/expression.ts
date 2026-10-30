/**
 * Tiny arithmetic evaluator for price fields: + - * /, parentheses and
 * a trailing % ("90%" = 0.9), with the usual precedence. No eval, so typed text can never run code.
 * Returns null for anything that isn't a complete, valid sum (or divides by zero).
 */
export function evaluate(input: string, decimalMark = '.'): number | null {
  const src = input.replace(/\s+/g, '');
  let i = 0;

  const fail = (): never => {
    throw new SyntaxError('Not a valid sum');
  };

  const number = (): number => {
    let digits = '';
    while (i < src.length && ((src[i] >= '0' && src[i] <= '9') || src[i] === decimalMark)) digits += src[i++];
    if (!digits || digits === decimalMark || digits.split(decimalMark).length > 2) fail();
    return Number(digits.replace(decimalMark, '.'));
  };

  // primary := '(' expr ')' | number, optionally followed by % (per cent)
  const primary = (): number => {
    let value: number;
    if (src[i] === '(') {
      i++;
      value = expr();
      if (src[i] !== ')') fail();
      i++;
    } else {
      value = number();
    }
    while (src[i] === '%') {
      i++;
      value /= 100;
    }
    return value;
  };

  // factor := ('+' | '-') factor | primary
  const factor = (): number => {
    if (src[i] === '+') return i++, factor();
    if (src[i] === '-') return i++, -factor();
    return primary();
  };

  // term := factor (('*' | '/') factor)*
  const term = (): number => {
    let value = factor();
    while (src[i] === '*' || src[i] === '/') {
      const op = src[i++];
      const right = factor();
      if (op === '/' && right === 0) fail();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  };

  // expr := term (('+' | '-') term)*
  const expr = (): number => {
    let value = term();
    while (src[i] === '+' || src[i] === '-') {
      const op = src[i++];
      const right = term();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };

  if (!src) return null;
  try {
    const value = expr();
    return i === src.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
