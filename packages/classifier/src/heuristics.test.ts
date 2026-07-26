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

describe('classifyContract — name-heuristic audit (no over-claimed privilege)', () => {
  it('treats a bare withdraw as a user action, not admin', () => {
    const abi = [
      fn('deposit', [], [], 'payable'),
      fn('withdraw', ['uint256'], []),
    ] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const w = result.operations.find((o) => o.function === 'withdraw(uint256)');
    expect(w?.audience).toBe('user');
    expect(w?.operationType).toBe('fund-withdraw');
    expect(w?.permission).toBeUndefined();
  });

  it('treats a no-arg withdraw() as a privileged drain (admin, high)', () => {
    const abi = [fn('withdraw', [], [])] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const w = result.operations.find((o) => o.function === 'withdraw()');
    expect(w?.audience).toBe('admin');
    expect(w?.operationType).toBe('fund-withdraw');
    expect(w?.risk?.level).toBe('high');
  });

  it('does not label generic add/remove (e.g. addLiquidity) as admin', () => {
    const abi = [
      fn('addLiquidity', ['address', 'address', 'uint256', 'uint256'], ['uint256']),
      fn('removeLiquidity', ['address', 'address', 'uint256'], ['uint256']),
    ] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    for (const sig of [
      'addLiquidity(address,address,uint256,uint256)',
      'removeLiquidity(address,address,uint256)',
    ]) {
      const op = result.operations.find((o) => o.function === sig);
      expect(op?.audience).not.toBe('admin');
      expect(op?.operationType).toBe('unknown');
    }
  });

  it('still routes explicit config setters to admin', () => {
    const abi = [
      fn('owner', [], ['address'], 'view'),
      fn('setFee', ['uint256'], []),
    ] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const s = result.operations.find((o) => o.function === 'setFee(uint256)');
    expect(s?.audience).toBe('admin');
    expect(s?.operationType).toBe('admin-config');
  });
});

describe('classifyContract — risk precision (payable is not inherently risky)', () => {
  it('keeps a payable deposit at low risk (payable is expected, not risky)', () => {
    const abi = [fn('deposit', [], [], 'payable')] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const d = result.operations.find((o) => o.function === 'deposit()');
    expect(d?.audience).toBe('user');
    expect(d?.operationType).toBe('fund-deposit');
    // Routing rule (deposit → low, priority 50) beats the payable floor (45).
    expect(d?.risk?.level).toBe('low');
  });

  it('still applies a medium floor to a payable writer no rule understands', () => {
    const abi = [fn('contribute', [], [], 'payable')] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const c = result.operations.find((o) => o.function === 'contribute()');
    // No name/shape rule matches, so the payable floor makes it medium (safe default).
    expect(c?.risk?.level).toBe('medium');
  });

  it('keeps dangerous names high even when payable', () => {
    const abi = [fn('migrate', ['address'], [], 'payable')] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const m = result.operations.find((o) => o.function === 'migrate(address)');
    // Dangerous-name tier (priority 70) overrides the payable floor.
    expect(m?.risk?.level).toBe('high');
  });
});

describe('humanize', () => {
  it('splits camelCase into a title', () => {
    expect(humanize('setFeeRecipient')).toBe('Set fee recipient');
    expect(humanize('totalStaked')).toBe('Total staked');
  });
});
