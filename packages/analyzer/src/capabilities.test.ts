import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import {
  detectOwnable,
  detectAccessControl,
  detectPausable,
  detectUpgradeable,
} from './capabilities.js';
import { detectAccessModel } from './access.js';

function fn(name: string, inputs: string[], outputs: string[], mut = 'nonpayable') {
  return {
    type: 'function',
    name,
    stateMutability: mut,
    inputs: inputs.map((type, i) => ({ name: `a${i}`, type })),
    outputs: outputs.map((type) => ({ name: '', type })),
  } as const;
}

describe('detectOwnable', () => {
  it('detects owner + transferOwnership', () => {
    const model = normalizeAbi([
      fn('owner', [], ['address'], 'view'),
      fn('transferOwnership', ['address'], []),
      fn('renounceOwnership', [], []),
    ] as unknown as Abi);
    expect(detectOwnable(model).detected).toBe(true);
  });

  it('does not detect a lone owner() getter', () => {
    const model = normalizeAbi([fn('owner', [], ['address'], 'view')] as unknown as Abi);
    expect(detectOwnable(model).detected).toBe(false);
  });
});

describe('detectAccessControl', () => {
  it('detects role management', () => {
    const model = normalizeAbi([
      fn('hasRole', ['bytes32', 'address'], ['bool'], 'view'),
      fn('getRoleAdmin', ['bytes32'], ['bytes32'], 'view'),
      fn('grantRole', ['bytes32', 'address'], []),
      fn('revokeRole', ['bytes32', 'address'], []),
      fn('renounceRole', ['bytes32', 'address'], []),
    ] as unknown as Abi);
    expect(detectAccessControl(model).detected).toBe(true);
  });
});

describe('detectPausable', () => {
  it('requires paused() and a toggle', () => {
    const model = normalizeAbi([
      fn('paused', [], ['bool'], 'view'),
      fn('pause', [], []),
      fn('unpause', [], []),
    ] as unknown as Abi);
    expect(detectPausable(model).detected).toBe(true);
  });

  it('does not detect a read-only paused() flag', () => {
    const model = normalizeAbi([fn('paused', [], ['bool'], 'view')] as unknown as Abi);
    expect(detectPausable(model).detected).toBe(false);
  });
});

describe('detectUpgradeable', () => {
  it('detects a UUPS upgrade entrypoint', () => {
    const model = normalizeAbi([
      fn('upgradeToAndCall', ['address', 'bytes'], [], 'payable'),
      fn('proxiableUUID', [], ['bytes32'], 'view'),
    ] as unknown as Abi);
    expect(detectUpgradeable(model).detected).toBe(true);
  });
});

describe('detectAccessModel', () => {
  it('prefers access-control over ownable', () => {
    const model = normalizeAbi([
      fn('owner', [], ['address'], 'view'),
      fn('hasRole', ['bytes32', 'address'], ['bool'], 'view'),
      fn('getRoleAdmin', ['bytes32'], ['bytes32'], 'view'),
    ] as unknown as Abi);
    expect(detectAccessModel(model).kind).toBe('access-control');
  });

  it('falls back to ownable', () => {
    const model = normalizeAbi([fn('owner', [], ['address'], 'view')] as unknown as Abi);
    expect(detectAccessModel(model).kind).toBe('ownable');
  });

  it('is none for a plain contract', () => {
    const model = normalizeAbi([fn('foo', [], [], 'view')] as unknown as Abi);
    expect(detectAccessModel(model).kind).toBe('none');
  });
});
