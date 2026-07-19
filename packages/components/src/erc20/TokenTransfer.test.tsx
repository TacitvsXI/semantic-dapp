import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TokenTransfer } from './TokenTransfer.js';

afterEach(cleanup);

describe('TokenTransfer', () => {
  it('parses the amount into base units and submits', () => {
    let result: { to: string; amount: bigint } | undefined;
    render(
      <TokenTransfer
        decimals={18}
        symbol="FIX"
        onTransfer={(to, amount) => {
          result = { to, amount };
        }}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, {
      target: { value: '0x52908400098527886e0f7030069857d2e4169ee7' },
    });
    fireEvent.change(inputs[1]!, { target: { value: '2.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));
    expect(result?.amount).toBe(2_500_000_000_000_000_000n);
    expect(result?.to).toBe('0x52908400098527886E0F7030069857D2E4169EE7');
  });

  it('blocks transfers above balance', () => {
    let called = false;
    render(
      <TokenTransfer
        decimals={18}
        balance={1_000_000_000_000_000_000n}
        onTransfer={() => {
          called = true;
        }}
      />,
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, {
      target: { value: '0x52908400098527886e0f7030069857d2e4169ee7' },
    });
    fireEvent.change(inputs[1]!, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));
    expect(called).toBe(false);
    expect(screen.getByText(/exceeds your balance/)).toBeTruthy();
  });
});
