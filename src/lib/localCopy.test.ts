import { describe, expect, it } from 'vitest';
import { pickStart, savedAtOf } from './localCopy';

const server = (savedAt?: number) => ({ version: 2, items: [], settings: {}, ...(savedAt ? { savedAt } : {}) });
const local = (patch: { savedAt?: number; synced?: boolean; base?: number }) => ({ data: {}, savedAt: 500, synced: false, ...patch });

describe('pickStart', () => {
  it('uses the server when there is no browser copy', () => {
    expect(pickStart(server(100), null)).toBe('server');
  });

  it('uses the server when the browser copy was already saved there', () => {
    expect(pickStart(server(100), local({ synced: true, base: 100 }))).toBe('server');
  });

  it('restores unsaved changes when the server has not changed since', () => {
    expect(pickStart(server(100), local({ base: 100 }))).toBe('local');
  });

  it('restores unsaved changes over a file that has never been saved', () => {
    expect(pickStart(null, local({ base: 0 }))).toBe('local');
    expect(pickStart(server(), local({ base: 0 }))).toBe('local');
  });

  it('reports a conflict when another device saved after these changes were made', () => {
    expect(pickStart(server(900), local({ base: 100 }))).toBe('conflict');
  });

  it('falls back to newest-wins for copies saved before versions were tracked', () => {
    expect(pickStart(server(100), { data: {}, savedAt: 500, synced: false })).toBe('local');
    expect(pickStart(server(900), { data: {}, savedAt: 500, synced: false })).toBe('conflict');
  });
});

describe('savedAtOf', () => {
  it('reads the version stamp, or 0', () => {
    expect(savedAtOf({ savedAt: 42 })).toBe(42);
    expect(savedAtOf({ savedAt: '42' })).toBe(0);
    expect(savedAtOf(null)).toBe(0);
  });
});
