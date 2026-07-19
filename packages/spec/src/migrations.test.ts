import { describe, it, expect } from 'vitest';
import { CURRENT_MANIFEST_VERSION, migrateManifest } from './migrations.js';
import type { SemanticManifest } from './manifest.js';

const validManifest: SemanticManifest = {
  version: 1,
  project: { name: 'Demo' },
  contracts: [{ id: 'contract', abiSource: 'manual', standards: [] }],
  operations: [],
};

describe('migrateManifest', () => {
  it('accepts a current-version manifest (identity)', () => {
    const result = migrateManifest(validManifest);
    expect(result.ok).toBe(true);
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(CURRENT_MANIFEST_VERSION);
    expect(result.manifest?.project.name).toBe('Demo');
  });

  it('defaults a missing version to 1', () => {
    const { version: _omit, ...noVersion } = validManifest;
    void _omit;
    const result = migrateManifest(noVersion);
    expect(result.ok).toBe(true);
    expect(result.fromVersion).toBe(1);
  });

  it('rejects a manifest newer than supported', () => {
    const result = migrateManifest({ ...validManifest, version: CURRENT_MANIFEST_VERSION + 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/newer than supported/);
  });

  it('rejects a structurally invalid manifest', () => {
    const result = migrateManifest({ version: 1, project: {}, contracts: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects a non-object input', () => {
    expect(migrateManifest(null).ok).toBe(false);
    expect(migrateManifest([]).ok).toBe(false);
    expect(migrateManifest('nope').ok).toBe(false);
  });
});
