import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { MotionConfigContext } from 'motion/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from './App';

function Probe() {
  const { reducedMotion } = useContext(MotionConfigContext);
  return <p>reducedMotion={reducedMotion}</p>;
}

/** The real route tree with a probe mounted where every screen is mounted. */
function withProbe(tree: RouteObject[]): RouteObject[] {
  expect(tree).toHaveLength(1);
  const [root] = tree;
  const children: RouteObject[] = [...(root.children ?? []), { path: 'probe', element: <Probe /> }];
  return [{ ...root, children } as RouteObject];
}

describe('reduced motion', () => {
  it('has every screen follow the system setting', () => {
    const router = createMemoryRouter(withProbe(routes), { initialEntries: ['/probe'] });

    render(<RouterProvider router={router} />);

    expect(screen.getByText('reducedMotion=user')).toBeInTheDocument();
  });

  it('puts every route, the play screen included, under that one root', () => {
    const [root] = routes;
    const paths = JSON.stringify(root.children, (key, value) => (key === 'element' || key === 'errorElement' ? undefined : value));

    for (const path of ['levels', 'play', 'daily', 'tutorial', 'r/:id', '*']) {
      expect(paths).toContain(`"path":"${path}"`);
    }
  });
});
