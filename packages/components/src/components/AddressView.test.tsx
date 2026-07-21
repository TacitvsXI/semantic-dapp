import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AddressView, shortenAddress } from './AddressView.js';

const ADDR = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

describe('shortenAddress', () => {
  it('shortens long addresses and leaves short strings intact', () => {
    expect(shortenAddress(ADDR)).toBe('0xA0b8…eB48');
    expect(shortenAddress('0x1234')).toBe('0x1234');
  });
});

describe('AddressView', () => {
  afterEach(cleanup);

  it('links to the explorer when a base URL is given', () => {
    render(<AddressView address={ADDR} explorerUrl="https://etherscan.io" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(`https://etherscan.io/address/${ADDR}`);
    expect(link.textContent).toBe('0xA0b8…eB48');
  });

  it('renders plain code (no link) without an explorer', () => {
    render(<AddressView address={ADDR} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows a copy button by default and hides it when asked', () => {
    const { rerender } = render(<AddressView address={ADDR} />);
    expect(screen.getByLabelText('Copy address')).toBeTruthy();
    rerender(<AddressView address={ADDR} noCopy />);
    expect(screen.queryByLabelText('Copy address')).toBeNull();
  });
});
