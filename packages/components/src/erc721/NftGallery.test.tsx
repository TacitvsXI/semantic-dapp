import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NftGallery } from './NftGallery.js';

afterEach(cleanup);

describe('NftGallery', () => {
  it('renders token cards with name and owner', () => {
    render(
      <NftGallery
        items={[
          {
            id: '1',
            name: 'Cool #1',
            image: 'https://x/1.png',
            owner: '0x52908400098527886E0F7030069857D2E4169EE7',
          },
        ]}
      />,
    );
    expect(screen.getByText('Cool #1')).toBeTruthy();
    expect(screen.getByAltText('Cool #1')).toBeTruthy();
    expect(screen.getByText(/Owner/)).toBeTruthy();
  });

  it('shows a placeholder and an empty hint', () => {
    render(<NftGallery items={[]} emptyHint="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('accepts a numeric token id to inspect', () => {
    const onAdd = vi.fn();
    render(<NftGallery items={[]} onAdd={onAdd} />);
    fireEvent.change(screen.getByPlaceholderText('token id'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    expect(onAdd).toHaveBeenCalledWith('7');
  });

  it('ignores a non-numeric token id', () => {
    const onAdd = vi.fn();
    render(<NftGallery items={[]} onAdd={onAdd} />);
    fireEvent.change(screen.getByPlaceholderText('token id'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Inspect' }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  const OWNER = '0x52908400098527886E0F7030069857D2E4169EE7';

  it('offers transfer only for tokens owned by the connected account', () => {
    render(
      <NftGallery
        items={[
          { id: '1', owner: OWNER },
          { id: '2', owner: '0x0000000000000000000000000000000000000001' },
        ]}
        connectedAddress={OWNER}
        onTransfer={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Transfer' })).toHaveLength(1);
  });

  it('validates the recipient before transferring', () => {
    const onTransfer = vi.fn();
    render(
      <NftGallery
        items={[{ id: '1', owner: OWNER }]}
        connectedAddress={OWNER}
        onTransfer={onTransfer}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));
    fireEvent.change(screen.getByPlaceholderText('recipient 0x…'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onTransfer).not.toHaveBeenCalled();
    expect(screen.getByText('Invalid recipient.')).toBeTruthy();

    const recipient = '0x0000000000000000000000000000000000000abc';
    fireEvent.change(screen.getByPlaceholderText('recipient 0x…'), {
      target: { value: recipient },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onTransfer).toHaveBeenCalledTimes(1);
    expect(onTransfer.mock.calls[0][0]).toBe('1');
  });
});
