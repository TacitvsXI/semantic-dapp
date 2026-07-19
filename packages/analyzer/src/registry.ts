import type { ContractModel } from '@semantic-dapp/spec';
import type { ResolvedSemantic, StandardDetection, StandardDetector } from './types.js';
import { erc20Detector } from './erc20.js';
import { erc721Detector, erc1155Detector, erc4626Detector } from './standards.js';
import {
  ownableDetector,
  accessControlDetector,
  pausableDetector,
  upgradeableDetector,
} from './capabilities.js';

/**
 * All detectors, in priority order. When two standards define a semantic for the
 * same signature, the earlier detector wins (first-wins in `resolveSemantics`).
 */
export const ALL_DETECTORS: StandardDetector[] = [
  erc20Detector,
  erc721Detector,
  erc1155Detector,
  erc4626Detector,
  ownableDetector,
  accessControlDetector,
  pausableDetector,
  upgradeableDetector,
];

/** Run every detector and return their raw detections. */
export function detectStandards(model: ContractModel): StandardDetection[] {
  return ALL_DETECTORS.map((d) => d.detect(model));
}

export interface ResolvedStandards {
  detections: StandardDetection[];
  /** Ids of standards that were positively detected. */
  detected: string[];
  /** Signature → semantic (with provenance) from all detected standards. */
  semantics: Map<string, ResolvedSemantic>;
}

/**
 * Detect all standards and merge the semantics of the *detected* ones into a
 * single signature lookup. First-wins priority (see `ALL_DETECTORS` order) so
 * higher-priority standards keep ownership of shared signatures.
 */
export function resolveSemantics(model: ContractModel): ResolvedStandards {
  const detections: StandardDetection[] = [];
  const detected: string[] = [];
  const semantics = new Map<string, ResolvedSemantic>();

  for (const detector of ALL_DETECTORS) {
    const detection = detector.detect(model);
    detections.push(detection);
    if (!detection.detected) continue;
    detected.push(detector.id);
    for (const [signature, semantic] of Object.entries(detector.semantics)) {
      if (semantics.has(signature)) continue; // first-wins
      semantics.set(signature, {
        semantic,
        standard: detector.id,
        confidence: detection.confidence,
      });
    }
  }

  return { detections, detected, semantics };
}
