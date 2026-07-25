import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { GovernorPanel, proposalStateName } from './GovernorPanel.js';

afterEach(cleanup);

const TARGET = '0x52908400098527886e0f7030069857d2e4169ee7';

function noop() {}

describe('proposalStateName', () => {
  it('maps the OZ state ordering', () => {
    expect(proposalStateName(0)).toBe('Pending');
    expect(proposalStateName(1)).toBe('Active');
    expect(proposalStateName(7)).toBe('Executed');
    expect(proposalStateName(99)).toBe('State 99');
  });
});

describe('GovernorPanel propose', () => {
  it('builds index-aligned target/value/calldata arrays with ETH parsed to wei', () => {
    let out:
      { targets: string[]; values: bigint[]; calldatas: string[]; description: string } | undefined;
    render(
      <GovernorPanel
        onPropose={(targets, values, calldatas, description) => {
          out = { targets, values, calldatas, description };
        }}
        onVote={noop}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('What does this proposal do?'), {
      target: { value: 'Fund the grant' },
    });
    fireEvent.change(screen.getByPlaceholderText('target 0x…'), { target: { value: TARGET } });
    fireEvent.change(screen.getByPlaceholderText('value (ETH)'), { target: { value: '1.5' } });
    fireEvent.change(screen.getByPlaceholderText('calldata 0x…'), { target: { value: '0xabcd' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create proposal' }));

    expect(out?.description).toBe('Fund the grant');
    expect(out?.targets).toEqual(['0x52908400098527886E0F7030069857D2E4169EE7']);
    expect(out?.values).toEqual([1_500_000_000_000_000_000n]);
    expect(out?.calldatas).toEqual(['0xabcd']);
  });

  it('requires a description', () => {
    let called = false;
    render(<GovernorPanel onPropose={() => (called = true)} onVote={noop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create proposal' }));
    expect(called).toBe(false);
    expect(screen.getByText(/description is required/)).toBeTruthy();
  });
});

describe('GovernorPanel vote', () => {
  it('casts a vote with the selected support and looks up state', async () => {
    let voted: { id: bigint; support: number; reason?: string } | undefined;
    render(
      <GovernorPanel
        onPropose={noop}
        onVote={(id, support, reason) => {
          voted = { id, support, ...(reason !== undefined ? { reason } : {}) };
        }}
        onCheckState={async () => 4}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Vote' }));
    fireEvent.change(screen.getByPlaceholderText('proposal id'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check state' }));
    await waitFor(() => expect(screen.getByText('Succeeded')).toBeTruthy());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cast vote' }));
    expect(voted).toEqual({ id: 42n, support: 0 });
  });

  it('includes a reason only when supported', () => {
    let voted: { id: bigint; support: number; reason?: string } | undefined;
    const spy = vi.fn((id: bigint, support: number, reason?: string) => {
      voted = { id, support, ...(reason !== undefined ? { reason } : {}) };
    });
    render(<GovernorPanel canVoteWithReason onPropose={noop} onVote={spy} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Vote' }));
    fireEvent.change(screen.getByPlaceholderText('proposal id'), { target: { value: '7' } });
    fireEvent.change(screen.getByPlaceholderText('Why are you voting this way?'), {
      target: { value: 'lgtm' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cast vote' }));
    expect(voted).toEqual({ id: 7n, support: 1, reason: 'lgtm' });
  });
});
