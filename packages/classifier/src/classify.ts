import type { ContractModel, OperationDefinition, SemanticManifest } from '@semantic-dapp/spec';
import {
  resolveSemantics,
  detectAccessModel,
  type StandardDetection,
} from '@semantic-dapp/analyzer';
import { classifyFunction } from './rules.js';

export interface ClassificationResult {
  operations: OperationDefinition[];
  standards: string[];
  detections: StandardDetection[];
}

/**
 * Run all detectors and classify every function in a contract model into
 * semantic operations. Deterministic and network-free.
 */
export function classifyContract(model: ContractModel, contractId: string): ClassificationResult {
  const { detections, detected, semantics } = resolveSemantics(model);
  const access = detectAccessModel(model);

  const operations = model.functions.map((func) =>
    classifyFunction(func, contractId, semantics.get(func.signature), access),
  );

  return { operations, standards: detected, detections };
}

export interface BuildManifestOptions {
  projectName: string;
  contractId: string;
  chainId?: number;
  address?: string;
  contractName?: string;
  abiSource?: SemanticManifest['contracts'][number]['abiSource'];
  implementationAddress?: string;
  implementationCodeHash?: string;
}

/**
 * Produce a full {@link SemanticManifest} for a contract by classifying it and
 * attaching contract identity + detected standards.
 */
export function buildManifest(
  model: ContractModel,
  options: BuildManifestOptions,
): SemanticManifest {
  const { operations, standards } = classifyContract(model, options.contractId);
  return {
    version: 1,
    project: { name: options.projectName },
    contracts: [
      {
        id: options.contractId,
        ...(options.chainId !== undefined ? { chainId: options.chainId } : {}),
        ...(options.address ? { address: options.address } : {}),
        ...(options.contractName ? { name: options.contractName } : {}),
        ...(options.implementationAddress
          ? { implementationAddress: options.implementationAddress }
          : {}),
        ...(options.implementationCodeHash
          ? { implementationCodeHash: options.implementationCodeHash }
          : {}),
        abiSource: options.abiSource ?? 'manual',
        standards,
      },
    ],
    operations,
  };
}
