import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');
  const [username, setUsername] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  // Register is a choice first and a form second.
  const [naming, setNaming] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const blocked = blockerMessage(passkeyBlocker());
  const loggedIn = identity !== null && !identity.isAnonymous;
  const busy = status === 'working';
  const name = identity?.username ?? '';

  // Previewed live while typing, so the account has a face before it exists.
  const previewName = naming ? username.trim() : name;

  const controlActions = useMemo(() => {
    if (blocked !== null) return [];
    if (loggedIn) return [{ label: 'log-out', action: onLogOut }];
    if (naming) return [
      { label: 'create-account', action: () => { /* handled via Enter on button */ } },
      { label: 'back', action: () => { setNaming(false); setProblem(null); } },
    ];
    return [
      { label: 'log-in', action: () => void handleLogIn() },
      { label: 'register', action: () => setNaming(true) },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, loggedIn, naming, onLogOut]);

  const controlRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setFocusedIndex(null);
  }, [controlActions]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (controlActions.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === null) return 0;
          const dir = e.key === 'ArrowDown' ? 1 : -1;
          return (prev + dir + controlActions.length) % controlActions.length;
        });
        return;
      }

      if ((e.key === 'Enter' || e.key === ' ') && focusedIndex !== null) {
        e.preventDefault();
        controlRefs.current[focusedIndex]?.click();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, controlActions, focusedIndex]);

  function handlePointerDown() {
    setFocusedIndex(null);
  }

  async function handleRegister() {
    setProblem(null);
    setStatus('working');

    const check = await usernameAvailable(username);
    if (!check.available) {
      setProblem(check.reason ?? t('account.error.nameCantBeUsed'));
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
        outcome === 'name-taken' ? t('account.error.nameTaken') : t('account.error.didntComplete'),
      );
    } catch {
      setProblem(t('account.error.didntComplete'));
    }
    setStatus('idle');
  }

  async function handleLogIn() {
    setProblem(null);
    setStatus('working');
    try {
      const who = await signIn();
      if (who === null) {
        setProblem(t('account.error.passkeyNotLinked'));
      } else {
        setStatus('idle');
        onLoggedIn(who);
        return;
      }
    } catch {
      setProblem(t('account.error.didntComplete'));
    }
    setStatus('idle');
  }

  const primary =
    'w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white ' +
    'shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400 disabled:opacity-45';
  const quiet =
    'w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400 transition-colors ' +
    'hover:text-slate-200 disabled:opacity-45';

  function fc(idx: number) {
    return focusedIndex === idx ? ' kb-focus' : '';
  }

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
                      naming
                        ? colourForName(previewName)
                        : ballForAccount(identity?.ball ?? null, previewName),
                    )
              }
            />

            <h2 className="mt-4 text-xl font-semibold tracking-tight">
              {loggedIn ? name : naming ? t('account.pickAName') : t('account.notLoggedInTitle')}
            </h2>

            {blocked !== null ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{blocked}</p>
            ) : loggedIn ? (
              <button
                ref={(el) => { controlRefs.current[0] = el; }}
                type="button"
                onClick={onLogOut}
                onPointerDown={handlePointerDown}
                className={`mt-6 ${quiet}${fc(0)}`}
                data-testid="panel-logout"
              >
                {t('account.logOut')}
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
                  placeholder={t('account.usernamePlaceholder')}
                  className="mt-5 w-full rounded-2xl bg-slate-950/50 px-4 py-3 text-center text-base text-slate-100 outline-none ring-1 ring-white/10 transition placeholder:text-slate-600 focus:ring-2 focus:ring-sky-400/70"
                  data-testid="panel-username"
                />

                <button
                  ref={(el) => { controlRefs.current[0] = el; }}
                  type="button"
                  onClick={handleRegister}
                  onPointerDown={handlePointerDown}
                  disabled={busy || username.trim().length < 3}
                  className={`mt-3 ${primary}${fc(0)}`}
                  data-testid="panel-create"
                >
                  {busy ? t('account.waitingForDevice') : t('account.createAccount')}
                </button>

                <button
                  ref={(el) => { controlRefs.current[1] = el; }}
                  type="button"
                  onClick={() => {
                    setNaming(false);
                    setProblem(null);
                  }}
                  onPointerDown={handlePointerDown}
                  disabled={busy}
                  className={`mt-1 ${quiet}${fc(1)}`}
                  data-testid="panel-back"
                >
                  {t('account.back')}
                </button>
              </>
            ) : (
              <>
                <button
                  ref={(el) => { controlRefs.current[0] = el; }}
                  type="button"
                  onClick={handleLogIn}
                  onPointerDown={handlePointerDown}
                  disabled={busy}
                  className={`mt-6 ${primary}${fc(0)}`}
                  data-testid="panel-login"
                >
                  {busy ? t('account.waitingForDevice') : t('account.logIn')}
                </button>

                <button
                  ref={(el) => { controlRefs.current[1] = el; }}
                  type="button"
                  onClick={() => setNaming(true)}
                  onPointerDown={handlePointerDown}
                  disabled={busy}
                  className={`mt-1 ${quiet}${fc(1)}`}
                  data-testid="panel-register"
                >
                  {t('account.register')}
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
                <h3 className="mb-3 text-sm font-medium text-slate-300">{t('account.yourBall')}</h3>
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
