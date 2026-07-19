import type {
  ContractFunction,
  ContractModel,
  OperationDefinition,
  SemanticManifest,
  Audience,
} from '@semantic-dapp/spec';

export type SectionId = 'user' | 'admin' | 'emergency' | 'read' | 'raw';

export interface OperationView {
  operation: OperationDefinition;
  /** The underlying ABI function, matched by signature (may be missing). */
  func?: ContractFunction;
}

export interface GeneratedSection {
  id: SectionId;
  title: string;
  operations: OperationView[];
}

export interface GeneratedLayout {
  sections: GeneratedSection[];
  /** Every ABI function, always available losslessly in the Raw tab. */
  rawFunctions: ContractFunction[];
}

/** Operations grouped for specialized console panels (ADR-007). */
export interface GroupedOperations {
  /** `pause` / `unpause` operations → one PausePanel. */
  pause: OperationView[];
  /** `role-*` operations → one RoleManager. */
  roles: OperationView[];
  /** Everything else → individual OperationCards. */
  rest: OperationView[];
}

/**
 * Partition a section's operations into console groups (pause, roles) and the
 * remaining individual operations, so the renderer can show one grouped panel
 * instead of many identical forms.
 */
export function groupOperations(operations: OperationView[]): GroupedOperations {
  const pause: OperationView[] = [];
  const roles: OperationView[] = [];
  const rest: OperationView[] = [];
  for (const view of operations) {
    const type = view.operation.operationType;
    if (type === 'pause' || type === 'unpause') pause.push(view);
    else if (type.startsWith('role-')) roles.push(view);
    else rest.push(view);
  }
  return { pause, roles, rest };
}

const SECTION_TITLES: Record<SectionId, string> = {
  user: 'User',
  admin: 'Admin',
  emergency: 'Emergency',
  read: 'Read',
  raw: 'Raw',
};

function sectionForOperation(op: OperationDefinition): SectionId {
  if (op.visibility === 'raw-only') return 'raw';
  if (op.isRead) return 'read';
  const byAudience: Record<Audience, SectionId> = {
    user: 'user',
    operator: 'admin',
    admin: 'admin',
    emergency: 'emergency',
    developer: 'raw',
  };
  return byAudience[op.audience];
}

/**
 * Organize a manifest + contract model into ordered UI sections. Semantic
 * operations populate User/Admin/Emergency/Read; the Raw section always lists
 * every ABI function so nothing is lost (ADR-001).
 */
export function buildSections(
  manifest: SemanticManifest,
  model: ContractModel,
  contractId?: string,
): GeneratedLayout {
  const bySignature = new Map<string, ContractFunction>();
  for (const fn of model.functions) bySignature.set(fn.signature, fn);

  const buckets: Record<Exclude<SectionId, 'raw'>, OperationView[]> = {
    user: [],
    admin: [],
    emergency: [],
    read: [],
  };

  const operations = contractId
    ? manifest.operations.filter((op) => op.contract === contractId)
    : manifest.operations;

  for (const operation of operations) {
    const target = sectionForOperation(operation);
    if (target === 'raw') continue;
    buckets[target].push({ operation, func: bySignature.get(operation.function) });
  }

  const order: Exclude<SectionId, 'raw'>[] = ['user', 'admin', 'emergency', 'read'];
  const sections: GeneratedSection[] = order
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({ id, title: SECTION_TITLES[id], operations: buckets[id] }));

  return {
    sections,
    rawFunctions: model.functions,
  };
}
