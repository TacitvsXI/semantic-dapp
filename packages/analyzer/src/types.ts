import type {
  ContractModel,
  Audience,
  Evidence,
  OperationType,
  RiskLevel,
} from '@semantic-dapp/spec';

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

/** A pluggable detector for one standard or capability. */
export interface StandardDetector {
  id: string;
  detect(model: ContractModel): StandardDetection;
  /** Signature → canonical semantic for this standard's known functions. */
  semantics: Record<string, FunctionSemantic>;
}

/** A semantic resolved from a detected standard, with its provenance. */
export interface ResolvedSemantic {
  semantic: FunctionSemantic;
  /** Standard id the semantic came from. */
  standard: string;
  /** Detection confidence of that standard. */
  confidence: number;
}

/** On-chain access model gating privileged operations. */
export type AccessModelKind = 'ownable' | 'access-control' | 'none';

export interface AccessModel {
  kind: AccessModelKind;
  evidence: Evidence[];
}
