import { describe, it, expect, beforeEach } from 'vitest';

describe('persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('readPersisted returns default when key absent', async () => {
    const { readPersisted } = await import('../../src/lib/persist');
    expect(readPersisted('missing', 42)).toBe(42);
  });

  it('readPersisted parses JSON values', async () => {
    const { readPersisted, writePersisted } = await import('../../src/lib/persist');
    writePersisted('mykey', { a: 1, b: 'two' });
    expect(readPersisted('mykey', null)).toEqual({ a: 1, b: 'two' });
  });

  it('readPersisted falls back to default on parse error', async () => {
    const { readPersisted } = await import('../../src/lib/persist');
    localStorage.setItem('pdfdark.badkey', 'not-json{');
    expect(readPersisted('badkey', 'default')).toBe('default');
  });

  it('writePersisted serializes', async () => {
    const { writePersisted } = await import('../../src/lib/persist');
    writePersisted('flag', true);
    expect(localStorage.getItem('pdfdark.flag')).toBe('true');
  });
});
