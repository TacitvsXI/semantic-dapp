import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog.js';

afterEach(cleanup);

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="X" onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('confirms a non-critical action immediately', () => {
    let confirmed = false;
    render(
      <ConfirmDialog
        open
        title="Grant role"
        risk="high"
        signature="grantRole(bytes32,address)"
        onConfirm={() => {
          confirmed = true;
        }}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId('confirm-signature').textContent).toContain('grantRole');
    fireEvent.click(screen.getByTestId('confirm-proceed'));
    expect(confirmed).toBe(true);
  });

  it('blocks a critical action until CONFIRM is typed', () => {
    let confirmed = false;
    render(
      <ConfirmDialog
        open
        title="Upgrade"
        risk="critical"
        onConfirm={() => {
          confirmed = true;
        }}
        onCancel={() => {}}
      />,
    );
    const proceed = screen.getByTestId('confirm-proceed') as HTMLButtonElement;
    expect(proceed.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Type CONFIRM to proceed'), {
      target: { value: 'CONFIRM' },
    });
    expect(proceed.disabled).toBe(false);
    fireEvent.click(proceed);
    expect(confirmed).toBe(true);
  });

  it('cancels via the backdrop', () => {
    let cancelled = false;
    const { container } = render(
      <ConfirmDialog
        open
        title="X"
        onConfirm={() => {}}
        onCancel={() => {
          cancelled = true;
        }}
      />,
    );
    fireEvent.click(container.querySelector('.sd-modal')!);
    expect(cancelled).toBe(true);
  });
});
