import { useCallback, useEffect, useState } from 'react';
import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import {
  NftGallery,
  decodeJsonDataUri,
  normalizeMetadata,
  resolveUri,
  type NftItem,
  type NftMetadata,
} from '@semantic-dapp/components';
import type { ContractRuntime } from './runtime.js';

export interface Erc721ActionsProps {
  model: ContractModel;
  runtime: ContractRuntime;
  address?: string;
  /** Cap on auto-enumerated tokens to avoid unbounded read loops. */
  maxEnumerate?: number;
}

function findFn(model: ContractModel, signature: string): ContractFunction | undefined {
  return model.functions.find((f) => f.signature === signature);
}

async function fetchMetadata(tokenUri: string): Promise<NftMetadata> {
  const inline = decodeJsonDataUri(tokenUri);
  if (inline !== null) return normalizeMetadata(JSON.parse(inline));
  const res = await fetch(resolveUri(tokenUri));
  if (!res.ok) throw new Error(`metadata HTTP ${res.status}`);
  return normalizeMetadata(await res.json());
}

/**
 * Wires the semantic ERC-721 {@link NftGallery} to the runtime: auto-lists the
 * connected owner's tokens when the collection is Enumerable, lets you inspect
 * any token id, and resolves `tokenURI` metadata (ipfs / data-uri / http).
 */
export function Erc721Actions({ model, runtime, address, maxEnumerate = 24 }: Erc721ActionsProps) {
  const [items, setItems] = useState<NftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const owner = runtime.wallet.address;

  const ownerOfFn = findFn(model, 'ownerOf(uint256)');
  const tokenUriFn = findFn(model, 'tokenURI(uint256)');
  const balanceOfFn = findFn(model, 'balanceOf(address)');
  const tokenOfOwnerByIndexFn = findFn(model, 'tokenOfOwnerByIndex(address,uint256)');
  const enumerable = balanceOfFn !== undefined && tokenOfOwnerByIndexFn !== undefined;

  const readValue = useCallback(
    async (fn: ContractFunction | undefined, args: unknown[]): Promise<string | undefined> => {
      if (!fn) return undefined;
      try {
        const out = await runtime.callRead(fn, args);
        const value = out[0]?.value;
        return typeof value === 'string' ? value : undefined;
      } catch {
        return undefined;
      }
    },
    [runtime],
  );

  const hydrate = useCallback(
    async (id: string) => {
      const patch = (next: Partial<NftItem>) =>
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
      patch({ loading: true, error: undefined });
      const ownerAddr = await readValue(ownerOfFn, [id]);
      if (ownerAddr) patch({ owner: ownerAddr });
      const uri = await readValue(tokenUriFn, [id]);
      if (!uri) {
        patch({ loading: false, error: ownerAddr ? undefined : 'Token not found' });
        return;
      }
      try {
        const meta = await fetchMetadata(uri);
        patch({ loading: false, ...meta });
      } catch {
        patch({ loading: false, error: 'Metadata unavailable' });
      }
    },
    [readValue, ownerOfFn, tokenUriFn],
  );

  const addId = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.some((it) => it.id === id) ? prev : [...prev, { id, loading: true }],
      );
      void hydrate(id);
    },
    [hydrate],
  );

  const enumerateOwner = useCallback(async () => {
    if (!enumerable || !owner) return;
    setLoading(true);
    const balanceRaw = await readValue(balanceOfFn, [owner]);
    const balance = balanceRaw ? Number(balanceRaw) : 0;
    const count = Math.min(balance, maxEnumerate);
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const id = await readValue(tokenOfOwnerByIndexFn, [owner, i]);
      if (id !== undefined) ids.push(id);
    }
    setItems(ids.map((id) => ({ id, loading: true })));
    setLoading(false);
    for (const id of ids) void hydrate(id);
  }, [enumerable, owner, readValue, balanceOfFn, tokenOfOwnerByIndexFn, maxEnumerate, hydrate]);

  useEffect(() => {
    void enumerateOwner();
  }, [enumerateOwner]);

  const refresh = useCallback(() => {
    if (enumerable && owner) {
      void enumerateOwner();
    } else {
      for (const it of items) void hydrate(it.id);
    }
  }, [enumerable, owner, enumerateOwner, items, hydrate]);

  if (!tokenUriFn && !ownerOfFn) return null;

  return (
    <div className="sd-erc721-actions">
      <NftGallery
        items={items}
        loading={loading}
        {...(runtime.explorerUrl ? { explorerUrl: runtime.explorerUrl } : {})}
        {...(address !== undefined ? { address } : {})}
        onAdd={addId}
        onRefresh={refresh}
        emptyHint={
          enumerable
            ? 'Connect a wallet to list your tokens, or inspect any token id.'
            : 'Inspect any token id to view its metadata and owner.'
        }
      />
    </div>
  );
}
