/**
 * Returns a clickable http(s) URL for what the user typed, or null.
 * "amazon.in/x" becomes "https://amazon.in/x"; "javascript:…" and other schemes are refused.
 */
export function safeUrl(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
