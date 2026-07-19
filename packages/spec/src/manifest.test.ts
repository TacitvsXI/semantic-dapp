import { describe, it, expect } from 'vitest';
import {
  confidenceTier,
  parseManifest,
  safeParseManifest,
  operationId,
  manifestJsonSchema,
  type SemanticManifest,
} from './index.js';

const validManifest: SemanticManifest = {
  version: 1,
  project: { name: 'Example Token' },
  contracts: [
    {
      id: 'token',
      chainId: 1,
      address: '0x1111111111111111111111111111111111111111',
      abiSource: 'manual',
      standards: ['erc-20'],
    },
  ],
  operations: [
    {
      id: 'token.transfer.deadbeef',
      contract: 'token',
      function: 'transfer(address,uint256)',
      title: 'Transfer tokens',
      audience: 'user',
      operationType: 'token-transfer',
      isRead: false,
      confidence: 0.96,
      evidence: [{ source: 'selector', detail: 'ERC-20 transfer selector', weight: 0.45 }],
      inputs: [
        { name: 'to', type: 'address', widget: 'address' },
        { name: 'amount', type: 'uint256', widget: 'token-amount', token: 'self' },
      ],
      visibility: 'visible',
      reviewed: false,
    },
  ],
};

describe('semanticManifestSchema', () => {
  it('parses a valid manifest', () => {
    expect(() => parseManifest(validManifest)).not.toThrow();
  });

  it('rejects a manifest without contracts', () => {
    const result = safeParseManifest({ version: 1, project: { name: 'x' }, contracts: [] });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range confidence', () => {
    const bad = structuredClone(validManifest);
    bad.operations[0]!.confidence = 1.5;
    expect(safeParseManifest(bad).success).toBe(false);
  });

  it('applies defaults for visibility and reviewed', () => {
    const parsed = parseManifest({
      version: 1,
      project: { name: 'x' },
      contracts: [{ id: 'c' }],
      operations: [
        {
          id: 'c.foo.0',
          contract: 'c',
          function: 'foo()',
          title: 'Foo',
          audience: 'developer',
          operationType: 'unknown',
          isRead: true,
          confidence: 0.1,
        },
      ],
    });
    expect(parsed.operations[0]?.visibility).toBe('visible');
    expect(parsed.operations[0]?.reviewed).toBe(false);
  });
});

describe('confidenceTier', () => {
  it('maps scores to tiers per ADR-001', () => {
    expect(confidenceTier(0.95)).toBe('auto');
    expect(confidenceTier(0.8)).toBe('suggested');
    expect(confidenceTier(0.5)).toBe('review');
    expect(confidenceTier(0.2)).toBe('raw-only');
  });
});

describe('operationId', () => {
  it('is deterministic for the same signature', () => {
    expect(operationId('token', 'transfer(address,uint256)')).toBe(
      operationId('token', 'transfer(address,uint256)'),
    );
  });

  it('differs for different signatures', () => {
    expect(operationId('token', 'transfer(address,uint256)')).not.toBe(
      operationId('token', 'approve(address,uint256)'),
    );
  });
});

describe('manifestJsonSchema', () => {
  it('produces a JSON schema object', () => {
    const schema = manifestJsonSchema();
    expect(schema).toBeTypeOf('object');
    expect(JSON.stringify(schema)).toContain('SemanticManifest');
  });
});
