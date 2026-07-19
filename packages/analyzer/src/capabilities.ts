import type { ContractModel } from '@semantic-dapp/spec';
import { detectByMembers, type StandardMember } from './detect.js';
import type { FunctionSemantic, StandardDetection, StandardDetector } from './types.js';

const fn = (signature: string, required = true): StandardMember => ({
  signature,
  kind: 'function',
  required,
});
const ev = (signature: string, required = false): StandardMember => ({
  signature,
  kind: 'event',
  required,
});

/* ------------------------------- Ownable -------------------------------- */

const OWNABLE_SEMANTICS: Record<string, FunctionSemantic> = {
  'owner()': { operationType: 'read', audience: 'user', title: 'Owner', isRead: true },
  'transferOwnership(address)': {
    operationType: 'ownership-transfer',
    audience: 'admin',
    title: 'Transfer ownership',
    description: 'Hand control of the contract to a new owner.',
    isRead: false,
    risk: 'high',
  },
  'renounceOwnership()': {
    operationType: 'ownership-transfer',
    audience: 'admin',
    title: 'Renounce ownership',
    description: 'Permanently give up ownership. Irreversible.',
    isRead: false,
    risk: 'critical',
  },
};

export function detectOwnable(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'ownable',
    members: [
      fn('owner()'),
      fn('transferOwnership(address)'),
      fn('renounceOwnership()', false),
      ev('OwnershipTransferred(address,address)'),
    ],
    coreRequired: ['owner()', 'transferOwnership(address)'],
    threshold: 0.6,
  });
}

export const ownableDetector: StandardDetector = {
  id: 'ownable',
  detect: detectOwnable,
  semantics: OWNABLE_SEMANTICS,
};

/* ---------------------------- AccessControl ----------------------------- */

const ACCESS_CONTROL_SEMANTICS: Record<string, FunctionSemantic> = {
  'hasRole(bytes32,address)': {
    operationType: 'read',
    audience: 'user',
    title: 'Has role',
    isRead: true,
  },
  'getRoleAdmin(bytes32)': {
    operationType: 'read',
    audience: 'user',
    title: 'Role admin',
    isRead: true,
  },
  'grantRole(bytes32,address)': {
    operationType: 'role-grant',
    audience: 'admin',
    title: 'Grant role',
    description: 'Grant a role to an account.',
    isRead: false,
    risk: 'high',
  },
  'revokeRole(bytes32,address)': {
    operationType: 'role-revoke',
    audience: 'admin',
    title: 'Revoke role',
    description: 'Revoke a role from an account.',
    isRead: false,
    risk: 'high',
  },
  'renounceRole(bytes32,address)': {
    operationType: 'role-renounce',
    audience: 'operator',
    title: 'Renounce role',
    description: 'Give up one of your own roles.',
    isRead: false,
    risk: 'medium',
  },
};

export function detectAccessControl(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'access-control',
    members: [
      fn('hasRole(bytes32,address)'),
      fn('getRoleAdmin(bytes32)'),
      fn('grantRole(bytes32,address)'),
      fn('revokeRole(bytes32,address)'),
      fn('renounceRole(bytes32,address)', false),
      ev('RoleGranted(bytes32,address,address)'),
      ev('RoleRevoked(bytes32,address,address)'),
    ],
    coreRequired: [
      'hasRole(bytes32,address)',
      'getRoleAdmin(bytes32)',
      'grantRole(bytes32,address)',
      'revokeRole(bytes32,address)',
    ],
    threshold: 0.6,
  });
}

export const accessControlDetector: StandardDetector = {
  id: 'access-control',
  detect: detectAccessControl,
  semantics: ACCESS_CONTROL_SEMANTICS,
};

/* ------------------------------- Pausable ------------------------------- */

const PAUSABLE_SEMANTICS: Record<string, FunctionSemantic> = {
  'paused()': { operationType: 'read', audience: 'user', title: 'Paused', isRead: true },
  'pause()': {
    operationType: 'pause',
    audience: 'emergency',
    title: 'Pause',
    description: 'Halt state-changing operations.',
    isRead: false,
    risk: 'high',
  },
  'unpause()': {
    operationType: 'unpause',
    audience: 'emergency',
    title: 'Unpause',
    description: 'Resume state-changing operations.',
    isRead: false,
    risk: 'medium',
  },
};

export function detectPausable(model: ContractModel): StandardDetection {
  const fns = new Set(model.functions.map((f) => f.signature));
  const evs = new Set(model.events.map((e) => e.signature));
  const hasPaused = fns.has('paused()');
  const hasToggle = fns.has('pause()') || fns.has('unpause()');
  const matched = [
    'paused()',
    'pause()',
    'unpause()',
    'Paused(address)',
    'Unpaused(address)',
  ].filter((s) => fns.has(s) || evs.has(s));
  const detected = hasPaused && hasToggle;
  return {
    standard: 'pausable',
    detected,
    confidence: detected ? 0.9 : 0,
    evidence: matched.map((sig) => ({ source: 'signature', detail: `pausable: ${sig} present` })),
    matched,
    missing: hasPaused ? [] : ['paused()'],
  };
}

export const pausableDetector: StandardDetector = {
  id: 'pausable',
  detect: detectPausable,
  semantics: PAUSABLE_SEMANTICS,
};

/* ----------------------------- Upgradeable ------------------------------ */

const UPGRADEABLE_SEMANTICS: Record<string, FunctionSemantic> = {
  'upgradeTo(address)': {
    operationType: 'upgrade',
    audience: 'admin',
    title: 'Upgrade implementation',
    description: 'Point the proxy at a new implementation. Irreversible risk.',
    isRead: false,
    risk: 'critical',
  },
  'upgradeToAndCall(address,bytes)': {
    operationType: 'upgrade',
    audience: 'admin',
    title: 'Upgrade & call',
    description: 'Upgrade the implementation and run an initializer.',
    isRead: false,
    risk: 'critical',
  },
  'proxiableUUID()': {
    operationType: 'read',
    audience: 'developer',
    title: 'Proxiable UUID',
    isRead: true,
  },
};

export function detectUpgradeable(model: ContractModel): StandardDetection {
  const fns = new Set(model.functions.map((f) => f.signature));
  const candidates = ['upgradeTo(address)', 'upgradeToAndCall(address,bytes)', 'proxiableUUID()'];
  const matched = candidates.filter((s) => fns.has(s));
  const hasEntrypoint = fns.has('upgradeTo(address)') || fns.has('upgradeToAndCall(address,bytes)');
  return {
    standard: 'upgradeable',
    detected: hasEntrypoint,
    confidence: hasEntrypoint ? 0.85 : matched.length ? 0.4 : 0,
    evidence: matched.map((sig) => ({
      source: 'signature',
      detail: `upgradeable: ${sig} present`,
    })),
    matched,
    missing: hasEntrypoint ? [] : ['upgradeTo(address)|upgradeToAndCall(address,bytes)'],
  };
}

export const upgradeableDetector: StandardDetector = {
  id: 'upgradeable',
  detect: detectUpgradeable,
  semantics: UPGRADEABLE_SEMANTICS,
};
