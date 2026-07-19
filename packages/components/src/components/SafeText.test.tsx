import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SafeText } from './SafeText.js';

afterEach(cleanup);

describe('SafeText', () => {
  it('renders clean text without a warning marker', () => {
    const { container } = render(<SafeText value="Wrapped Ether" />);
    expect(container.textContent).toBe('Wrapped Ether');
    expect(container.querySelector('.sd-safe-warn')).toBeNull();
  });

  it('flags a bidi-spoofed string and strips the character', () => {
    const { container } = render(<SafeText value={'good\u202Eevil'} />);
    expect(container.textContent).toContain('goodevil');
    expect(container.querySelector('.sd-safe-warn')).not.toBeNull();
  });

  it('uses the fallback for empty values', () => {
    render(<SafeText value="" fallback="Token" />);
    expect(screen.getByText('Token')).toBeTruthy();
  });
});
