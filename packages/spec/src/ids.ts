/**
 * Deterministic operation IDs so that manifests are stable and diffable across
 * re-analysis. Based on the contract id and the function signature.
 */
export function operationId(contractId: string, functionSignature: string): string {
  const fnName = functionSignature.split('(')[0] ?? functionSignature;
  const argHash = simpleHash(functionSignature);
  return `${contractId}.${fnName}.${argHash}`;
}

/** Small, stable, non-cryptographic hash for readable deterministic IDs. */
function simpleHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
