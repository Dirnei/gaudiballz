import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../changelog/entries', () => ({
  CHANGELOG: [7, 6, 5, 4, 3, 2, 1].map((minor) => ({
    version: `0.${minor}.0`,
    date: '2026-10-01',
    features: [`Feature in 0.${minor}`],
    fixes: [],
  })),
}));

const { SEEN_KEY, unseenEntries } = await import('../changelog/seen');
const { WhatsNewDialog } = await import('./WhatsNewDialog');

function renderAt(path = '/') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <WhatsNewDialog /> },
      { path: '/changelog', element: <h1>Changelog page</h1> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const dialog = () => screen.queryByRole('dialog', { name: "What's new since your last visit" });

beforeEach(() => localStorage.setItem(SEEN_KEY, '0.4.0'));

describe('WhatsNewDialog', () => {
  it('lists only the unseen entries, newest first', () => {
    renderAt();

    expect(dialog()).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Feature in 0.7',
      'Feature in 0.6',
      'Feature in 0.5',
    ]);
    expect(screen.queryByText('Feature in 0.4')).not.toBeInTheDocument();
  });

  it('shows at most five entries and leaves the rest to the full page', () => {
    localStorage.setItem(SEEN_KEY, '0.0.0');
    renderAt();

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'See all changes' })).toBeInTheDocument();
  });

  it('moves focus into the dialog', () => {
    renderAt();

    expect(dialog()).toContainElement(document.activeElement as HTMLElement);
  });

  it.each([
    ['Got it', () => fireEvent.click(screen.getByRole('button', { name: 'Got it' }))],
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['the backdrop', () => fireEvent.click(screen.getByTestId('whats-new-backdrop'))],
  ])('closes and marks everything seen via %s', async (_, close) => {
    renderAt();

    close();

    await waitFor(() => expect(dialog()).not.toBeInTheDocument());
    expect(unseenEntries()).toEqual([]);
  });

  it('stays open when the panel itself is clicked', () => {
    renderAt();

    fireEvent.click(screen.getByText('Feature in 0.7'));

    expect(dialog()).toBeInTheDocument();
  });

  it('opens the full page from its link and closes', async () => {
    const router = renderAt();

    fireEvent.click(screen.getByRole('link', { name: 'See all changes' }));

    expect(await screen.findByText('Changelog page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/changelog');
    expect(dialog()).not.toBeInTheDocument();
    expect(unseenEntries()).toEqual([]);
  });

  it('renders nothing when everything has been seen', () => {
    localStorage.setItem(SEEN_KEY, '0.7.0');
    renderAt();

    expect(dialog()).not.toBeInTheDocument();
  });
});
