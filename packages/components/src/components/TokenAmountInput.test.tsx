import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TokenAmountInput } from './TokenAmountInput.js';

afterEach(cleanup);

/** Controlled harness that round-trips base units, mirroring FunctionForm. */
function Harness(props: {
  decimals: number;
  symbol?: string;
  balance?: bigint;
  spy: (v: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <TokenAmountInput
      value={value}
      decimals={props.decimals}
      {...(props.symbol !== undefined ? { symbol: props.symbol } : {})}
      {...(props.balance !== undefined ? { balance: props.balance } : {})}
      onChange={(v) => {
        props.spy(v as string);
        setValue(v as string);
      }}
    />
  );
}

describe('TokenAmountInput', () => {
  it('emits human units as base units and echoes the resolved value', () => {
    const emitted: string[] = [];
    render(<Harness decimals={6} symbol="USDC" spy={(v) => emitted.push(v)} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2.5' } });
    expect(emitted.at(-1)).toBe('2500000');
    expect(screen.getByText(/2500000 base units/)).toBeTruthy();
  });

  it('fills the balance via MAX and clears to empty on a bad amount', () => {
    const emitted: string[] = [];
    render(
      <Harness decimals={18} balance={1_000_000_000_000_000_000n} spy={(v) => emitted.push(v)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'max' }));
    expect(emitted.at(-1)).toBe('1000000000000000000');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('1');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1.2.3' } });
    expect(emitted.at(-1)).toBe('');
    expect(screen.getByText(/Invalid amount/)).toBeTruthy();
  });

  it('renders the amount widget wrapper', () => {
    render(<TokenAmountInput value="" onChange={() => {}} decimals={18} />);
    expect(document.querySelector('.sd-amount')).toBeTruthy();
  });
});
