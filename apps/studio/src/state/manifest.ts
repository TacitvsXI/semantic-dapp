import type { ContractModel, SemanticManifest } from '@semantic-dapp/spec';
import { buildManifest, mergeReviewed } from '@semantic-dapp/classifier';
import type { Project } from './project.js';

export const CONTRACT_ID = 'contract';

type AbiSource = SemanticManifest['contracts'][number]['abiSource'];

function abiSourceFor(project: Project): AbiSource {
  switch (project.provenance?.source) {
    case 'sourcify':
      return 'sourcify';
    case 'block-explorer':
      return 'explorer';
    default:
      return 'manual';
  }
}

/**
 * Analyze + classify a project's contract into a full semantic manifest
 * (standards detection + operation routing). Deterministic; no network calls.
 * When a previous manifest exists, human-reviewed edits are preserved.
 */
export function computeManifest(project: Project, model: ContractModel): SemanticManifest {
  const fresh = buildManifest(model, {
    projectName: project.name,
    contractId: CONTRACT_ID,
    chainId: project.contract.chainId,
    abiSource: abiSourceFor(project),
    ...(project.contract.address ? { address: project.contract.address } : {}),
    ...(project.contract.name ? { contractName: project.contract.name } : {}),
    ...(project.proxy?.implementation
      ? { implementationAddress: project.proxy.implementation }
      : {}),
    ...(project.codeHash ? { implementationCodeHash: project.codeHash } : {}),
  });

  return project.manifest ? mergeReviewed(project.manifest, fresh) : fresh;
}
