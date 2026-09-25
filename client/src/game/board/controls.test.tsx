import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CooldownSweep } from './controls';

describe('hint cooldown ring', () => {
  it('can be told apart from decoration, so reduced motion keeps it filling over the wait', () => {
    const { container } = render(<CooldownSweep end={Date.now() + 20_000} duration={30_000} />);
    const ring = container.querySelector('circle')!;

    expect(ring).toHaveClass('cooldown-ring');
    expect(ring.style.getPropertyValue('--cooldown-duration')).toBe('30000ms');
  });
});
