import { beforeEach, describe, expect, it } from 'vitest';
import { isSolved } from '../engine/rules';

describe('tutorial board', () => {
  it('creates a valid board with 2 colours, 3 tubes, capacity 3', async () => {
    const { createTutorialBoard } = await import('./tutorial');
    const board = createTutorialBoard();

    expect(board.colourCount).toBe(2);
    expect(board.tubes).toHaveLength(3);
    expect(board.capacity).toBe(3);
  });

  it('is not already solved', async () => {
    const { createTutorialBoard } = await import('./tutorial');
    const board = createTutorialBoard();

    expect(isSolved(board)).toBe(false);
  });

  it('has one empty tube as the spare', async () => {
    const { createTutorialBoard } = await import('./tutorial');
    const board = createTutorialBoard();

    const emptyTubes = board.tubes.filter((t) => t.length === 0);
    expect(emptyTubes).toHaveLength(1);
  });
});

describe('tutorial state machine', () => {
  it('starts at pick-source with zero moves', async () => {
    const { startTutorial } = await import('./tutorial');
    const state = startTutorial();

    expect(state.step).toBe('pick-source');
    expect(state.moveCount).toBe(0);
  });

  it('advances from pick-source to pick-target after first move', async () => {
    const { startTutorial, advanceTutorial } = await import('./tutorial');
    const state = advanceTutorial(startTutorial());

    expect(state.step).toBe('pick-target');
    expect(state.moveCount).toBe(1);
  });

  it('advances from pick-target to free-play after second move', async () => {
    const { startTutorial, advanceTutorial } = await import('./tutorial');
    let state = startTutorial();
    state = advanceTutorial(state);
    state = advanceTutorial(state);

    expect(state.step).toBe('free-play');
    expect(state.moveCount).toBe(2);
  });

  it('stays in free-play on further moves', async () => {
    const { startTutorial, advanceTutorial } = await import('./tutorial');
    let state = startTutorial();
    state = advanceTutorial(state);
    state = advanceTutorial(state);
    state = advanceTutorial(state);
    state = advanceTutorial(state);

    expect(state.step).toBe('free-play');
    expect(state.moveCount).toBe(4);
  });

  it('transitions to done on completion', async () => {
    const { startTutorial, advanceTutorial, completeTutorial } = await import('./tutorial');
    let state = startTutorial();
    state = advanceTutorial(state);
    state = advanceTutorial(state);
    state = completeTutorial(state);

    expect(state.step).toBe('done');
  });

  it('has a prompt for each non-done step', async () => {
    const { TUTORIAL_PROMPTS } = await import('./tutorial');

    expect(TUTORIAL_PROMPTS['pick-source']).toBeDefined();
    expect(TUTORIAL_PROMPTS['pick-target']).toBeDefined();
    expect(TUTORIAL_PROMPTS['free-play']).toBeDefined();
  });
});

describe('first-time detection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns true when no flag is set', async () => {
    const { needsTutorial } = await import('./tutorial');
    expect(needsTutorial()).toBe(true);
  });

  it('returns false after tutorial is marked seen', async () => {
    const { needsTutorial, markTutorialSeen } = await import('./tutorial');
    markTutorialSeen();
    expect(needsTutorial()).toBe(false);
  });

  it('survives a page reload (persists in localStorage)', async () => {
    const { markTutorialSeen } = await import('./tutorial');
    markTutorialSeen();

    expect(localStorage.getItem('puzzle.tutorialSeen')).toBe('1');
  });
});
