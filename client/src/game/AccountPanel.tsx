import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { blockerMessage, passkeyBlocker, register, signIn, usernameAvailable } from './passkeys';
import { ballStyle, colourForName } from '../skins';
import { BallPicker } from './BallPicker';
import { ballForAccount, type BallUnlock } from './profileBall';
import type { Identity } from './identity';

interface AccountPanelProps {
  readonly open: boolean;
  readonly identity: Identity | null;
  readonly onClose: () => void;
  readonly onLoggedIn: (identity: Identity) => void;
  readonly onRegistered: (username: string) => void;
  readonly onLogOut: () => void;
  /** Every colour in the game, with the level that earns it. Empty when unreachable. */
  readonly ballUnlocks: readonly BallUnlock[];
  /** The furthest level the player has finished, which is what earns the balls. */
  readonly highestCompleted: number;
  readonly onChooseBall: (colour: number | null) => Promise<boolean>;
}

type Status = 'idle' | 'working';

/**
 * Logging in, registering and logging out.
 *
 * Built from the game's own materials rather than as a generic modal: the panel uses the
 * glass treatment the tubes have, and an account is represented by a puzzle ball coloured
 * from its name. That makes it recognisable at a glance and keeps the screen part of the
 * same world.
 *
 * Only ever opened deliberately — nothing in the game prompts for an account.
 */
export function AccountPanel({
  open,
  identity,
  onClose,
  onLoggedIn,
  onRegistered,
  onLogOut,
  ballUnlocks,
  highestCompleted,
  onChooseBall,
}: AccountPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [username, setUsername] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  // Register is a choice first and a form second.
  const [naming, setNaming] = useState(false);

  const blocked = blockerMessage(passkeyBlocker());
  const loggedIn = identity !== null && !identity.isAnonymous;
  const busy = status === 'working';
  const name = identity?.username ?? '';

  // Previewed live while typing, so the account has a face before it exists.
  const previewName = naming ? username.trim() : name;

  async function handleRegister() {
    setProblem(null);
    setStatus('working');

    const check = await usernameAvailable(username);
    if (!check.available) {
      setProblem(check.reason ?? 'That name can’t be used.');
      setStatus('idle');
      return;
    }

    try {
      const outcome = await register(username);
      if (outcome === 'registered') {
        setStatus('idle');
        onRegistered(username.trim());
        return;
      }
      setProblem(
        outcome === 'name-taken' ? 'Someone just took that name.' : 'That didn’t complete.',
      );
    } catch {
      setProblem('That didn’t complete.');
    }
    setStatus('idle');
  }

  async function handleLogIn() {
    setProblem(null);
    setStatus('working');
    try {
      const who = await signIn();
      if (who === null) {
        setProblem('That passkey isn’t linked to an account here.');
      } else {
        setStatus('idle');
        onLoggedIn(who);
        return;
      }
    } catch {
      setProblem('That didn’t complete.');
    }
    setStatus('idle');
  }

  const primary =
    'w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white ' +
    'shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400 disabled:opacity-45';
  const quiet =
    'w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400 transition-colors ' +
    'hover:text-slate-200 disabled:opacity-45';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-30 flex items-end justify-center bg-slate-950/75 p-4 backdrop-blur-md sm:items-center"
        >
          <motion.div
            initial={{ y: 32, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[21rem] overflow-hidden rounded-[1.75rem] p-7 text-center shadow-2xl"
            style={{
              // The same glass the tubes are made of.
              backgroundImage:
                'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
                ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
                'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderTopColor: 'rgba(255,255,255,0.22)',
            }}
          >
            {/* An account, drawn as one of the game's own pieces. */}
            <motion.div
              key={previewName === '' ? 'empty' : previewName}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 480, damping: 20 }}
              className="mx-auto h-16 w-16"
              style={
                previewName === ''
                  ? {
                      borderRadius: '9999px',
                      border: '2px dashed rgba(255,255,255,0.18)',
                    }
                  : ballStyle(
                      // While naming, the ball follows what is being typed — there is no
                      // account yet to have chosen one.
                      naming
                        ? colourForName(previewName)
                        : ballForAccount(identity?.ball ?? null, previewName),
                    )
              }
            />

            <h2 className="mt-4 text-xl font-semibold tracking-tight">
              {loggedIn ? name : naming ? 'Pick a name' : 'Not logged in'}
            </h2>

            {blocked !== null ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{blocked}</p>
            ) : loggedIn ? (
              <button type="button" onClick={onLogOut} className={`mt-6 ${quiet}`}>
                Log out
              </button>
            ) : naming ? (
              <>
                <input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setProblem(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && username.trim().length >= 3 && !busy) {
                      void handleRegister();
                    }
                  }}
                  autoComplete="username"
                  spellCheck={false}
                  maxLength={20}
                  autoFocus
                  placeholder="Username"
                  className="mt-5 w-full rounded-2xl bg-slate-950/50 px-4 py-3 text-center text-base text-slate-100 outline-none ring-1 ring-white/10 transition placeholder:text-slate-600 focus:ring-2 focus:ring-sky-400/70"
                />

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={busy || username.trim().length < 3}
                  className={`mt-3 ${primary}`}
                >
                  {busy ? 'Waiting for your device…' : 'Create account'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNaming(false);
                    setProblem(null);
                  }}
                  disabled={busy}
                  className={`mt-1 ${quiet}`}
                >
                  Back
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLogIn}
                  disabled={busy}
                  className={`mt-6 ${primary}`}
                >
                  {busy ? 'Waiting for your device…' : 'Log in'}
                </button>

                <button
                  type="button"
                  onClick={() => setNaming(true)}
                  disabled={busy}
                  className={`mt-1 ${quiet}`}
                >
                  Register
                </button>
              </>
            )}

            <AnimatePresence>
              {problem !== null && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-xs text-rose-300"
                >
                  {problem}
                </motion.p>
              )}
            </AnimatePresence>

            {loggedIn && (
              <div className="mt-6 border-t border-white/8 pt-5">
                <h3 className="mb-3 text-sm font-medium text-slate-300">Your ball</h3>
                <BallPicker
                  unlocks={ballUnlocks}
                  highestCompleted={highestCompleted}
                  chosen={identity?.ball ?? null}
                  onChoose={onChooseBall}
                />
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
