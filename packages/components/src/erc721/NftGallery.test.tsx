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
});
