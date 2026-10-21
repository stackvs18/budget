import { describe, expect, it } from 'vitest';
import { pickStart } from './localCopy';

const server = (savedAt?: number) => ({ version: 2, items: [], settings: {}, ...(savedAt ? { savedAt } : {}) });

describe('pickStart', () => {
  it('uses the server when there is no browser copy', () => {
    expect(pickStart(server(100), null)).toBe('server');
  });

  it('uses the server when the browser copy was already saved there', () => {
    expect(pickStart(server(100), { data: {}, savedAt: 500, synced: true })).toBe('server');
  });

  it('restores the browser copy when it has newer unsaved changes', () => {
    expect(pickStart(server(100), { data: {}, savedAt: 500, synced: false })).toBe('local');
  });

  it('restores unsaved changes over an older file with no timestamp', () => {
    expect(pickStart(server(), { data: {}, savedAt: 500, synced: false })).toBe('local');
    expect(pickStart(null, { data: {}, savedAt: 500, synced: false })).toBe('local');
  });

  it('keeps the server when it has something newer than the unsaved copy', () => {
    expect(pickStart(server(900), { data: {}, savedAt: 500, synced: false })).toBe('server');
  });
});
