import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi, type SemanticManifest, type OperationDefinition } from '@semantic-dapp/spec';
import { buildSections, groupOperations, type OperationView } from './sections.js';

const abi = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'pause',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'secretKnob',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const satisfies Abi;

const model = normalizeAbi(abi as unknown as Abi);

const manifest: SemanticManifest = {
  version: 1,
  project: { name: 'Token' },
  contracts: [{ id: 'token', abiSource: 'manual', standards: ['erc-20'] }],
  operations: [
    {
      id: 'token.transfer',
      contract: 'token',
      function: 'transfer(address,uint256)',
      title: 'Transfer',
      audience: 'user',
      operationType: 'token-transfer',
      isRead: false,
      confidence: 0.95,
      evidence: [],
      inputs: [],
      visibility: 'visible',
      reviewed: false,
    },
    {
      id: 'token.pause',
      contract: 'token',
      function: 'pause()',
      title: 'Pause',
      audience: 'emergency',
      operationType: 'pause',
      isRead: false,
      confidence: 0.9,
      evidence: [],
      inputs: [],
      visibility: 'visible',
      reviewed: false,
    },
    {
      id: 'token.totalSupply',
      contract: 'token',
      function: 'totalSupply()',
      title: 'Total supply',
      audience: 'user',
      operationType: 'read',
      isRead: true,
      confidence: 0.99,
      evidence: [],
      inputs: [],
      visibility: 'visible',
      reviewed: false,
    },
    {
      id: 'token.secretKnob',
      contract: 'token',
      function: 'secretKnob()',
      title: 'Secret knob',
      audience: 'developer',
      operationType: 'unknown',
      isRead: false,
      confidence: 0.2,
      evidence: [],
      inputs: [],
      visibility: 'raw-only',
      reviewed: false,
    },
  ],
};

describe('buildSections', () => {
  const layout = buildSections(manifest, model);

  it('routes user writes to the User section', () => {
    const user = layout.sections.find((s) => s.id === 'user');
    expect(user?.operations.map((o) => o.operation.title)).toEqual(['Transfer']);
  });

  it('routes emergency ops to the Emergency section', () => {
    expect(layout.sections.find((s) => s.id === 'emergency')?.operations).toHaveLength(1);
  });

  it('routes reads to the Read section', () => {
    expect(layout.sections.find((s) => s.id === 'read')?.operations[0]?.operation.title).toBe(
      'Total supply',
    );
  });

  it('keeps raw-only operations out of semantic sections', () => {
    const inSemantic = layout.sections.some((s) =>
      s.operations.some((o) => o.operation.id === 'token.secretKnob'),
    );
    expect(inSemantic).toBe(false);
  });

  it('always exposes every function in raw (lossless)', () => {
    expect(layout.rawFunctions).toHaveLength(4);
  });

  it('matches operations to their ABI function by signature', () => {
    const user = layout.sections.find((s) => s.id === 'user');
    expect(user?.operations[0]?.func?.selector).toBe('0xa9059cbb');
  });
});

describe('groupOperations', () => {
  const op = (id: string, operationType: OperationDefinition['operationType']): OperationView => ({
    operation: {
      id,
      contract: 'c',
      function: `${id}()`,
      title: id,
      audience: 'admin',
      operationType,
      isRead: false,
      confidence: 0.9,
      evidence: [],
      inputs: [],
      visibility: 'visible',
      reviewed: false,
    },
  });

  it('groups pause/unpause and role-* into panels, leaving the rest', () => {
    const grouped = groupOperations([
      op('pause', 'pause'),
      op('unpause', 'unpause'),
      op('grantRole', 'role-grant'),
      op('revokeRole', 'role-revoke'),
      op('renounceRole', 'role-renounce'),
      op('setFee', 'admin-config'),
    ]);
    expect(grouped.pause).toHaveLength(2);
    expect(grouped.roles).toHaveLength(3);
    expect(grouped.rest.map((v) => v.operation.id)).toEqual(['setFee']);
  });
});
