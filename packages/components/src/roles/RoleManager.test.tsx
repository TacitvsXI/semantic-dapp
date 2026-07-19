import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { keccak256, toBytes } from 'viem';
import { RoleManager } from './RoleManager.js';

afterEach(cleanup);

const ADDR = '0x52908400098527886e0f7030069857d2e4169ee7';
const ROLE = `0x${'ab'.repeat(32)}`;

describe('RoleManager', () => {
  it('grants a bytes32 role to an account', () => {
    let call: { role: string; account: string } | undefined;
    render(<RoleManager canGrant onGrant={(role, account) => (call = { role, account })} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, { target: { value: ROLE } });
    fireEvent.change(inputs[1]!, { target: { value: ADDR } });
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    expect(call?.role).toBe(ROLE);
    expect(call?.account.toLowerCase()).toBe(ADDR);
  });

  it('rejects an invalid role', () => {
    let called = false;
    render(<RoleManager canGrant onGrant={() => (called = true)} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, { target: { value: 'not-a-role' } });
    fireEvent.change(inputs[1]!, { target: { value: ADDR } });
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    expect(called).toBe(false);
    expect(screen.getByText(/32-byte hex/)).toBeTruthy();
  });

  it('hashes a role name when enabled', () => {
    let call: { role: string; account: string } | undefined;
    render(<RoleManager canGrant onGrant={(role, account) => (call = { role, account })} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, { target: { value: 'MINTER_ROLE' } });
    fireEvent.click(screen.getByLabelText(/Hash name with keccak256/));
    fireEvent.change(inputs[1]!, { target: { value: ADDR } });
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    expect(call?.role).toBe(keccak256(toBytes('MINTER_ROLE')));
  });

  it('grants a role picked by name from the discovered roles dropdown', () => {
    let call: { role: string; account: string } | undefined;
    render(
      <RoleManager
        canGrant
        roles={[{ name: 'MINTER_ROLE', value: ROLE }]}
        onGrant={(role, account) => (call = { role, account })}
      />,
    );
    // Role is a dropdown now, so the only textbox is the account.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ADDR } });
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    expect(call?.role).toBe(ROLE);
    expect(call?.account.toLowerCase()).toBe(ADDR);
  });

  it('falls back to manual entry when "Custom…" is selected', () => {
    render(
      <RoleManager canGrant roles={[{ name: 'MINTER_ROLE', value: ROLE }]} onGrant={() => {}} />,
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__custom__' } });
    // A custom role textbox appears alongside the account field.
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });

  it('applies the DEFAULT_ADMIN_ROLE preset', () => {
    let call: { role: string } | undefined;
    render(<RoleManager canRevoke onRevoke={(role) => (call = { role })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use DEFAULT_ADMIN_ROLE' }));
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[1]!, { target: { value: ADDR } });
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(call?.role).toBe(`0x${'00'.repeat(32)}`);
  });
});
