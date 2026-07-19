import { describe, it, expect } from 'vitest';
import { getAddress, type Address, type Hex } from 'viem';
import {
  addressFromStorageWord,
  detectProxy,
  EIP1967_ADMIN_SLOT,
  EIP1967_BEACON_SLOT,
  EIP1967_IMPLEMENTATION_SLOT,
} from './proxy.js';
import type { ChainReader } from './types.js';

const ZERO_WORD: Hex = `0x${'0'.repeat(64)}`;

function word(address: string): Hex {
  return `0x${'0'.repeat(24)}${address.toLowerCase().replace(/^0x/, '')}` as Hex;
}

const IMPL: Address = getAddress('0x1111111111111111111111111111111111111111');
const ADMIN: Address = getAddress('0x2222222222222222222222222222222222222222');
const BEACON: Address = getAddress('0x3333333333333333333333333333333333333333');
const BEACON_IMPL: Address = getAddress('0x4444444444444444444444444444444444444444');

function makeReader(slots: Partial<Record<Hex, Hex>>, callResult?: Hex): ChainReader {
  return {
    getStorageAt: async ({ slot }) => slots[slot] ?? ZERO_WORD,
    getCode: async () => '0xabcdef',
    call: async () => callResult,
  };
}

describe('addressFromStorageWord', () => {
  it('extracts a checksummed address from a padded word', () => {
    expect(addressFromStorageWord(word(IMPL))).toBe(IMPL);
  });

  it('returns undefined for the zero word', () => {
    expect(addressFromStorageWord(ZERO_WORD)).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(addressFromStorageWord(undefined)).toBeUndefined();
  });
});

describe('detectProxy', () => {
  it('detects a transparent proxy (impl + admin slots set)', async () => {
    const reader = makeReader({
      [EIP1967_IMPLEMENTATION_SLOT]: word(IMPL),
      [EIP1967_ADMIN_SLOT]: word(ADMIN),
    });
    const proxy = await detectProxy(reader, IMPL);
    expect(proxy).toMatchObject({
      isProxy: true,
      kind: 'eip1967-transparent',
      implementation: IMPL,
      admin: ADMIN,
    });
  });

  it('detects a UUPS proxy (impl set, no admin)', async () => {
    const reader = makeReader({ [EIP1967_IMPLEMENTATION_SLOT]: word(IMPL) });
    const proxy = await detectProxy(reader, IMPL);
    expect(proxy.isProxy).toBe(true);
    expect(proxy.kind).toBe('eip1967-uups');
    expect(proxy.admin).toBeUndefined();
  });

  it('detects a beacon proxy and resolves the implementation', async () => {
    const reader = makeReader({ [EIP1967_BEACON_SLOT]: word(BEACON) }, word(BEACON_IMPL));
    const proxy = await detectProxy(reader, BEACON);
    expect(proxy).toMatchObject({
      isProxy: true,
      kind: 'eip1967-beacon',
      beacon: BEACON,
      implementation: BEACON_IMPL,
    });
  });

  it('returns not-a-proxy for a plain contract', async () => {
    const reader = makeReader({});
    const proxy = await detectProxy(reader, IMPL);
    expect(proxy).toEqual({ isProxy: false, kind: 'unknown' });
  });
});
