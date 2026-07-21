import { describe, it, expect } from 'vitest';
import { invariant } from './invariant';

describe('invariant', () => {
  it('throws when condition is false', () => {
    expect(() => invariant(false, 'test')).toThrow('test');
  });
  it('passes silently when true', () => {
    expect(() => invariant(true)).not.toThrow();
  });
});
