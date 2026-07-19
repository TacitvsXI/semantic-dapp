import { describe, it, expect } from 'vitest';
import type { NormalizedParameter } from '@semantic-dapp/spec';
import { encodeParam, encodeInputs } from './encode.js';
import { resolveWidget, defaultFieldValue } from './widget.js';

const p = (type: string, name = 'x', components?: NormalizedParameter[]): NormalizedParameter =>
  components ? { name, type, components } : { name, type };

describe('encodeParam scalars', () => {
  it('validates and checksums addresses', () => {
    const r = encodeParam(p('address'), '0x52908400098527886e0f7030069857d2e4169ee7');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('0x52908400098527886E0F7030069857D2E4169EE7');
  });

  it('rejects invalid addresses', () => {
    expect(encodeParam(p('address'), '0x123').ok).toBe(false);
  });

  it('parses uint to bigint and rejects negatives', () => {
    expect(encodeParam(p('uint256'), '42').value).toBe(42n);
    expect(encodeParam(p('uint256'), '-1').ok).toBe(false);
  });

  it('parses booleans', () => {
    expect(encodeParam(p('bool'), 'true').value).toBe(true);
    expect(encodeParam(p('bool'), '0').value).toBe(false);
  });

  it('validates fixed bytes length', () => {
    expect(encodeParam(p('bytes32'), '0x' + '00'.repeat(32)).ok).toBe(true);
    expect(encodeParam(p('bytes32'), '0x00').ok).toBe(false);
    expect(encodeParam(p('bytes'), '0xabcd').ok).toBe(true);
    expect(encodeParam(p('bytes'), 'nope').ok).toBe(false);
  });
});

describe('encodeParam composites', () => {
  it('encodes arrays element-wise', () => {
    const r = encodeParam(p('uint256[]'), ['1', '2', '3']);
    expect(r.ok).toBe(true);
    expect(r.value).toEqual([1n, 2n, 3n]);
  });

  it('reports the failing array index', () => {
    const r = encodeParam(p('uint256[]'), ['1', 'bad']);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('[1]');
  });

  it('encodes tuples as ordered arrays', () => {
    const tuple = p('tuple', 't', [p('address', 'to'), p('uint256', 'amount')]);
    const r = encodeParam(tuple, ['0x52908400098527886e0f7030069857d2e4169ee7', '5']);
    expect(r.ok).toBe(true);
    expect(r.value).toEqual(['0x52908400098527886E0F7030069857D2E4169EE7', 5n]);
  });

  it('encodes an array of tuples', () => {
    const tupleArray = p('tuple[]', 't', [p('uint256', 'a'), p('bool', 'b')]);
    const r = encodeParam(tupleArray, [
      ['1', 'true'],
      ['2', 'false'],
    ]);
    expect(r.value).toEqual([
      [1n, true],
      [2n, false],
    ]);
  });
});

describe('encodeInputs', () => {
  it('collects per-field errors', () => {
    const result = encodeInputs([p('address', 'to'), p('uint256', 'amount')], ['bad', '5']);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toBeDefined();
    expect(result.errors[1]).toBeUndefined();
  });
});

describe('resolveWidget / defaultFieldValue', () => {
  it('resolves widgets by type', () => {
    expect(resolveWidget(p('address'))).toBe('address');
    expect(resolveWidget(p('uint256'))).toBe('integer');
    expect(resolveWidget(p('bool'))).toBe('boolean');
    expect(resolveWidget(p('bytes32'))).toBe('bytes');
    expect(resolveWidget(p('address[]'))).toBe('address-array');
    expect(resolveWidget(p('uint256[]'))).toBe('numeric-array');
    expect(resolveWidget(p('tuple', 't', [p('uint256')]))).toBe('tuple');
  });

  it('produces sensible defaults', () => {
    expect(defaultFieldValue(p('uint256'))).toBe('');
    expect(defaultFieldValue(p('bool'))).toBe('false');
    expect(defaultFieldValue(p('uint256[]'))).toEqual([]);
    expect(defaultFieldValue(p('tuple', 't', [p('uint256'), p('bool')]))).toEqual(['', 'false']);
  });
});
