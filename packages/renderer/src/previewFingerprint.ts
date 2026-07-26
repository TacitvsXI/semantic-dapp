import { buildExecutionEnvelope } from './executionEnvelope.js';

/**
 * @deprecated Prefer {@link buildExecutionEnvelope}. Kept as a thin helper for
 * Phase 2-style arg/network fingerprints without calldata.
 */
export function buildPreviewFingerprint(input: {
  signature: string;
  args: unknown[];
  chainId?: number;
  account?: string;
  target?: string;
  value?: bigint;
}): string {
  const env = buildExecutionEnvelope({
    signature: input.signature,
    args: input.args,
    calldata: '0x',
    chainId: input.chainId,
    account: input.account,
    to: input.target,
    value: input.value,
  });
  return JSON.stringify({
    signature: env.signature,
    args: env.args,
    chainId: env.chainId,
    account: env.account,
    target: env.to,
    value: env.value,
  });
}
