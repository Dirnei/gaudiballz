import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { LeaveAttemptPrompt } from './LeaveAttemptPrompt';

/**
 * Renders the prompt on a route with somewhere to navigate to, because blocking a
 * navigation is the only thing it does and a router is the only thing that can offer one.
 */
function renderAt(active: boolean, onLeave = vi.fn()) {
  const router = createMemoryRouter(
    [
      {
        path: '/play',
        element: (
          <>
            <LeaveAttemptPrompt active={active} onLeave={onLeave} />
            <Link to="/">Home</Link>
          </>
        ),
      },
      { path: '/', element: <p>Menu</p> },
    ],
    { initialEntries: ['/play'] },
  );

  render(<RouterProvider router={router} />);
  return { router, onLeave };
}

describe('LeaveAttemptPrompt', () => {
  it('asks before leaving an unfinished attempt', () => {
    renderAt(true);

    fireEvent.click(screen.getByText('Home'));

    expect(screen.getByText('Leave this level?')).toBeTruthy();
  });

  it('does not end the attempt until the player confirms', () => {
    const { onLeave } = renderAt(true);

    fireEvent.click(screen.getByText('Home'));

    expect(screen.getByText('Leave this level?')).toBeTruthy();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('reports the loss and navigates on confirm', async () => {
    const { router, onLeave } = renderAt(true);

    fireEvent.click(screen.getByText('Home'));
    fireEvent.click(screen.getByText('Leave anyway'));

    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Menu')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/');
  });

  it('reports nothing and stays put on cancel', () => {
    const { router, onLeave } = renderAt(true);

    fireEvent.click(screen.getByText('Home'));
    fireEvent.click(screen.getByText('Keep playing'));

    expect(onLeave).not.toHaveBeenCalled();
    expect(screen.queryByText('Leave this level?')).toBeNull();
    expect(router.state.location.pathname).toBe('/play');
  });

  it('lets an untouched level go without asking', async () => {
    // Opening a board and backing out costs nothing, so no attempt is at stake yet and
    // there is nothing to warn about.
    const { onLeave } = renderAt(false);

    fireEvent.click(screen.getByText('Home'));

    expect(screen.queryByText('Leave this level?')).toBeNull();
    expect(onLeave).not.toHaveBeenCalled();
    expect(await screen.findByText('Menu')).toBeTruthy();
  });

  it('lets a finished level go without asking', async () => {
    // Solving the level closes the attempt, so there is nothing left to warn about.
    const { onLeave } = renderAt(false);

    fireEvent.click(screen.getByText('Home'));

    expect(screen.queryByText('Leave this level?')).toBeNull();
    expect(onLeave).not.toHaveBeenCalled();
    expect(await screen.findByText('Menu')).toBeTruthy();
  });

  it('reports the loss by beacon when the tab is closing', () => {
    const { onLeave } = renderAt(true);

    window.dispatchEvent(new Event('beforeunload', { cancelable: true }));

    expect(onLeave).toHaveBeenCalledWith({ beacon: true });
  });

  it('stops listening for the tab closing once the attempt ends', () => {
    const { onLeave } = renderAt(false);

    window.dispatchEvent(new Event('beforeunload', { cancelable: true }));

    expect(onLeave).not.toHaveBeenCalled();
  });
});
