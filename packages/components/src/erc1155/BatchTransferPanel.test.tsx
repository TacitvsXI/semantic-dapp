import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BatchTransferPanel } from './BatchTransferPanel.js';

afterEach(cleanup);

const RECIPIENT = '0x52908400098527886e0f7030069857d2e4169ee7';

describe('BatchTransferPanel', () => {
  it('builds index-aligned id/amount arrays from paired rows', () => {
    let result: { to: string; ids: bigint[]; amounts: bigint[] } | undefined;
    render(
      <BatchTransferPanel
        onTransfer={(to, ids, amounts) => {
          result = { to, ids, amounts };
        }}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('0x…'), { target: { value: RECIPIENT } });
    // First row.
    fireEvent.change(screen.getByPlaceholderText('id'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText('amount'), { target: { value: '10' } });
    // Add a second row.
    fireEvent.click(screen.getByRole('button', { name: '+ Add token' }));
    const ids = screen.getAllByPlaceholderText('id');
    const amounts = screen.getAllByPlaceholderText('amount');
    fireEvent.change(ids[1]!, { target: { value: '5' } });
    fireEvent.change(amounts[1]!, { target: { value: '3' } });

    fireEvent.click(screen.getByRole('button', { name: /Transfer 2 tokens/ }));
    expect(result?.to).toBe('0x52908400098527886E0F7030069857D2E4169EE7');
    expect(result?.ids).toEqual([1n, 5n]);
    expect(result?.amounts).toEqual([10n, 3n]);
  });

  it('rejects an invalid recipient and a bad row', () => {
    let called = false;
    render(<BatchTransferPanel onTransfer={() => (called = true)} />);
    fireEvent.click(screen.getByRole('button', { name: /Transfer 1 token/ }));
    expect(called).toBe(false);
    expect(screen.getByText(/valid recipient/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('0x…'), { target: { value: RECIPIENT } });
    fireEvent.change(screen.getByPlaceholderText('id'), { target: { value: 'x' } });
    fireEvent.change(screen.getByPlaceholderText('amount'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Transfer 1 token/ }));
    expect(called).toBe(false);
    expect(screen.getByText(/invalid token id/)).toBeTruthy();
  });
});
