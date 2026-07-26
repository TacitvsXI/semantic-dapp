import { describe, it, expect } from 'vitest';
import { keccak256 } from 'viem';
import type { ContractFunction } from '@semantic-dapp/spec';
import {
  buildExecutionEnvelope,
  encodeWriteCalldata,
  envelopesMatch,
  executionContextKey,
} from './executionEnvelope.js';

const setAmount: ContractFunction = {
  kind: 'function',
  name: 'setAmount',
  signature: 'setAmount(uint256)',
  selector: '0x60fe47b1',
  stateMutability: 'nonpayable',
  isRead: false,
  isPayable: false,
  inputs: [{ name: 'amount', type: 'uint256' }],
  outputs: [],
};

describe('executionEnvelope', () => {
  it('binds calldata hash and matches until integrity drifts', () => {
    const args = [1n];
    const calldata = encodeWriteCalldata(setAmount, args);
    const base = buildExecutionEnvelope({
      signature: setAmount.signature,
      args,
      calldata,
      chainId: 1,
      account: '0xAbc',
      to: '0xDef',
      integrity: { abiHash: '0xaaa', implementation: '0x111' },
      simulationBlock: 99n,
    });

    expect(base.calldataHash).toBe(keccak256(calldata));
    expect(base.account).toBe('0xabc');

    const same = buildExecutionEnvelope({
      signature: setAmount.signature,
      args,
      calldata,
      chainId: 1,
      account: '0xabc',
      to: '0xdef',
      integrity: { abiHash: '0xAAA', implementation: '0x111' },
      simulationBlock: 100n, // ignored for equality
    });
    expect(envelopesMatch(base, same)).toBe(true);

    const drifted = buildExecutionEnvelope({
      signature: setAmount.signature,
      args,
      calldata,
      chainId: 1,
      account: '0xabc',
      to: '0xdef',
      integrity: { abiHash: '0xaaa', implementation: '0x222' },
    });
    expect(envelopesMatch(base, drifted)).toBe(false);
  });

  it('detects arg/calldata drift', () => {
    const a = encodeWriteCalldata(setAmount, [1n]);
    const b = encodeWriteCalldata(setAmount, [2n]);
    expect(a).not.toBe(b);

    const envA = buildExecutionEnvelope({
      signature: setAmount.signature,
      args: [1n],
      calldata: a,
      to: '0xdef',
    });
    const envB = buildExecutionEnvelope({
      signature: setAmount.signature,
      args: [2n],
      calldata: b,
      to: '0xdef',
    });
    expect(envelopesMatch(envA, envB)).toBe(false);
  });

  it('builds a context key that changes with implementation / abi', () => {
    const a = executionContextKey({
      chainId: 1,
      account: '0xabc',
      target: '0xdef',
      integrity: { abiHash: '0x1', implementation: '0ximp' },
    });
    const b = executionContextKey({
      chainId: 1,
      account: '0xabc',
      target: '0xdef',
      integrity: { abiHash: '0x1', implementation: '0xother' },
    });
    expect(a).not.toBe(b);
  });
});
