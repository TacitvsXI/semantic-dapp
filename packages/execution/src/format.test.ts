import { describe, it, expect } from 'vitest';
import { toDisplayValue, formatReadResult, formatTokenAmount } from './format.js';
import type { NormalizedParameter } from '@semantic-dapp/spec';

describe('toDisplayValue', () => {
  it('stringifies bigints', () => {
    expect(toDisplayValue(123n)).toBe('123');
  });

  it('renders booleans as words', () => {
    expect(toDisplayValue(true)).toBe('true');
    expect(toDisplayValue(false)).toBe('false');
  });

  it('checksums addresses', () => {
    expect(toDisplayValue('0x52908400098527886e0f7030069857d2e4169ee7')).toBe(
      '0x52908400098527886E0F7030069857D2E4169EE7',
    );
  });

  it('recurses into arrays and tuples', () => {
    expect(toDisplayValue([1n, 2n])).toEqual(['1', '2']);
    expect(toDisplayValue({ a: 1n, b: true })).toEqual({ a: '1', b: 'true' });
  });
});

describe('formatReadResult', () => {
  it('handles a single output', () => {
    const outputs: NormalizedParameter[] = [{ name: '', type: 'uint256' }];
    expect(formatReadResult(outputs, 42n)).toEqual([
      { name: 'result', type: 'uint256', value: '42' },
    ]);
  });

  it('zips multiple outputs', () => {
    const outputs: NormalizedParameter[] = [
      { name: 'a', type: 'uint256' },
      { name: 'b', type: 'bool' },
    ];
    expect(formatReadResult(outputs, [1n, true])).toEqual([
      { name: 'a', type: 'uint256', value: '1' },
      { name: 'b', type: 'bool', value: 'true' },
    ]);
  });

  it('returns empty for no outputs and no value', () => {
    expect(formatReadResult([], undefined)).toEqual([]);
  });
});

describe('formatTokenAmount', () => {
  it('applies decimals', () => {
    expect(formatTokenAmount(1_000_000_000_000_000_000n, 18)).toBe('1');
    expect(formatTokenAmount(1_500_000n, 6)).toBe('1.5');
  });
});
