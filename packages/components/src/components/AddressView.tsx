import { CopyButton } from './CopyButton.js';

export interface AddressViewProps {
  address: string;
  /** Block-explorer base URL (no trailing slash). Enables an "open" link. */
  explorerUrl?: string;
  /** Show the full address instead of a shortened `0x1234…abcd`. */
  full?: boolean;
  /** Hide the copy button (e.g. in very tight rows). */
  noCopy?: boolean;
  className?: string;
}

/** Shorten an address to `0x1234…abcd`; short values are returned unchanged. */
export function shortenAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/**
 * Render an EVM address with a copy button and (when an explorer is known) a
 * link out to the block explorer. The visible text is shortened by default but
 * the full address is always available via the title, copy and link.
 */
export function AddressView({
  address,
  explorerUrl,
  full = false,
  noCopy = false,
  className,
}: AddressViewProps) {
  const shown = full ? address : shortenAddress(address);
  const href = explorerUrl ? `${explorerUrl.replace(/\/$/, '')}/address/${address}` : undefined;

  return (
    <span className={`sd-address${className ? ` ${className}` : ''}`}>
      {href ? (
        <a
          className="sd-address__value"
          href={href}
          target="_blank"
          rel="noreferrer"
          title={`${address} — open in explorer`}
        >
          {shown}
        </a>
      ) : (
        <code className="sd-address__value" title={address}>
          {shown}
        </code>
      )}
      {noCopy ? null : <CopyButton value={address} label="Copy address" />}
    </span>
  );
}
