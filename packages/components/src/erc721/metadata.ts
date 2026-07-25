/** Default public IPFS gateway used to resolve `ipfs://` URIs. */
export const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

/** Parsed NFT metadata we care about for the gallery. */
export interface NftMetadata {
  name?: string;
  description?: string;
  /** HTTP(S)/data image URL, already gateway-resolved. */
  image?: string;
}

/**
 * Resolve an `ipfs://` (or `ipfs://ipfs/`) URI to an HTTP gateway URL. HTTP(S)
 * and `data:` URIs are returned unchanged; everything else is passed through.
 */
export function resolveUri(uri: string, gateway: string = DEFAULT_IPFS_GATEWAY): string {
  const trimmed = uri.trim();
  if (trimmed.startsWith('ipfs://')) {
    const path = trimmed.slice('ipfs://'.length).replace(/^ipfs\//, '');
    return `${gateway}${path}`;
  }
  return trimmed;
}

/** Decode a `data:application/json[;base64],…` URI to its JSON string, or null. */
export function decodeJsonDataUri(uri: string): string | null {
  const match = /^data:application\/json(;base64)?,(.*)$/s.exec(uri.trim());
  if (!match) return null;
  const [, base64, payload] = match;
  try {
    if (base64) {
      if (typeof atob === 'function') return atob(payload!);
      return Buffer.from(payload!, 'base64').toString('utf8');
    }
    return decodeURIComponent(payload!);
  } catch {
    return null;
  }
}

/**
 * Normalize a raw metadata JSON object into {@link NftMetadata}, resolving the
 * image through the IPFS gateway. Tolerant of missing / non-string fields.
 */
export function normalizeMetadata(
  raw: unknown,
  gateway: string = DEFAULT_IPFS_GATEWAY,
): NftMetadata {
  const out: NftMetadata = {};
  if (typeof raw !== 'object' || raw === null) return out;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name === 'string') out.name = obj.name;
  if (typeof obj.description === 'string') out.description = obj.description;
  const image = obj.image ?? obj.image_url ?? obj.imageUrl;
  if (typeof image === 'string' && image.trim() !== '') out.image = resolveUri(image, gateway);
  return out;
}
