import { describe, it, expect } from 'vitest';
import { parseTokenAmount, displayTokenAmount, MAX_UINT256 } from './amount.js';

describe('parseTokenAmount', () => {
  it('parses whole and fractional amounts', () => {
    expect(parseTokenAmount('1', 18).value).toBe(1_000_000_000_000_000_000n);
    expect(parseTokenAmount('1.5', 6).value).toBe(1_500_000n);
  });

  it('rejects empty and malformed input', () => {
    expect(parseTokenAmount('', 18).ok).toBe(false);
    expect(parseTokenAmount('abc', 18).ok).toBe(false);
    expect(parseTokenAmount('.', 18).ok).toBe(false);
  });

  it('rejects too many decimal places', () => {
    const result = parseTokenAmount('1.1234567', 6);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('decimal places');
  });
});

describe('displayTokenAmount', () => {
  it('round-trips with parse', () => {
    const base = parseTokenAmount('123.456', 18).value!;
    expect(displayTokenAmount(base, 18)).toBe('123.456');
  });
});

describe('MAX_UINT256', () => {
  it('is the max uint256', () => {
    expect(MAX_UINT256).toBe(2n ** 256n - 1n);
  });
});
