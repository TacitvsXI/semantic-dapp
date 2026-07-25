import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProposalBoard } from './ProposalBoard.js';

afterEach(cleanup);

describe('ProposalBoard', () => {
  it('renders tracked proposals with state and vote status', () => {
    render(
      <ProposalBoard
        items={[
          {
            id: '42',
            state: 1,
            proposer: '0x52908400098527886E0F7030069857D2E4169EE7',
            snapshot: '100',
            deadline: '200',
            hasVoted: true,
          },
        ]}
      />,
    );
    expect(screen.getByText('#42')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('✓ voted')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('200')).toBeTruthy();
  });

  it('adds a numeric proposal id and ignores junk', () => {
    const onAdd = vi.fn();
    render(<ProposalBoard items={[]} onAdd={onAdd} />);
    fireEvent.change(screen.getByPlaceholderText('proposal id'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Track' }));
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('proposal id'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Track' }));
    expect(onAdd).toHaveBeenCalledWith('7');
  });
});
