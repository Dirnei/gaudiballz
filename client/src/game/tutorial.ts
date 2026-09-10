import { createBoard, type Board } from '../engine/board';
import i18n from '../i18n/i18n';

export type TutorialStep = 'pick-source' | 'pick-target' | 'free-play' | 'done';

export interface TutorialState {
  readonly step: TutorialStep;
  readonly moveCount: number;
}

const TUTORIAL_SEEN_KEY = 'puzzle.tutorialSeen';

export function needsTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) !== '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch {
    // Private browsing or blocked storage.
  }
}

export function createTutorialBoard(): Board {
  return createBoard(
    [
      [1, 2, 1],
      [2, 1, 2],
      [],
    ],
    3,
    2,
  );
}

export function startTutorial(): TutorialState {
  return { step: 'pick-source', moveCount: 0 };
}

export function advanceTutorial(state: TutorialState): TutorialState {
  const moveCount = state.moveCount + 1;

  if (state.step === 'pick-source') {
    return { step: 'pick-target', moveCount };
  }

  if (state.step === 'pick-target') {
    return { step: 'free-play', moveCount };
  }

  return { step: state.step, moveCount };
}

export function completeTutorial(state: TutorialState): TutorialState {
  return { ...state, step: 'done' };
}

export function tutorialPrompt(step: Exclude<TutorialStep, 'done'>): string {
  const keys: Record<Exclude<TutorialStep, 'done'>, string> = {
    'pick-source': 'tutorial.pickSource',
    'pick-target': 'tutorial.pickTarget',
    'free-play': 'tutorial.freePlay',
  };
  return i18n.t(keys[step]);
}

/** @deprecated Use tutorialPrompt() for translated strings */
export const TUTORIAL_PROMPTS: Record<Exclude<TutorialStep, 'done'>, string> = {
  'pick-source': 'Tap a tube to pick up the balls on top',
  'pick-target': 'Now tap another tube to pour them in',
  'free-play': 'Sort all the colours to win!',
};
