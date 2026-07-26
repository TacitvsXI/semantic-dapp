import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { WritePreview } from '@semantic-dapp/execution';
import { WritePreviewView } from './WritePreviewView.js';

afterEach(cleanup);

const CALLDATA =
  '0xa9059cbb0000000000000000000000002222222222222222222222222222222222222222' +
  '0000000000000000000000000000000000000000000000000000000000000005';

const okPreview: WritePreview = {
  to: '0x1111111111111111111111111111111111111111',
  functionName: 'transfer',
  calldata: CALLDATA as `0x${string}`,
  gasEstimate: 21000n,
  success: true,
};

describe('WritePreviewView', () => {
  it('shows a passing dry-run with target, gas and calldata', () => {
    render(<WritePreviewView preview={okPreview} argSummary={['to: 0x2222…2222', 'amount: 5']} />);
    expect(screen.getByText(/would succeed/i)).toBeTruthy();
    expect(screen.getByText('transfer')).toBeTruthy();
    expect(screen.getByText('21000')).toBeTruthy();
    expect(screen.getByText('to: 0x2222…2222')).toBeTruthy();
    // Calldata is truncated but the full value is copyable via the button title.
    expect(screen.getByTitle(CALLDATA)).toBeTruthy();
  });

  it('surfaces the decoded revert reason on a failing dry-run', () => {
    const failPreview: WritePreview = {
      to: '0x1111111111111111111111111111111111111111',
      functionName: 'burn',
      calldata: '0x42966c68' as `0x${string}`,
      success: false,
      error: {
        kind: 'revert',
        title: 'Transaction reverted',
        detail: 'ERC20: burn exceeds balance',
      },
    };
    render(<WritePreviewView preview={failPreview} />);
    expect(screen.getByText(/would revert/i)).toBeTruthy();
    expect(screen.getByText(/burn exceeds balance/i)).toBeTruthy();
  });
});
