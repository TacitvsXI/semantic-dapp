import { describe, it, expect } from 'vitest';
import { addressUrl, chainName, explorerUrlForChain, knownChain, txUrl } from './known-chains.js';

describe('known chains', () => {
  it('resolves explorer URLs for well-known chains', () => {
    expect(explorerUrlForChain(1)).toBe('https://etherscan.io');
    expect(explorerUrlForChain(8453)).toBe('https://basescan.org');
    expect(explorerUrlForChain(42161)).toBe('https://arbiscan.io');
  });

  it('returns undefined for unknown or explorer-less chains', () => {
    expect(explorerUrlForChain(999999)).toBeUndefined();
    // Local dev chains are known but have no public explorer.
    expect(explorerUrlForChain(31337)).toBeUndefined();
  });

  it('builds tx and address URLs only when the chain is known', () => {
    expect(txUrl(1, '0xabc')).toBe('https://etherscan.io/tx/0xabc');
    expect(addressUrl(1, '0xdef')).toBe('https://etherscan.io/address/0xdef');
    expect(txUrl(999999, '0xabc')).toBeUndefined();
    expect(addressUrl(31337, '0xdef')).toBeUndefined();
  });

  it('names known chains and falls back for unknown ones', () => {
    expect(chainName(1)).toBe('Ethereum');
    expect(chainName(11155111)).toBe('Sepolia');
    expect(chainName(424242)).toBe('Chain 424242');
  });

  it('exposes native currency metadata', () => {
    expect(knownChain(137)?.nativeCurrency?.symbol).toBe('POL');
    expect(knownChain(56)?.nativeCurrency?.symbol).toBe('BNB');
    expect(knownChain(999999)).toBeUndefined();
  });
});
