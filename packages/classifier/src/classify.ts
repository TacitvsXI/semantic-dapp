import type { ContractModel, OperationDefinition, SemanticManifest } from '@semantic-dapp/spec';
import {
  resolveSemantics,
  detectAccessModel,
  type SourceDocs,
  type StandardDetection,
} from '@semantic-dapp/analyzer';
import { classifyFunction } from './rules.js';
import { enrichOperations } from './enrich.js';
import { corroborateWithEvents } from './events.js';
import { annotateFeeOnTransfer } from './warnings.js';

export interface ClassificationResult {
  operations: OperationDefinition[];
  standards: string[];
  detections: StandardDetection[];
}

export interface ClassifyOptions {
  /** Parsed NatSpec/modifier docs from verified source, for enrichment. */
  docs?: SourceDocs;
}

/**
 * Run all detectors and classify every function in a contract model into
 * semantic operations via the priority rule engine (ADR-006). Deterministic and
 * network-free. When source docs are supplied, operations are enriched with
 * author NatSpec + modifier-based privilege hints (additive; never demotes).
 */
export function classifyContract(
  model: ContractModel,
  contractId: string,
  options: ClassifyOptions = {},
): ClassificationResult {
  const standards = resolveSemantics(model);
  const access = detectAccessModel(model);

  let operations = model.functions.map((func) =>
    classifyFunction({ func, model, standards, access }, contractId),
  );
  // Corroborate writers with the events they conventionally emit (additive
  // evidence + a small confidence nudge; never changes routing).
  operations = corroborateWithEvents(operations, model.events);
  if (options.docs) operations = enrichOperations(operations, options.docs);
  // Soft advisory when the fee-exclusion admin surface was detected (additive).
  operations = annotateFeeOnTransfer(operations, standards.detected);

  return { operations, standards: standards.detected, detections: standards.detections };
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
  /** Parsed NatSpec/modifier docs from verified source, for enrichment. */
  docs?: SourceDocs;
}

/**
 * Produce a full {@link SemanticManifest} for a contract by classifying it and
 * attaching contract identity + detected standards.
 */
export function buildManifest(
  model: ContractModel,
  options: BuildManifestOptions,
): SemanticManifest {
  const { operations, standards } = classifyContract(model, options.contractId, {
    ...(options.docs ? { docs: options.docs } : {}),
  });
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
