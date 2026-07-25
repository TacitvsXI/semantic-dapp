import { useState } from 'react';
import { AddressView } from '../components/AddressView.js';
import { SafeText } from '../components/SafeText.js';

export interface NftItem {
  /** Token id as a decimal string. */
  id: string;
  owner?: string;
  name?: string;
  image?: string;
  description?: string;
  loading?: boolean;
  error?: string;
}

export interface NftGalleryProps {
  items: NftItem[];
  explorerUrl?: string;
  /** Contract address, used to build a token explorer link. */
  address?: string;
  loading?: boolean;
  /** Add a token id to inspect. */
  onAdd?: (id: string) => void;
  onRefresh?: () => void;
  emptyHint?: string;
}

function tokenUrl(explorerUrl: string | undefined, address: string | undefined, id: string) {
  if (!explorerUrl || !address) return undefined;
  return `${explorerUrl}/token/${address}?a=${id}`;
}

/** Presentational ERC-721 gallery: a grid of token cards with image + owner. */
export function NftGallery({
  items,
  explorerUrl,
  address,
  loading,
  onAdd,
  onRefresh,
  emptyHint,
}: NftGalleryProps) {
  const [idInput, setIdInput] = useState('');

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const id = idInput.trim();
    if (id === '' || !/^\d+$/.test(id) || !onAdd) return;
    onAdd(id);
    setIdInput('');
  };

  return (
    <section className="sd-card sd-nft">
      <header className="sd-card__header">
        <div>
          <h3 className="sd-card__title">Tokens</h3>
          <code className="sd-card__sig">ERC-721 gallery</code>
        </div>
        <div className="sd-nft__toolbar">
          {onAdd ? (
            <form className="sd-nft__add" onSubmit={add}>
              <input
                className="sd-input"
                inputMode="numeric"
                placeholder="token id"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                aria-label="Token id to inspect"
              />
              <button type="submit" className="sd-btn sd-btn--ghost">
                Inspect
              </button>
            </form>
          ) : null}
          {onRefresh ? (
            <button type="button" className="sd-btn sd-btn--ghost" onClick={onRefresh}>
              Refresh
            </button>
          ) : null}
        </div>
      </header>

      {loading ? <p className="sd-empty">Loading tokens…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="sd-empty">
          {emptyHint ?? 'No tokens to show yet. Add a token id to inspect.'}
        </p>
      ) : null}

      <div className="sd-nft__grid">
        {items.map((item) => (
          <article className="sd-nft__card" key={item.id}>
            <div className="sd-nft__media">
              {item.image ? (
                <img src={item.image} alt={item.name ?? `Token ${item.id}`} loading="lazy" />
              ) : (
                <div className="sd-nft__placeholder" aria-hidden="true">
                  #{item.id}
                </div>
              )}
            </div>
            <div className="sd-nft__body">
              <h4 className="sd-nft__name">
                <SafeText value={item.name} fallback={`Token #${item.id}`} maxLength={60} />
              </h4>
              <p className="sd-nft__id">
                #{item.id}
                {tokenUrl(explorerUrl, address, item.id) ? (
                  <>
                    {' · '}
                    <a
                      href={tokenUrl(explorerUrl, address, item.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      explorer
                    </a>
                  </>
                ) : null}
              </p>
              {item.owner ? (
                <p className="sd-nft__owner">
                  Owner{' '}
                  <AddressView address={item.owner} {...(explorerUrl ? { explorerUrl } : {})} />
                </p>
              ) : null}
              {item.loading ? <p className="sd-field__hint">Loading…</p> : null}
              {item.error ? <p className="sd-field__warn">{item.error}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
