import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PermissionBadge } from './Badges.js';

describe('PermissionBadge', () => {
  afterEach(cleanup);

  it('renders "owner only" for an ownable permission with the detail as tooltip', () => {
    render(<PermissionBadge permission={{ kind: 'ownable' }} detail="restricted to owner" />);
    const badge = screen.getByText(/owner only/);
    expect(badge.getAttribute('title')).toBe('restricted to owner');
  });

  it('renders the role for access-control gating', () => {
    render(<PermissionBadge permission={{ kind: 'access-control', role: 'MINTER_ROLE' }} />);
    expect(screen.getByText(/role: MINTER_ROLE/)).toBeTruthy();
  });

  it('renders "restricted" for a custom permission', () => {
    render(<PermissionBadge permission={{ kind: 'custom' }} />);
    expect(screen.getByText(/restricted/)).toBeTruthy();
  });

  it('renders nothing for kind none', () => {
    const { container } = render(<PermissionBadge permission={{ kind: 'none' }} />);
    expect(container.firstChild).toBeNull();
  });
});
