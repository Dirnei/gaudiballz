import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tube } from './Tube';
import { TUBE_STYLE } from '../skins';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

function tubeBody(): HTMLElement {
  return screen.getByRole('button').querySelector('.flex.flex-col-reverse')!;
}

const BASE = { items: [1, 2], capacity: 3, selected: false, focused: false, complete: false, onTap: () => {} };

describe('Tube dropHover styling', () => {
  it('dropHover applies intensified highlight distinct from dropTarget', () => {
    const { rerender } = render(<Tube {...BASE} dropTarget dropHover={false} />);
    const targetShadow = tubeBody().style.boxShadow;
    expect(targetShadow).toContain('0 0 0 2px rgba(56,189,248,0.6)');

    rerender(<Tube {...BASE} dropTarget dropHover />);
    const hoverShadow = tubeBody().style.boxShadow;
    expect(hoverShadow).toContain('0 0 0 3px rgba(74,222,128,0.85)');
    expect(hoverShadow).toContain('0 0 24px rgba(74,222,128,0.4)');
    expect(hoverShadow).not.toEqual(targetShadow);
  });

  it('no dropHover shows standard dropTarget highlight', () => {
    render(<Tube {...BASE} dropTarget />);
    const shadow = tubeBody().style.boxShadow;
    expect(shadow).toContain('0 0 0 2px rgba(56,189,248,0.6)');
    expect(shadow).not.toContain('0 0 0 3px');
  });

  it('neither dropTarget nor dropHover shows no ring', () => {
    render(<Tube {...BASE} />);
    const shadow = tubeBody().style.boxShadow;
    expect(shadow).toBe(TUBE_STYLE.boxShadow);
  });
});
