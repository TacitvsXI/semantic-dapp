import { describe, it, expect } from 'vitest';
import { parseAbi, parseAbiJson } from './abi-schema.js';

describe('parseAbi', () => {
  it('accepts a raw ABI array', () => {
    const result = parseAbi([
      { type: 'function', name: 'foo', inputs: [], outputs: [], stateMutability: 'view' },
    ]);
    expect(result.success).toBe(true);
    expect(result.abi).toHaveLength(1);
  });

  it('unwraps a Foundry/Hardhat artifact', () => {
    const result = parseAbi({
      abi: [{ type: 'function', name: 'foo', inputs: [], outputs: [] }],
      bytecode: '0x00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty ABI', () => {
    const result = parseAbi([]);
    expect(result.success).toBe(false);
  });

  it('rejects malformed items', () => {
    const result = parseAbi([{ type: 'function' }]);
    expect(result.success).toBe(false);
  });
});

describe('parseAbiJson', () => {
  it('reports invalid JSON clearly', () => {
    const result = parseAbiJson('{ not json');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('parses a valid JSON string', () => {
    const result = parseAbiJson('[{"type":"function","name":"foo","inputs":[],"outputs":[]}]');
    expect(result.success).toBe(true);
  });
});
