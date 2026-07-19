import type { Audience, Evidence, OperationType, RiskLevel } from '@semantic-dapp/spec';

/** Result of running a single standard detector against a contract model. */
export interface StandardDetection {
  /** Standard identifier, e.g. `erc-20`. */
  standard: string;
  detected: boolean;
  confidence: number;
  evidence: Evidence[];
  /** Signatures of matched functions/events that support the detection. */
  matched: string[];
  /** Expected members that were not found. */
  missing: string[];
}

/** Canonical semantic meaning of a known function signature. */
export interface FunctionSemantic {
  operationType: OperationType;
  audience: Audience;
  title: string;
  description?: string;
  isRead: boolean;
  risk?: RiskLevel;
}
