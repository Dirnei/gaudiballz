import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { blockerMessage, enrol, passkeyBlocker, signIn } from './passkeys';
import type { Identity } from './identity';

interface AccountPanelProps {
  readonly open: boolean;
  readonly identity: Identity | null;
  readonly onClose: () => void;
  readonly onSignedIn: (identity: Identity) => void;
  readonly onEnrolled: () => void;
}

type Status = 'idle' | 'working' | 'failed';

/**
 * Where a player creates or uses a passkey.
 *
 * It is only ever opened deliberately. Nothing in the game prompts for an account: no
 * pitch on completing a level, no banner, no badge, no reminder. The game has no
 * advertising and nothing to sell, so pushing registration would buy nothing and interrupt
 * the thing people came for.
 */
export function AccountPanel({ open, identity, onClose, onSignedIn, onEnrolled }: AccountPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const blocker = passkeyBlocker();
  const blocked = blockerMessage(blocker);

  async function handleEnrol() {
    setStatus('working');
    try {
      setStatus((await enrol()) ? 'idle' : 'failed');
      if (status !== 'failed') {
        onEnrolled();
      }
    } catch {
      setStatus('failed');
    }
  }

  async function handleSignIn() {
    setStatus('working');
    try {
      const signedIn = await signIn();
      if (signedIn === null) {
        setStatus('failed');
        return;
      }
      setStatus('idle');
      onSignedIn(signedIn);
    } catch {
      setStatus('failed');
    }
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
            <h2 className="text-lg font-semibold">Keep your progress</h2>

            {blocked !== null ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{blocked}</p>
            ) : identity !== null && !identity.isAnonymous ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  This device has a passkey. Your progress is on your account and will be
                  here on any device you sign in to.
                </p>
                <button
                  type="button"
                  onClick={handleEnrol}
                  disabled={status === 'working'}
                  className="mt-5 w-full rounded-2xl bg-white/8 px-4 py-3 text-sm font-medium ring-1 ring-white/10 disabled:opacity-50"
                >
                  Add another passkey
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Add a passkey and your progress follows you to any device. No password, no
                  email, nothing to fill in.
                </p>

                {/* Stated before enrolling, not after. There is no recovery route and the
                    product should not imply one. */}
                <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-200/90 ring-1 ring-amber-400/20">
                  If you lose every device holding the passkey, the account goes with it —
                  there’s no password or email to recover it from.
                </p>

                <button
                  type="button"
                  onClick={handleEnrol}
                  disabled={status === 'working'}
                  className="mt-5 w-full rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 disabled:opacity-50"
                >
                  {status === 'working' ? 'Waiting for your device…' : 'Create a passkey'}
                </button>
              </>
            )}

            {blocked === null && (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={status === 'working'}
                className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400 disabled:opacity-50"
              >
                Sign in with an existing passkey
              </button>
            )}

            {status === 'failed' && (
              <p className="mt-3 text-center text-xs text-rose-300">
                That didn’t complete. Nothing changed — you can try again.
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl px-4 py-2 text-sm text-slate-500"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
