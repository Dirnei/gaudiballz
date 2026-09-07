import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { blockerMessage, passkeyBlocker, register, signIn, usernameAvailable } from './passkeys';
import type { Identity } from './identity';

interface AccountPanelProps {
  readonly open: boolean;
  readonly identity: Identity | null;
  readonly onClose: () => void;
  readonly onLoggedIn: (identity: Identity) => void;
  readonly onRegistered: (username: string) => void;
  readonly onLogOut: () => void;
}

type Status = 'idle' | 'working';

/**
 * Logging in, registering and logging out.
 *
 * Only ever opened deliberately: nothing in the game prompts for an account, and there is
 * no pitch on completing a level. The words are the ordinary ones — a player should not
 * have to learn what a passkey or an enrolment is in order to keep their progress.
 */
export function AccountPanel({
  open,
  identity,
  onClose,
  onLoggedIn,
  onRegistered,
  onLogOut,
}: AccountPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [username, setUsername] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmingLogOut, setConfirmingLogOut] = useState(false);

  const blocked = blockerMessage(passkeyBlocker());
  const loggedIn = identity !== null && !identity.isAnonymous;
  const busy = status === 'working';

  async function handleRegister() {
    setProblem(null);
    setStatus('working');

    // Checked before the device is asked for anything, so a taken name costs a message
    // rather than a fingerprint prompt followed by a refusal.
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
        outcome === 'name-taken'
          ? 'Someone just took that name. Try another.'
          : 'That didn’t complete. Nothing changed — you can try again.',
      );
    } catch {
      setProblem('That didn’t complete. Nothing changed — you can try again.');
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
      setProblem('That didn’t complete. Nothing changed — you can try again.');
    }

    setStatus('idle');
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-30 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-slate-800/95 p-6 shadow-2xl ring-1 ring-white/10"
          >
            {/* The state, said rather than left to be inferred. */}
            {loggedIn ? (
              <>
                <p className="text-xs uppercase tracking-widest text-slate-500">Logged in as</p>
                <h2 className="mt-1 text-xl font-semibold">
                  {identity.username ?? 'your account'}
                </h2>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-widest text-slate-500">Not logged in</p>
                <h2 className="mt-1 text-lg font-semibold">
                  Your progress is on this device only
                </h2>
              </>
            )}

            {blocked !== null ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{blocked}</p>
            ) : loggedIn ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Your progress is saved to your account and will be here on any device you log
                in to.
              </p>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Register to keep your progress across devices. Pick a name — no password,
                  no email.
                </p>

                <label className="mt-4 block">
                  <span className="text-xs text-slate-500">Username</span>
                  <input
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setProblem(null);
                    }}
                    autoComplete="username"
                    spellCheck={false}
                    maxLength={20}
                    placeholder="3–20 characters"
                    className="mt-1 w-full rounded-xl bg-slate-900/70 px-3 py-2.5 text-sm text-slate-100 outline-none ring-1 ring-white/10 placeholder:text-slate-600 focus:ring-sky-400/60"
                  />
                </label>

                <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200/90 ring-1 ring-amber-400/20">
                  Your device holds the key. If you lose every device that has it, the
                  account goes with it — there’s no password or email to recover it from.
                </p>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={busy || username.trim().length < 3}
                  className="mt-4 w-full rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 disabled:opacity-40"
                >
                  {busy ? 'Waiting for your device…' : 'Register'}
                </button>

                <button
                  type="button"
                  onClick={handleLogIn}
                  disabled={busy}
                  className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400 disabled:opacity-50"
                >
                  Log in
                </button>
              </>
            )}

            {problem !== null && (
              <p className="mt-3 text-center text-xs text-rose-300">{problem}</p>
            )}

            {/* Only where there is an account to leave: anonymous is the logged-out state. */}
            {loggedIn && (
              <div className="mt-5 border-t border-white/10 pt-4">
                {confirmingLogOut ? (
                  <>
                    <p className="mb-3 text-xs leading-relaxed text-slate-400">
                      Your progress stays on the account. Log in with your passkey to pick it
                      up again.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onLogOut}
                        className="flex-1 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-100"
                      >
                        Log out
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingLogOut(false)}
                        className="flex-1 rounded-2xl px-4 py-2.5 text-sm text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingLogOut(true)}
                    className="w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400"
                  >
                    Log out
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-2xl px-4 py-2 text-sm text-slate-500"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
