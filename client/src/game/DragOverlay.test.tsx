import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const { DragOverlay } = await import('./DragOverlay');

describe('DragOverlay', () => {
  it('renders balls matching the provided colours', () => {
    const { container } = render(<DragOverlay colours={[1, 1]} position={{ x: 200, y: 300 }} />);
    const balls = container.querySelectorAll('[style*="border-radius: 9999px"]');
    expect(balls).toHaveLength(2);
  });

  it('renders nothing when colours is empty', () => {
    const { container } = render(<DragOverlay colours={[]} position={{ x: 0, y: 0 }} />);
    expect(container.innerHTML).toBe('');
  });

  it('positions at the given coordinates', () => {
    const { container } = render(<DragOverlay colours={[1]} position={{ x: 150, y: 250 }} />);
    const overlay = container.firstElementChild as HTMLElement;
    expect(overlay.style.left).toBe('150px');
    expect(overlay.style.top).toBe('250px');
  });
});

describe('Tube dropTarget prop', () => {
  it('applies a glow when dropTarget is true', async () => {
    const { Tube } = await import('./Tube');
    const { container } = render(
      <Tube items={[1, 2]} capacity={3} selected={false} focused={false} complete={false} dropTarget={true} onTap={() => {}} />,
    );
    const tubeBody = container.querySelector('[style*="box-shadow"]') as HTMLElement;
    expect(tubeBody?.style.boxShadow).toContain('rgba(56,189,248');
  });

  it('does not apply glow when dropTarget is false', async () => {
    const { Tube } = await import('./Tube');
    const { container } = render(
      <Tube items={[1, 2]} capacity={3} selected={false} focused={false} complete={false} dropTarget={false} onTap={() => {}} />,
    );
    const tubeBody = container.querySelector('[style*="box-shadow"]') as HTMLElement;
    expect(tubeBody?.style.boxShadow).not.toContain('rgba(56,189,248');
  });
});
