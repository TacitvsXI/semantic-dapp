import { describe, it, expect } from 'vitest';
import { scalarFeedback } from './validate.js';

const LOWER = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const CHECKSUM = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

describe('scalarFeedback', () => {
  it('returns null for empty input (stay calm until there is something to say)', () => {
    expect(scalarFeedback('address', '')).toBeNull();
    expect(scalarFeedback('uint256', '   ')).toBeNull();
  });

  it('accepts a checksummed address as-is', () => {
    const fb = scalarFeedback('address', CHECKSUM);
    expect(fb).toEqual({ tone: 'ok', text: 'Address accepted', code: CHECKSUM });
  });

  it('accepts and checksums a lowercase address', () => {
    const fb = scalarFeedback('address', LOWER);
    expect(fb?.tone).toBe('ok');
    expect(fb?.text).toBe('Address accepted (checksummed)');
    expect(fb?.code).toBe(CHECKSUM);
  });

  it('flags an invalid address', () => {
    expect(scalarFeedback('address', '0x1234')?.tone).toBe('error');
  });

  it('echoes a parsed integer and rejects non-numbers', () => {
    expect(scalarFeedback('uint256', '1000')).toEqual({
      tone: 'ok',
      text: 'Accepted',
      code: '1000',
    });
    expect(scalarFeedback('uint256', '-1')?.tone).toBe('error');
    expect(scalarFeedback('int256', '-1')).toEqual({ tone: 'ok', text: 'Accepted', code: '-1' });
    expect(scalarFeedback('uint8', 'abc')?.tone).toBe('error');
  });

  it('validates bytes hex and fixed length', () => {
    expect(scalarFeedback('bytes', '0xdead')?.tone).toBe('ok');
    expect(scalarFeedback('bytes', 'dead')?.tone).toBe('error');
    expect(scalarFeedback('bytes32', `0x${'00'.repeat(32)}`)?.tone).toBe('ok');
    expect(scalarFeedback('bytes32', '0x00')?.tone).toBe('error');
  });

  it('stays silent for string and unknown scalars', () => {
    expect(scalarFeedback('string', 'hello')).toBeNull();
    expect(scalarFeedback('weirdtype', 'x')).toBeNull();
  });
});
