import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router-dom';

/**
 * Warns a player that walking away from an unfinished level costs them the attempt.
 *
 * Two departures have to be covered and they are not alike. Navigating inside the app can be
 * suspended while the player decides, so it gets a real question. Closing or reloading the
 * tab cannot: the browser allows only its own generic prompt, and anything sent from the
 * unload handler is best-effort. Charging a loss without warning is the thing worth avoiding,
 * so the in-app path — the common one — is the one that asks.
 */
export function LeaveAttemptPrompt({
  active,
  onLeave,
}: {
  /** Whether an unfinished attempt is at stake. */
  readonly active: boolean;
  /** Ends the attempt as a loss. `beacon` when the page is going away regardless. */
  readonly onLeave: (options?: { beacon?: boolean }) => void;
}) {
  const { t } = useTranslation();
  const blocker = useBlocker(active);

  useEffect(() => {
    if (!active) return undefined;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      onLeave({ beacon: true });
      // Asks the browser for its own confirmation. The wording is the browser's; a custom
      // dialog is not permitted here.
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active, onLeave]);

  // The blocker stays armed only while something is at stake; releasing it here means a
  // player who finishes the level walks out without being asked anything.
  useEffect(() => {
    if (!active && blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [active, blocker]);

  if (blocker.state !== 'blocked') {
    return null;
  }

  const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-attempt-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-5 shadow-xl ring-1 ring-white/10">
        <h2 id="leave-attempt-title" className="text-lg font-bold text-white" style={fredoka}>
          {t('game.leaveTitle')}
        </h2>
        <p className="mt-2 text-sm text-slate-300">{t('game.leaveBody')}</p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => blocker.reset?.()}
            className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white"
            style={fredoka}
          >
            {t('game.leaveStay')}
          </button>
          <button
            type="button"
            onClick={() => {
              onLeave();
              blocker.proceed?.();
            }}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400"
            style={fredoka}
          >
            {t('game.leaveConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
