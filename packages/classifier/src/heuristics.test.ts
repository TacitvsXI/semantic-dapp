import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import { classifyContract } from './classify.js';
import { humanize } from './heuristics.js';

function fn(name: string, inputs: string[], outputs: string[], mut = 'nonpayable') {
  return {
    type: 'function',
    name,
    stateMutability: mut,
    inputs: inputs.map((type, i) => ({ name: `a${i}`, type })),
    outputs: outputs.map((type) => ({ name: '', type })),
  } as const;
}

// A custom Ownable contract that implements no token standard.
const customAbi = [
  fn('owner', [], ['address'], 'view'),
  fn('transferOwnership', ['address'], []),
  fn('setFeeRecipient', ['address'], []),
  fn('rescueTokens', ['address', 'uint256'], []),
  fn('pauseMinting', [], []),
  fn('claimRewards', [], []),
  fn('totalStaked', [], ['uint256'], 'view'),
  fn('doMysteriousThing', ['bytes'], []),
] as const satisfies Abi;

describe('classifyContract — heuristic rule engine', () => {
  const model = normalizeAbi(customAbi as unknown as Abi);
  const result = classifyContract(model, 'c');
  const op = (sig: string) => result.operations.find((o) => o.function === sig);

  it('detects the ownable access model', () => {
    expect(result.standards).toContain('ownable');
  });

  it('routes setters to Admin as admin-config with an ownable permission', () => {
    const setter = op('setFeeRecipient(address)');
    expect(setter?.audience).toBe('admin');
    expect(setter?.operationType).toBe('admin-config');
    expect(setter?.permission?.kind).toBe('ownable');
    expect(setter?.visibility).toBe('visible');
  });

  it('routes rescue functions to Admin as a high-risk fund withdrawal', () => {
    const rescue = op('rescueTokens(address,uint256)');
    expect(rescue?.operationType).toBe('fund-withdraw');
    expect(rescue?.audience).toBe('admin');
    expect(rescue?.risk?.level).toBe('high');
  });

  it('routes pause-like functions to Emergency', () => {
    const pause = op('pauseMinting()');
    expect(pause?.audience).toBe('emergency');
    expect(pause?.operationType).toBe('pause');
  });

  it('routes claim to the user audience without a permission', () => {
    const claim = op('claimRewards()');
    expect(claim?.audience).toBe('user');
    expect(claim?.operationType).toBe('claim');
    expect(claim?.permission).toBeUndefined();
  });

  it('surfaces view functions in the Read tab (visible, user)', () => {
    const read = op('totalStaked()');
    expect(read?.isRead).toBe(true);
    expect(read?.audience).toBe('user');
    expect(read?.visibility).toBe('visible');
  });

  it('keeps truly unknown writers in the Raw tab', () => {
    const unknown = op('doMysteriousThing(bytes)');
    expect(unknown?.audience).toBe('developer');
    expect(unknown?.visibility).toBe('raw-only');
    expect(unknown?.operationType).toBe('unknown');
  });

  it('accumulates evidence from every matching rule', () => {
    const setter = op('setFeeRecipient(address)');
    expect(setter?.evidence.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('never drops a function', () => {
    expect(result.operations).toHaveLength(model.functions.length);
  });
});

describe('humanize', () => {
  it('splits camelCase into a title', () => {
    expect(humanize('setFeeRecipient')).toBe('Set fee recipient');
    expect(humanize('totalStaked')).toBe('Total staked');
  });
});
