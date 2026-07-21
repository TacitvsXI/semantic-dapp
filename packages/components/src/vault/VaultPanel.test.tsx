import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { VaultPanel } from './VaultPanel.js';

afterEach(cleanup);

function noop() {}

describe('VaultPanel', () => {
  it('deposits assets parsed into base units with the connected receiver', () => {
    let deposited: bigint | undefined;
    render(
      <VaultPanel
        decimals={18}
        assetSymbol="FIX"
        shareSymbol="vFIX"
        preview={async () => undefined}
        onDeposit={(assets) => {
          deposited = assets;
        }}
        onMint={noop}
        onWithdraw={noop}
        onRedeem={noop}
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Deposit' }));
    expect(deposited).toBe(1_500_000_000_000_000_000n);
  });

  it('shows a live preview of the counterpart amount', async () => {
    vi.useFakeTimers();
    const preview = vi.fn(async (_a: string, amount: bigint) => amount * 2n);
    render(
      <VaultPanel
        decimals={18}
        assetSymbol="FIX"
        shareSymbol="vFIX"
        preview={preview as never}
        onDeposit={noop}
        onMint={noop}
        onWithdraw={noop}
        onRedeem={noop}
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1' } });
    await vi.advanceTimersByTimeAsync(350);
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByText(/You receive/)).toBeTruthy());
    expect(preview).toHaveBeenCalledWith('deposit', 1_000_000_000_000_000_000n);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('switches actions and blocks redeem above the share balance', () => {
    let redeemed = false;
    render(
      <VaultPanel
        decimals={18}
        shareSymbol="vFIX"
        shareBalance={1_000_000_000_000_000_000n}
        preview={async () => undefined}
        onDeposit={noop}
        onMint={noop}
        onWithdraw={noop}
        onRedeem={() => {
          redeemed = true;
        }}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Redeem' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Redeem' }));
    expect(redeemed).toBe(false);
    expect(screen.getByText(/exceeds the available maximum/)).toBeTruthy();
  });
});
