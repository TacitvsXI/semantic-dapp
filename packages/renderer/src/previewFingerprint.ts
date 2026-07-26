/**
 * Stable fingerprint for a write preview: args + wallet/network/target + function.
 * Used to invalidate stale previews and block submit when the form drifts.
 */
export function buildPreviewFingerprint(input: {
  signature: string;
  args: unknown[];
  chainId?: number;
  account?: string;
  target?: string;
  value?: bigint;
}): string {
  return JSON.stringify({
    signature: input.signature,
    args: input.args.map(serializePreviewArg),
    chainId: input.chainId ?? null,
    account: input.account?.toLowerCase() ?? null,
    target: input.target?.toLowerCase() ?? null,
    value: input.value !== undefined ? input.value.toString() : '0',
  });
}

function serializePreviewArg(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializePreviewArg);
  if (value === undefined) return null;
  return value;
}
