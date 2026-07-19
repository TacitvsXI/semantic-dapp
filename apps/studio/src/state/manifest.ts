import type { ContractModel, SemanticManifest } from '@semantic-dapp/spec';
import { buildManifest } from '@semantic-dapp/classifier';
import type { Project } from './project.js';

export const CONTRACT_ID = 'contract';

/**
 * Analyze + classify a project's contract into a full semantic manifest
 * (standards detection + operation routing). Deterministic; no network calls.
 */
export function computeManifest(project: Project, model: ContractModel): SemanticManifest {
  return buildManifest(model, {
    projectName: project.name,
    contractId: CONTRACT_ID,
    chainId: project.contract.chainId,
    ...(project.contract.address ? { address: project.contract.address } : {}),
    ...(project.contract.name ? { contractName: project.contract.name } : {}),
    abiSource: 'manual',
  });
}
