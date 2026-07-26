import { describe, it, expect } from 'vitest';
import { getAddress, type Address, type Hex } from 'viem';
import {
  addressFromStorageWord,
  detectProxy,
  minimalProxyImplementation,
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
const CLONE_IMPL: Address = getAddress('0x5555555555555555555555555555555555555555');

/** Build EIP-1167 minimal-proxy runtime bytecode pointing at `impl`. */
function minimalProxyCode(impl: Address): Hex {
  const body = impl.toLowerCase().replace(/^0x/, '');
  return `0x363d3d373d3d3d363d73${body}5af43d82803e903d91602b57fd5bf3` as Hex;
}

interface ReaderOptions {
  slots?: Partial<Record<Hex, Hex>>;
  callResult?: Hex;
  code?: Hex;
  /** Per-selector call results, keyed by the 4-byte selector. */
  calls?: Partial<Record<Hex, Hex>>;
  /** Addresses considered to have deployed code (defaults: all non-zero). */
  codeFor?: (address: Address) => Hex;
}

function makeReader(slots: Partial<Record<Hex, Hex>>, callResult?: Hex): ChainReader;
function makeReader(options: ReaderOptions): ChainReader;
function makeReader(arg: Partial<Record<Hex, Hex>> | ReaderOptions, callResult?: Hex): ChainReader {
  const opts: ReaderOptions =
    'slots' in arg || 'code' in arg || 'calls' in arg || 'codeFor' in arg || 'callResult' in arg
      ? (arg as ReaderOptions)
      : { slots: arg as Partial<Record<Hex, Hex>>, ...(callResult ? { callResult } : {}) };
  const slots = opts.slots ?? {};
  return {
    getStorageAt: async ({ slot }) => slots[slot] ?? ZERO_WORD,
    getCode: async ({ address }) =>
      opts.codeFor ? opts.codeFor(address) : (opts.code ?? '0xabcdef'),
    call: async ({ data }) => opts.calls?.[data.slice(0, 10) as Hex] ?? opts.callResult,
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

  it('detects an EIP-1167 minimal proxy (clone) from bytecode', async () => {
    const reader = makeReader({ code: minimalProxyCode(CLONE_IMPL) });
    const proxy = await detectProxy(reader, IMPL);
    expect(proxy).toMatchObject({
      isProxy: true,
      kind: 'eip1167-minimal',
      implementation: CLONE_IMPL,
    });
  });

  it('detects a legacy implementation() proxy when the impl has code', async () => {
    const reader = makeReader({ calls: { '0x5c60da1b': word(IMPL) } });
    const proxy = await detectProxy(reader, ADMIN);
    expect(proxy).toMatchObject({
      isProxy: true,
      kind: 'legacy-implementation',
      implementation: IMPL,
    });
  });

  it('ignores an implementation() result that points to an EOA (no code)', async () => {
    const reader = makeReader({
      calls: { '0x5c60da1b': word(IMPL) },
      codeFor: (addr) => (addr === IMPL ? '0x' : '0xabcdef'),
    });
    const proxy = await detectProxy(reader, ADMIN);
    expect(proxy.isProxy).toBe(false);
  });

  it('detects a Gnosis Safe masterCopy() proxy', async () => {
    const reader = makeReader({ calls: { '0xa619486e': word(BEACON_IMPL) } });
    const proxy = await detectProxy(reader, IMPL);
    expect(proxy).toMatchObject({
      isProxy: true,
      kind: 'gnosis-safe',
      implementation: BEACON_IMPL,
    });
  });

  it('returns not-a-proxy for a plain contract', async () => {
    const reader = makeReader({});
    const proxy = await detectProxy(reader, IMPL);
    expect(proxy).toEqual({ isProxy: false, kind: 'unknown' });
  });
});

describe('minimalProxyImplementation', () => {
  it('parses the canonical EIP-1167 runtime', () => {
    expect(minimalProxyImplementation(minimalProxyCode(CLONE_IMPL))).toBe(CLONE_IMPL);
  });

  it('parses the PUSH0 variant', () => {
    const body = CLONE_IMPL.toLowerCase().replace(/^0x/, '');
    const code = `0x365f5f375f5f5f365f73${body}5af43d5f5f3e5f3d91602a57fd5bf3` as Hex;
    expect(minimalProxyImplementation(code)).toBe(CLONE_IMPL);
  });

  it('returns undefined for non-clone bytecode', () => {
    expect(minimalProxyImplementation('0x6080604052')).toBeUndefined();
    expect(minimalProxyImplementation('0x')).toBeUndefined();
    expect(minimalProxyImplementation(undefined)).toBeUndefined();
  });
});
