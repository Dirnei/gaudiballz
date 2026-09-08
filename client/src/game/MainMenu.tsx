import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AccountBall } from './AccountBall';
import type { Identity } from './identity';

interface MainMenuProps {
  readonly identity: Identity | null;
  readonly onPlay: () => void;
  readonly onLevelSelect: () => void;
  readonly onOpenAccount: () => void;
  readonly onUnlockWithCode: (code: string) => Promise<{ levelId: number } | null>;
}

/**
 * The game's front door. Shows on launch and provides navigation to gameplay,
 * level selection, and level-code entry.
 */
export function MainMenu({
  identity,
  onPlay,
  onLevelSelect,
  onOpenAccount,
  onUnlockWithCode,
}: MainMenuProps) {
  const [enteringCode, setEnteringCode] = useState(false);
  const [levelCode, setLevelCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCodeUnlock() {
    setCodeError(null);
    setBusy(true);
    const result = await onUnlockWithCode(levelCode);
    setBusy(false);
    if (result === null) {
      setCodeError('Invalid code.');
    } else {
      setEnteringCode(false);
      setLevelCode('');
    }
  }

  const primary =
    'w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white ' +
    'shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400 disabled:opacity-45';
  const quiet =
    'w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400 transition-colors ' +
    'hover:text-slate-200 disabled:opacity-45';

  const loggedIn = identity !== null && !identity.isAnonymous;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-[20rem] text-center"
      >
        {/* Title area */}
        <h1 className="text-4xl font-bold tracking-tight text-white">Sort Puzzle</h1>
        <p className="mt-2 text-sm text-slate-400">Sort the colours. Clear the board.</p>

        {/* Main action panel */}
        <div
          className="mt-8 w-full overflow-hidden rounded-[1.75rem] p-7 shadow-2xl"
          style={{
            backgroundImage:
              'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
              ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
              'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderTopColor: 'rgba(255,255,255,0.22)',
          }}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onPlay}
            className={primary}
          >
            Play
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onLevelSelect}
            className={`mt-3 ${quiet}`}
          >
            Level Select
          </motion.button>

          {/* Level code entry */}
          <div className="mt-5 border-t border-white/8 pt-5">
            {enteringCode ? (
              <>
                <input
                  value={levelCode}
                  onChange={(e) => {
                    setLevelCode(e.target.value);
                    setCodeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && levelCode.trim().length > 0 && !busy) {
                      void handleCodeUnlock();
                    }
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={6}
                  autoFocus
                  placeholder="Enter level code"
                  className="w-full rounded-2xl bg-slate-950/50 px-4 py-3 text-center font-mono text-base uppercase tracking-widest text-slate-100 outline-none ring-1 ring-white/10 transition placeholder:text-slate-600 placeholder:tracking-normal placeholder:normal-case focus:ring-2 focus:ring-sky-400/70"
                />
                <button
                  type="button"
                  onClick={() => void handleCodeUnlock()}
                  disabled={busy || levelCode.trim().length === 0}
                  className={`mt-3 ${primary}`}
                >
                  {busy ? 'Checking...' : 'Unlock'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnteringCode(false);
                    setCodeError(null);
                    setLevelCode('');
                  }}
                  className={`mt-1 ${quiet}`}
                >
                  Cancel
                </button>
                <AnimatePresence>
                  {codeError !== null && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 text-xs text-rose-300"
                    >
                      {codeError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEnteringCode(true)}
                className={quiet}
              >
                Enter a level code
              </button>
            )}
          </div>
        </div>

        {/* Account button — below the card, quiet and unobtrusive */}
        <button
          type="button"
          onClick={onOpenAccount}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/8 py-1.5 pl-2.5 pr-3 text-sm text-slate-300 ring-1 ring-white/10 transition-colors hover:bg-white/12"
        >
          <AccountBall identity={identity} />
          <span className="max-w-[7rem] truncate">
            {loggedIn ? (identity.username ?? 'Account') : 'Log in'}
          </span>
        </button>
      </motion.div>
    </div>
  );
}
