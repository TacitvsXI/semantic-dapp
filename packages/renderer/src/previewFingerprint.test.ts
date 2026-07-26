import { describe, it, expect } from 'vitest';
import { buildPreviewFingerprint } from './previewFingerprint.js';

describe('buildPreviewFingerprint', () => {
  it('is stable for equivalent inputs and sensitive to drift', () => {
    const base = {
      signature: 'setThing(uint256)',
      args: [1n],
      chainId: 1,
      account: '0xAbc',
      target: '0xDef',
    };
    const a = buildPreviewFingerprint(base);
    const b = buildPreviewFingerprint({ ...base, account: '0xabc' });
    expect(a).toBe(b);

    expect(buildPreviewFingerprint({ ...base, args: [2n] })).not.toBe(a);
    expect(buildPreviewFingerprint({ ...base, chainId: 137 })).not.toBe(a);
    expect(buildPreviewFingerprint({ ...base, target: '0xeee' })).not.toBe(a);
  });
});
