import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ballStyle, colourName, lockedBallStyle } from '../skins';
import { isEarned, type BallUnlock } from './profileBall';

interface BallPickerProps {
  readonly unlocks: readonly BallUnlock[];
  readonly highestCompleted: number;
  readonly chosen: number | null;
  /** Saves the choice. Null clears it. Returns whether it took. */
  readonly onChoose: (colour: number | null) => Promise<boolean>;
}

const COLUMNS = 7;

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
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  async function choose(colour: number | null) {
    setProblem(null);
    setSaving(true);

    const saved = await onChoose(colour);
    if (!saved) {
      setProblem(t('ballPicker.saveFailed'));
    }

    setSaving(false);
  }

  useEffect(() => {
    if (unlocks.length === 0) return undefined;

    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === null) return 0;
          const count = unlocks.length;

          if (e.key === 'ArrowRight') return (prev + 1) % count;
          if (e.key === 'ArrowLeft') return (prev - 1 + count) % count;
          if (e.key === 'ArrowDown') {
            const next = prev + COLUMNS;
            return next < count ? next : prev;
          }
          if (e.key === 'ArrowUp') {
            const next = prev - COLUMNS;
            return next >= 0 ? next : prev;
          }
          return prev;
        });
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (focusedIndex === null || saving) return;
        e.preventDefault();
        const unlock = unlocks[focusedIndex];
        if (isEarned(unlock, highestCompleted)) {
          void choose(unlock.colour);
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [unlocks, focusedIndex, highestCompleted, saving]);

  function handlePointerDown() {
    setFocusedIndex(null);
  }

  if (unlocks.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        {t('ballPicker.cantReach')}
      </p>
    );
  }

  const earned = unlocks.filter((unlock) => isEarned(unlock, highestCompleted));
  const firstLocked = unlocks.find((unlock) => !isEarned(unlock, highestCompleted));

  return (
    <div>
      <div className="grid grid-cols-7 gap-2.5" role="group" aria-label={t('account.yourBall')}>
        {unlocks.map((unlock, i) => {
          const open = isEarned(unlock, highestCompleted);
          const cname = colourName(unlock.colour);

          return (
            <button
              key={unlock.colour}
              type="button"
              disabled={!open || saving}
              aria-disabled={!open}
              aria-pressed={chosen === unlock.colour}
              data-testid={`ball-${unlock.colour}`}
              data-locked={open ? undefined : 'true'}
              aria-label={open ? cname : t('ballPicker.unlocksAt', { name: cname, level: unlock.unlocksAtLevel })}
              onClick={() => open && void choose(unlock.colour)}
              onPointerDown={handlePointerDown}
              className={
                'relative flex aspect-square items-center justify-center rounded-full ' +
                'transition-transform ' +
                (open ? 'hover:scale-110 active:scale-95' : 'cursor-default') +
                (chosen === unlock.colour ? ' ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900' : '') +
                (focusedIndex === i ? ' kb-focus' : '')
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
          {t('ballPicker.firstLocked', { level: firstLocked.unlocksAtLevel })}
        </p>
      )}

      {earned.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {t('ballPicker.earnedHint')}
        </p>
      )}

      {problem !== null && <p className="mt-2 text-sm text-rose-300">{problem}</p>}
    </div>
  );
}
