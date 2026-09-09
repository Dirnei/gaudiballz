import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./identity', () => ({
  API: '',
}));

const { ActivityFeed } = await import('./ActivityFeed');

describe('ActivityFeed', () => {
  it('renders feed entries when fetch succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { username: 'Alice', eventType: 'level_clear', detail: 'cleared Level 10', timestamp: new Date().toISOString() },
        { username: 'Bob', eventType: 'achievement', detail: 'earned Speed Demon', timestamp: new Date().toISOString() },
      ],
    } as Response);

    render(<ActivityFeed />);

    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.getByText(/cleared Level 10/)).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('renders nothing when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    const { container } = render(<ActivityFeed />);
    await vi.waitFor(() => {});
    expect(container.innerHTML).toBe('');
  });
});
