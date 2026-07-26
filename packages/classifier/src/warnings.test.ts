import { describe, it, expect } from 'vitest';
import type { OperationDefinition } from '@semantic-dapp/spec';
import { annotateFeeOnTransfer } from './warnings.js';

function op(
  partial: Partial<OperationDefinition> & Pick<OperationDefinition, 'function'>,
): OperationDefinition {
  return {
    id: 'x',
    contract: 'c',
    title: 'Transfer',
    audience: 'user',
    operationType: 'token-transfer',
    isRead: false,
    confidence: 0.9,
    evidence: [],
    inputs: [],
    visibility: 'visible',
    reviewed: false,
    ...partial,
  };
}

describe('annotateFeeOnTransfer', () => {
  it('annotates token-transfer writers when fee-on-transfer is detected', () => {
    const [out] = annotateFeeOnTransfer(
      [op({ function: 'transfer(address,uint256)' })],
      ['erc-20', 'fee-on-transfer'],
    );
    expect(out?.description).toMatch(/Fee-on-transfer/);
    expect(out?.evidence.some((e) => e.detail.includes('Fee-on-transfer'))).toBe(true);
  });

  it('is a no-op without the standard', () => {
    const [out] = annotateFeeOnTransfer(
      [op({ function: 'transfer(address,uint256)' })],
      ['erc-20'],
    );
    expect(out?.description).toBeUndefined();
  });

  it('does not touch reads or non-transfers', () => {
    const [out] = annotateFeeOnTransfer(
      [op({ function: 'balanceOf(address)', operationType: 'read', isRead: true })],
      ['fee-on-transfer'],
    );
    expect(out?.description).toBeUndefined();
  });
});
