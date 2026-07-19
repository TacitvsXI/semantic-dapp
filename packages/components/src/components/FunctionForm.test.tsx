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

describe('FunctionForm', () => {
  it('renders inputs and a write submit label', () => {
    render(<FunctionForm func={transferFn} onSubmit={() => {}} />);
    expect(screen.getByText('to')).toBeTruthy();
    expect(screen.getByText('amount')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send transaction' })).toBeTruthy();
  });

  it('surfaces validation errors and blocks submit on invalid input', () => {
    let submitted: unknown[] | undefined;
    render(
      <FunctionForm
        func={transferFn}
        onSubmit={(args) => {
          submitted = args;
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send transaction' }));
    expect(submitted).toBeUndefined();
    expect(screen.getByText(/Invalid address/)).toBeTruthy();
  });

  it('encodes and submits valid input', () => {
    let submitted: unknown[] | undefined;
    render(
      <FunctionForm
        func={transferFn}
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
    expect(submitted).toEqual(['0x52908400098527886E0F7030069857D2E4169EE7', 100n]);
  });
});
