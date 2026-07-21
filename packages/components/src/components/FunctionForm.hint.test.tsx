import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ContractFunction } from '@semantic-dapp/spec';
import { FunctionForm } from './FunctionForm.js';

afterEach(cleanup);

const transferFn: ContractFunction = {
  kind: 'function',
  name: 'transfer',
  signature: 'transfer(address,uint256)',
  selector: '0xa9059cbb',
  stateMutability: 'nonpayable',
  isRead: false,
  isPayable: false,
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
};

describe('FunctionForm with token-amount hint', () => {
  it('encodes a human amount into base units using the token decimals', () => {
    let submitted: unknown[] | undefined;
    render(
      <FunctionForm
        func={transferFn}
        hints={[undefined, 'token-amount']}
        amount={{ decimals: 6, symbol: 'USDC' }}
        onSubmit={(args) => {
          submitted = args;
        }}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, {
      target: { value: '0x52908400098527886e0f7030069857d2e4169ee7' },
    });
    // Second textbox is the human-unit amount widget.
    fireEvent.change(inputs[1]!, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send transaction' }));
    expect(submitted).toEqual(['0x52908400098527886E0F7030069857D2E4169EE7', 2_000_000n]);
  });

  it('falls back to a raw integer input when decimals are unknown', () => {
    let submitted: unknown[] | undefined;
    render(
      <FunctionForm
        func={transferFn}
        hints={[undefined, 'token-amount']}
        amount={{ symbol: 'USDC' }}
        onSubmit={(args) => {
          submitted = args;
        }}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, {
      target: { value: '0x52908400098527886e0f7030069857d2e4169ee7' },
    });
    fireEvent.change(inputs[1]!, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send transaction' }));
    // No decimals => raw integer, not scaled.
    expect(submitted).toEqual(['0x52908400098527886E0F7030069857D2E4169EE7', 100n]);
  });
});
