import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PausePanel } from './PausePanel.js';

afterEach(cleanup);

describe('PausePanel', () => {
  it('shows the active status and fires pause', () => {
    let paused = false;
    render(
      <PausePanel
        paused={false}
        canPause
        canUnpause
        onPause={() => {
          paused = true;
        }}
      />,
    );
    expect(screen.getByTestId('pause-status').textContent).toBe('Active');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(paused).toBe(true);
  });

  it('disables pause when already paused', () => {
    render(<PausePanel paused canPause canUnpause />);
    expect(screen.getByTestId('pause-status').textContent).toBe('Paused');
    const pauseBtn = screen.getByRole('button', { name: 'Pause' }) as HTMLButtonElement;
    expect(pauseBtn.disabled).toBe(true);
  });

  it('reports unknown state', () => {
    render(<PausePanel canPause />);
    expect(screen.getByTestId('pause-status').textContent).toBe('Unknown');
  });
});
