import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import { classifyContract } from './classify.js';

function ev(name: string, inputs: string[]) {
  return {
    type: 'event',
    name,
    anonymous: false,
    inputs: inputs.map((type, i) => ({ name: `a${i}`, type, indexed: false })),
  } as const;
}
function fn(name: string, inputs: string[], outputs: string[], mut = 'nonpayable') {
  return {
    type: 'function',
    name,
    stateMutability: mut,
    inputs: inputs.map((type, i) => ({ name: `a${i}`, type })),
    outputs: outputs.map((type) => ({ name: '', type })),
  } as const;
}

const eventOf = (op: { evidence: { source: string }[] }) =>
  op.evidence.find((e) => e.source === 'event');

describe('event corroboration', () => {
  it('corroborates a writer with the event it conventionally emits (verb ↔ event)', () => {
    const abi = [
      fn('deposit', [], [], 'payable'),
      fn('withdraw', ['uint256'], []),
      ev('Deposit', ['address', 'uint256']),
      ev('Withdrawal', ['address', 'uint256']),
    ] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');

    const deposit = result.operations.find((o) => o.function === 'deposit()');
    const withdraw = result.operations.find((o) => o.function === 'withdraw(uint256)');
    expect(eventOf(deposit!)?.detail).toContain('Deposit');
    expect(eventOf(withdraw!)?.detail).toContain('Withdrawal');
  });

  it('matches a setter to its XUpdated/XChanged/XSet event', () => {
    const abi = [
      fn('setFeeRecipient', ['address'], []),
      ev('FeeRecipientChanged', ['address']),
    ] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const setter = result.operations.find((o) => o.function === 'setFeeRecipient(address)');
    expect(eventOf(setter!)?.detail).toContain('FeeRecipientChanged');
  });

  it('nudges confidence up (capped) but never changes routing', () => {
    const abi = [
      fn('harvest', [], []),
      ev('Harvest', ['address', 'uint256']),
    ] as const satisfies Abi;
    const withEvent = classifyContract(normalizeAbi(abi as unknown as Abi), 'c').operations.find(
      (o) => o.function === 'harvest()',
    );
    const noEvent = classifyContract(
      normalizeAbi([fn('harvest', [], [])] as unknown as Abi),
      'c',
    ).operations.find((o) => o.function === 'harvest()');

    expect(withEvent?.confidence).toBeGreaterThan(noEvent?.confidence ?? 0);
    // Routing is untouched: same type + audience with or without the event.
    expect(withEvent?.operationType).toBe(noEvent?.operationType);
    expect(withEvent?.audience).toBe(noEvent?.audience);
  });

  it('does not corroborate reads and leaves unmatched writers alone', () => {
    const abi = [
      fn('totalSupply', [], ['uint256'], 'view'),
      fn('doSomethingObscure', ['bytes'], []),
      ev('TotalSupply', ['uint256']),
    ] as const satisfies Abi;
    const result = classifyContract(normalizeAbi(abi as unknown as Abi), 'c');
    const read = result.operations.find((o) => o.function === 'totalSupply()');
    const obscure = result.operations.find((o) => o.function === 'doSomethingObscure(bytes)');
    expect(eventOf(read!)).toBeUndefined();
    expect(eventOf(obscure!)).toBeUndefined();
  });
});
