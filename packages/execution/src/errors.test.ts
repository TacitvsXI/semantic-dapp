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

  it('classifies transport-looking plain errors as network', () => {
    expect(decodeExecutionError(new Error('HTTP request failed')).kind).toBe('network');
    expect(decodeExecutionError(new Error('Failed to fetch')).kind).toBe('network');
    // A revert-looking message is not a transport failure.
    expect(decodeExecutionError(new Error('execution reverted')).kind).toBe('unknown');
  });
});
