import { useEffect, useState } from 'react';

/** Tailwind's `sm`, the width the markup was already reaching for before this was a hook. */
const NARROW_QUERY = '(max-width: 639px)';

/**
 * Whether the viewport is too narrow for a component's roomier layout.
 *
 * The current match is read during initialisation rather than defaulting to false and
 * correcting in an effect, so a phone never paints the wide layout for a frame before
 * swapping. The subscription exists for rotation and for a resized desktop window.
 */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() => matchMediaOr(NARROW_QUERY)?.matches ?? false);

  useEffect(() => {
    const query = matchMediaOr(NARROW_QUERY);
    if (!query) return undefined;

    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    setNarrow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return narrow;
}

/** Absent in non-browser environments, and historically in test ones. */
function matchMediaOr(query: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : null;
}
