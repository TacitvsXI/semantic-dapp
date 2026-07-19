import type { ContractDefinition, SemanticManifest } from './manifest.js';

/** Pick the target contract from a manifest (by id, else the first). */
export function contractInManifest(
  manifest: SemanticManifest,
  contractId?: string,
): ContractDefinition | undefined {
  if (contractId) {
    return manifest.contracts.find((c) => c.id === contractId) ?? manifest.contracts[0];
  }
  return manifest.contracts[0];
}

/** The implementation code hash a manifest was built against, if recorded. */
export function manifestCodeHash(
  manifest: SemanticManifest,
  contractId?: string,
): string | undefined {
  return contractInManifest(manifest, contractId)?.implementationCodeHash;
}

/**
 * True when the manifest was built against a different implementation than the
 * one currently on-chain. Returns false when either hash is unknown (we never
 * flag staleness we cannot prove).
 */
export function isManifestStale(
  manifest: SemanticManifest,
  currentCodeHash: string | undefined,
  contractId?: string,
): boolean {
  const stored = manifestCodeHash(manifest, contractId);
  if (!stored || !currentCodeHash) return false;
  return stored.toLowerCase() !== currentCodeHash.toLowerCase();
}
