import { useState } from 'react';
import { ballStyle, colourName, lockedBallStyle } from '../skins';
import { isEarned, type BallUnlock } from './profileBall';

interface BallPickerProps {
  readonly unlocks: readonly BallUnlock[];
  readonly highestCompleted: number;
  readonly chosen: number | null;
  /** Saves the choice. Null clears it. Returns whether it took. */
  readonly onChoose: (colour: number | null) => Promise<boolean>;
}

/**
 * Choosing which ball represents the account.
 *
 * Every colour in the game is here, earned or not. Showing the locked ones is the point:
 * the set is a collection, and a collection with its far end hidden is just a short list.
 * Each locked ball says the level that earns it, in words rather than by colour alone — the
 * palette was built to survive colour blindness and this is the one screen where losing that
 * would matter most.
 *
 * Nothing here announces itself elsewhere in the game. No badge appears when a colour is
 * earned, and no toast interrupts a level. The game has nothing to sell, so it has no reason
 * to pull anyone out of a puzzle.
 */
export function BallPicker({ unlocks, highestCompleted, chosen, onChoose }: BallPickerProps) {
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function choose(colour: number | null) {
    setProblem(null);
    setSaving(true);

    const saved = await onChoose(colour);
    if (!saved) {
      // The previous ball stays as it was. Nothing is queued: unlike a completion there is
      // no work to lose, and a ball that applied itself later would be worse than one that
      // plainly did not take.
      setProblem('That didn’t save. Your ball is unchanged.');
    }

    setSaving(false);
  }

  if (unlocks.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Can’t reach the server, so there’s nothing to choose from right now.
      </p>
    );
  }

  const earned = unlocks.filter((unlock) => isEarned(unlock, highestCompleted));
  const firstLocked = unlocks.find((unlock) => !isEarned(unlock, highestCompleted));

  return (
    <div>
      <div className="grid grid-cols-7 gap-2.5" role="group" aria-label="Your ball">
        {unlocks.map((unlock) => {
          const open = isEarned(unlock, highestCompleted);
          const name = colourName(unlock.colour);

          return (
            <button
              key={unlock.colour}
              type="button"
              disabled={!open || saving}
              aria-disabled={!open}
              aria-pressed={chosen === unlock.colour}
              data-testid={`ball-${unlock.colour}`}
              data-locked={open ? undefined : 'true'}
              aria-label={open ? name : `${name} — unlocks at level ${unlock.unlocksAtLevel}`}
              onClick={() => open && void choose(unlock.colour)}
              className={
                'relative flex aspect-square items-center justify-center rounded-full ' +
                'transition-transform ' +
                (open ? 'hover:scale-110 active:scale-95' : 'cursor-default') +
                (chosen === unlock.colour ? ' ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900' : '')
              }
            >
              <span
                aria-hidden
                className="h-full w-full"
                style={open ? ballStyle(unlock.colour) : lockedBallStyle(unlock.colour)}
              />
              {!open && (
                <span className="absolute text-[0.6rem] font-semibold tabular-nums text-white/70">
                  {unlock.unlocksAtLevel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {earned.length === 0 && firstLocked !== undefined && (
        <p className="mt-3 text-sm text-slate-400">
          Finish level {firstLocked.unlocksAtLevel} to earn your first balls.
        </p>
      )}

      {earned.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          The dimmed ones show the level that earns them.
        </p>
      )}

      {chosen !== null && (
        <button
          type="button"
          disabled={saving}
          onClick={() => void choose(null)}
          className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-45"
        >
          Use the colour from my name
        </button>
      )}

      {problem !== null && <p className="mt-2 text-sm text-rose-300">{problem}</p>}
    </div>
  );
}
