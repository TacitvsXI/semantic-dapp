import { describe, it, expect } from 'vitest';
import { normalizeAbi } from '@semantic-dapp/spec';
import { buildManifest } from '@semantic-dapp/classifier';
import { buildBundle, parseBundle, bundleFilename, BUNDLE_VERSION } from './bundle.js';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function demoManifest() {
  const model = normalizeAbi(ERC20_ABI);
  return buildManifest(model, { projectName: 'Demo', contractId: 'contract', chainId: 1 });
}

describe('buildBundle', () => {
  it('assembles a valid bundle with defaults', () => {
    const bundle = buildBundle({
      name: 'Demo',
      chainId: 1,
      abi: ERC20_ABI as never,
      manifest: demoManifest(),
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(bundle.bundleVersion).toBe(BUNDLE_VERSION);
    expect(bundle.generator.name).toBe('semantic-dapp');
    expect(bundle.generatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(bundle.manifest.operations.length).toBeGreaterThan(0);
  });

  it('rejects an empty name', () => {
    expect(() =>
      buildBundle({ name: '', chainId: 1, abi: ERC20_ABI as never, manifest: demoManifest() }),
    ).toThrow();
  });
});

describe('parseBundle', () => {
  it('round-trips through JSON', () => {
    const bundle = buildBundle({
      name: 'Demo',
      chainId: 1,
      abi: ERC20_ABI as never,
      manifest: demoManifest(),
    });
    const json = JSON.parse(JSON.stringify(bundle));
    const result = parseBundle(json);
    expect(result.ok).toBe(true);
    expect(result.bundle?.name).toBe('Demo');
  });

  it('reports an error for malformed input', () => {
    const result = parseBundle({ bundleVersion: 1, name: 'x' });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('bundleFilename', () => {
  it('slugifies the app name', () => {
    expect(bundleFilename('My Cool Token!')).toBe('my-cool-token.bundle.json');
    expect(bundleFilename('')).toBe('app.bundle.json');
  });
});
