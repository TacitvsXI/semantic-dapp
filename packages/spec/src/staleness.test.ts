import { describe, it, expect } from 'vitest';
import { isManifestStale, manifestCodeHash } from './staleness.js';
import type { SemanticManifest } from './manifest.js';

function manifestWith(codeHash?: string): SemanticManifest {
  return {
    version: 1,
    project: { name: 'Demo' },
    contracts: [
      {
        id: 'contract',
        abiSource: 'manual',
        standards: [],
        ...(codeHash ? { implementationCodeHash: codeHash } : {}),
      },
    ],
    operations: [],
  };
}

describe('staleness', () => {
  it('reads the stored implementation code hash', () => {
    expect(manifestCodeHash(manifestWith('0xabc'))).toBe('0xabc');
    expect(manifestCodeHash(manifestWith())).toBeUndefined();
  });

  it('is not stale when hashes match (case-insensitive)', () => {
    expect(isManifestStale(manifestWith('0xABC'), '0xabc')).toBe(false);
  });

  it('is stale when hashes differ', () => {
    expect(isManifestStale(manifestWith('0xabc'), '0xdef')).toBe(true);
  });

  it('never flags staleness when a hash is missing', () => {
    expect(isManifestStale(manifestWith(), '0xabc')).toBe(false);
    expect(isManifestStale(manifestWith('0xabc'), undefined)).toBe(false);
  });
});
