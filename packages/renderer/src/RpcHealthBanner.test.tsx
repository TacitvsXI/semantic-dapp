import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { normalizeAbi } from '@semantic-dapp/spec';
import type { FormattedOutput } from '@semantic-dapp/execution';
import { RpcHealthBanner } from './RpcHealthBanner.js';
import type { ContractRuntime } from './runtime.js';

const ABI = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
];
const NO_READS = [
  {
    type: 'function',
    name: 'setThing',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'x', type: 'uint256' }],
    outputs: [],
  },
];

function runtime(
  callRead: () => Promise<FormattedOutput[]>,
  wallet?: Partial<ContractRuntime['wallet']>,
): ContractRuntime {
  return {
    wallet: { isConnected: false, connect: () => {}, disconnect: () => {}, ...wallet },
    callRead,
    submitWrite: async () => {},
    getTxState: () => ({ phase: 'idle' }),
  };
}

describe('RpcHealthBanner', () => {
  afterEach(cleanup);

  it('shows the banner on a network error (RPC unreachable)', async () => {
    const rt = runtime(() => Promise.reject(new Error('HTTP request failed')));
    render(<RpcHealthBanner model={normalizeAbi(ABI)} runtime={rt} chainId={1} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/Can't reach the RPC for chain 1/)).toBeTruthy();
    expect(screen.getByText('Connect wallet')).toBeTruthy();
  });

  it('stays hidden when the probe read succeeds', async () => {
    const rt = runtime(async () => [{ name: '', type: 'string', value: 'ok' }]);
    const { container } = render(
      <RpcHealthBanner model={normalizeAbi(ABI)} runtime={rt} chainId={1} />,
    );
    await waitFor(() => expect(container.querySelector('.sd-rpc-banner')).toBeNull());
  });

  it('treats a non-network failure (e.g. revert) as the chain being reachable', async () => {
    // A plain Error decodes to kind "unknown", not "network".
    const read = vi.fn(() => Promise.reject(new Error('execution reverted')));
    const { container } = render(
      <RpcHealthBanner model={normalizeAbi(ABI)} runtime={runtime(read)} chainId={1} />,
    );
    await waitFor(() => expect(read).toHaveBeenCalled());
    // Flush the rejection handler, then assert the banner never appears.
    await Promise.resolve();
    await Promise.resolve();
    expect(container.querySelector('.sd-rpc-banner')).toBeNull();
  });

  it('renders nothing when there is no no-arg getter to probe', () => {
    const read = vi.fn();
    const { container } = render(
      <RpcHealthBanner model={normalizeAbi(NO_READS)} runtime={runtime(read)} chainId={1} />,
    );
    expect(container.querySelector('.sd-rpc-banner')).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
});
