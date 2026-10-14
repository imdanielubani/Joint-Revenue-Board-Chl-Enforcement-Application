import { describe, expect, it } from 'vitest';

import { normalizePlate, parsePlate } from '../src/domain/plate.js';

describe('plates (SRD §11)', () => {
  it('ignores spaces, hyphens and case', () => {
    for (const input of ['ABC 123 AA', 'ABC-123-AA', 'abc123aa', ' abc - 123  aa ']) {
      expect(normalizePlate(input)).toBe('ABC123AA');
    }
  });

  it('accepts 3 to 10 letters and digits', () => {
    expect(parsePlate('LA 123 ABC')).toBe('LA123ABC');
    expect(parsePlate('AB1')).toBe('AB1');
    expect(parsePlate('AB')).toBeNull();
    expect(parsePlate('ABCDEFGHIJK')).toBeNull();
    expect(parsePlate('ABC/123')).toBeNull();
    expect(parsePlate('')).toBeNull();
  });
});
