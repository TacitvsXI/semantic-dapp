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

describe('classifyContract — signature-aware mint', () => {
  it('routes mint(address,uint256) to Admin as a privileged, high-risk supply', () => {
    const abi = [
      fn('owner', [], ['address'], 'view'),
      fn('mint', ['address', 'uint256'], []),
    ] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const mint = result.operations.find((o) => o.function === 'mint(address,uint256)');
    expect(mint?.audience).toBe('admin');
    expect(mint?.operationType).toBe('token-mint');
    expect(mint?.risk?.level).toBe('high');
    expect(mint?.permission?.kind).toBe('ownable');
  });

  it('treats a payable mint as a user-facing public/paid mint', () => {
    const abi = [fn('mint', ['uint256'], [], 'payable')] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const mint = result.operations.find((o) => o.function === 'mint(uint256)');
    expect(mint?.audience).toBe('user');
    expect(mint?.operationType).toBe('token-mint');
    expect(mint?.permission).toBeUndefined();
  });

  it('treats a cToken-style mint(uint256) as a user deposit, not a privileged mint', () => {
    const abi = [
      fn('mint', ['uint256'], ['uint256']),
      fn('redeem', ['uint256'], ['uint256']),
      fn('underlying', [], ['address'], 'view'),
    ] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const mint = result.operations.find((o) => o.function === 'mint(uint256)');
    expect(mint?.audience).toBe('user');
    expect(mint?.operationType).toBe('fund-deposit');
    expect(mint?.risk?.level).toBe('low');
    expect(mint?.permission).toBeUndefined();
  });
});

describe('humanize', () => {
  it('splits camelCase into a title', () => {
    expect(humanize('setFeeRecipient')).toBe('Set fee recipient');
    expect(humanize('totalStaked')).toBe('Total staked');
  });
});
