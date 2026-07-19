import { describe, it, expect } from 'vitest';
import { decodeExecutionError } from './errors.js';

describe('decodeExecutionError', () => {
  it('handles plain errors', () => {
    const decoded = decodeExecutionError(new Error('boom'));
    expect(decoded.kind).toBe('unknown');
    expect(decoded.detail).toBe('boom');
  });

  it('handles non-error values', () => {
    const decoded = decodeExecutionError('nope');
    expect(decoded.kind).toBe('unknown');
    expect(decoded.detail).toBe('nope');
  });
});
