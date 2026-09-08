import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  availableColours,
  ballForAccount,
  isEarned,
  loadBallUnlocks,
  resetBallUnlocksCache,
  setProfileBall,
  type BallUnlock,
} from './profileBall';
import { colourForName } from '../skins';

/** The real campaign curve, as the server reports it. */
const UNLOCKS: readonly BallUnlock[] = [
  { colour: 1, unlocksAtLevel: 1 },
  { colour: 2, unlocksAtLevel: 1 },
  { colour: 3, unlocksAtLevel: 1 },
  { colour: 4, unlocksAtLevel: 6 },
  { colour: 5, unlocksAtLevel: 15 },
  { colour: 6, unlocksAtLevel: 26 },
  { colour: 7, unlocksAtLevel: 39 },
  { colour: 8, unlocksAtLevel: 50 },
  { colour: 9, unlocksAtLevel: 71 },
  { colour: 10, unlocksAtLevel: 91 },
  { colour: 11, unlocksAtLevel: 111 },
  { colour: 12, unlocksAtLevel: 131 },
  { colour: 13, unlocksAtLevel: 151 },
];

describe('which balls a player has earned', () => {
  it('earns nothing before a level is finished', () => {
    expect(availableColours(UNLOCKS, 0)).toEqual([]);
  });

  it('earns the three colours of level 1 by finishing it', () => {
    expect(availableColours(UNLOCKS, 1)).toEqual([1, 2, 3]);
  });

  it('earns a colour on the level that introduces it, not the one before', () => {
    expect(isEarned({ colour: 4, unlocksAtLevel: 6 }, 5)).toBe(false);
    expect(isEarned({ colour: 4, unlocksAtLevel: 6 }, 6)).toBe(true);
    expect(isEarned({ colour: 4, unlocksAtLevel: 6 }, 7)).toBe(true);
  });

  it('earns everything once the campaign is finished', () => {
    expect(availableColours(UNLOCKS, 151)).toHaveLength(13);
  });

  /**
   * A level code raises what a player may open, not what they have completed. Availability
   * reads the completion count alone, so a code grants nothing on its own — which is the
   * whole reason it is derived from progress rather than from the ceiling.
   */
  it('is unmoved by a ceiling raised without completions', () => {
    expect(availableColours(UNLOCKS, 0)).toEqual([]);
    expect(availableColours(UNLOCKS, 30)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('which ball an account shows', () => {
  it('uses the chosen colour when there is one', () => {
    expect(ballForAccount(9, 'dirnei')).toBe(9);
  });

  it('falls back to the name-derived colour when nothing was chosen', () => {
    expect(ballForAccount(null, 'dirnei')).toBe(colourForName('dirnei'));
  });

  /**
   * The client never draws a colour it does not have. A server that grew a fourteenth
   * colour before the client did must not produce a blank ball.
   */
  it('ignores a colour outside the palette', () => {
    expect(ballForAccount(14, 'dirnei')).toBe(colourForName('dirnei'));
    expect(ballForAccount(0, 'dirnei')).toBe(colourForName('dirnei'));
  });
});

describe('the unlock table', () => {
  beforeEach(() => {
    resetBallUnlocksCache();
    vi.unstubAllGlobals();
  });

  it('is fetched once and reused', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => UNLOCKS,
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadBallUnlocks();
    const second = await loadBallUnlocks();

    expect(first).toEqual(UNLOCKS);
    expect(second).toEqual(UNLOCKS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('is empty and retryable when the server cannot be reached', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', failing);

    expect(await loadBallUnlocks()).toEqual([]);

    // A failure must not be cached, or the picker would stay empty for the session.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => UNLOCKS }));
    expect(await loadBallUnlocks()).toEqual(UNLOCKS);
  });
});

describe('saving a choice', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports success when the server accepts it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    expect(await setProfileBall(3)).toBe(true);
  });

  it('reports failure when the server refuses it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    expect(await setProfileBall(13)).toBe(false);
  });

  it('reports failure when offline rather than throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    expect(await setProfileBall(3)).toBe(false);
  });

  it('sends null to clear the choice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await setProfileBall(null);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body) as { colour: number | null };
    expect(body.colour).toBeNull();
  });
});
