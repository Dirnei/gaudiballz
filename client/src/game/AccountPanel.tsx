import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { passkeyBlocker, register, signIn, usernameAvailable, listPasskeys, deletePasskey, type PasskeyInfo } from './passkeys';
import {
  addEmailBegin,
  addEmailVerify,
  emailRegisterBegin,
  emailRegisterVerify,
  emailSignInBegin,
  emailSignInFinish,
  removeEmail,
} from './emailLogin';
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
  readonly onEmailChanged: (email: string | null, verified: boolean) => void;
  /** Every colour in the game, with the level that earns it. Empty when unreachable. */
  readonly ballUnlocks: readonly BallUnlock[];
  /** The furthest level the player has finished, which is what earns the balls. */
  readonly highestCompleted: number;
  readonly onChooseBall: (colour: number | null) => Promise<boolean>;
}

type Mode = 'idle' | 'naming' | 'emailSignIn' | 'emailRegister' | 'addingEmail';
type Status = 'idle' | 'working';

function emailErrorMessage(error: string | undefined, t: (key: string) => string): string {
  switch (error) {
    case 'cooldown':
      return t('email.cooldown');
    case 'expired':
      return t('email.codeExpired');
    case 'too-many-attempts':
      return t('email.tooManyAttempts');
    case 'invalid':
      return t('email.codeInvalid');
    case 'email-taken':
      return t('email.emailTaken');
    case 'username-taken':
      return t('account.error.nameTaken');
    default:
      return t('account.error.didntComplete');
  }
}

export function AccountPanel({
  open,
  identity,
  onClose,
  onLoggedIn,
  onRegistered,
  onLogOut,
  onEmailChanged,
  ballUnlocks,
  highestCompleted,
  onChooseBall,
}: AccountPanelProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('idle');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const [mode, setMode] = useState<Mode>('idle');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);

  const blocker = passkeyBlocker();
  const emailEnabled = identity?.emailEnabled ?? false;
  const loggedIn = identity !== null && !identity.isAnonymous;
  const busy = status === 'working';
  const name = identity?.username ?? '';

  const previewName = mode === 'naming' || mode === 'emailRegister' ? username.trim() : name;

  function resetEmailState() {
    setEmail('');
    setCodeInput('');
    setCodeSent(false);
    setProblem(null);
  }

  function goBack() {
    setMode('idle');
    resetEmailState();
    setUsername('');
  }

  const controlActions = useMemo(() => {
    if (mode === 'emailSignIn' || mode === 'emailRegister' || mode === 'addingEmail') return [];
    if (blocker !== null && !emailEnabled) return [];
    if (blocker !== null && emailEnabled) return [];
    if (loggedIn) return [{ label: 'log-out', action: onLogOut }];
    if (mode === 'naming') return [
      { label: 'create-account', action: () => { /* handled via Enter on button */ } },
      { label: 'back', action: () => { setMode('idle'); setProblem(null); } },
    ];
    return [
      { label: 'log-in', action: () => void handleLogIn() },
      { label: 'register', action: () => setMode('naming') },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker, emailEnabled, loggedIn, mode, onLogOut]);

  const controlRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setFocusedIndex(null);
  }, [controlActions]);

  useEffect(() => {
    if (open && loggedIn) {
      void listPasskeys().then(setPasskeys);
    }
  }, [open, loggedIn]);

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

  async function handleEmailSignInBegin() {
    setProblem(null);
    setStatus('working');
    const result = await emailSignInBegin(email);
    if (!result.sent) {
      setProblem(emailErrorMessage(result.error, t));
    } else {
      setCodeSent(true);
    }
    setStatus('idle');
  }

  async function handleEmailSignInFinish() {
    setProblem(null);
    setStatus('working');
    const who = await emailSignInFinish(email, codeInput);
    if (who === null) {
      setProblem(t('email.codeInvalid'));
    } else {
      resetEmailState();
      setMode('idle');
      onLoggedIn(who);
    }
    setStatus('idle');
  }

  async function handleEmailRegisterBegin() {
    setProblem(null);
    setStatus('working');
    const result = await emailRegisterBegin(username.trim(), email);
    if (!result.sent) {
      setProblem(emailErrorMessage(result.error, t));
    } else {
      setCodeSent(true);
    }
    setStatus('idle');
  }

  async function handleEmailRegisterFinish() {
    setProblem(null);
    setStatus('working');
    const result = await emailRegisterVerify(codeInput);
    if (!result.enrolled) {
      setProblem(emailErrorMessage(result.error, t));
    } else {
      const u = username.trim();
      resetEmailState();
      setMode('idle');
      onRegistered(u);
      onEmailChanged(email, true);
    }
    setStatus('idle');
  }

  async function handleAddEmailBegin() {
    setProblem(null);
    setStatus('working');
    const result = await addEmailBegin(email);
    if (!result.sent) {
      setProblem(emailErrorMessage(result.error, t));
    } else {
      setCodeSent(true);
    }
    setStatus('idle');
  }

  async function handleAddEmailVerify() {
    setProblem(null);
    setStatus('working');
    const result = await addEmailVerify(codeInput);
    if (!result.verified) {
      setProblem(emailErrorMessage(result.error, t));
    } else {
      const verified = email;
      resetEmailState();
      setMode('idle');
      onEmailChanged(verified, true);
    }
    setStatus('idle');
  }

  async function handleRemoveEmail() {
    setProblem(null);
    setStatus('working');
    const ok = await removeEmail();
    if (ok) {
      onEmailChanged(null, false);
    } else {
      setProblem(t('account.error.didntComplete'));
    }
    setStatus('idle');
  }

  async function handleAddPasskey() {
    setProblem(null);
    setStatus('working');
    try {
      const outcome = await register(identity?.username ?? '');
      if (outcome === 'registered') {
        void listPasskeys().then(setPasskeys);
      } else {
        setProblem(t('account.error.didntComplete'));
      }
    } catch {
      setProblem(t('account.error.didntComplete'));
    }
    setStatus('idle');
  }

  async function handleDeletePasskey(credentialId: string) {
    setProblem(null);
    setStatus('working');
    const result = await deletePasskey(credentialId);
    if (result.deleted) {
      setPasskeys((prev) => prev.filter((p) => p.id !== credentialId));
    } else if (result.error === 'last-passkey') {
      setProblem(t('passkey.cantDeleteLast'));
    } else {
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
  const inputClass =
    'mt-3 w-full rounded-2xl bg-slate-950/50 px-4 py-3 text-center text-base text-slate-100 ' +
    'outline-none ring-1 ring-white/10 transition placeholder:text-slate-600 focus:ring-2 focus:ring-sky-400/70';

  function fc(idx: number) {
    return focusedIndex === idx ? ' kb-focus' : '';
  }

  function heading(): string {
    if (mode === 'emailSignIn') return t('email.enterEmail');
    if (mode === 'emailRegister') return codeSent ? t('email.enterCode') : t('account.pickAName');
    if (mode === 'addingEmail') return codeSent ? t('email.enterCode') : t('email.addEmail');
    if (loggedIn) return name;
    if (mode === 'naming') return t('account.pickAName');
    return t('account.notLoggedInTitle');
  }

  function renderEmailCodeFlow(
    onSend: () => void,
    onVerify: () => void,
    showEmailInput: boolean,
    onResend?: () => void,
  ) {
    return (
      <>
        {showEmailInput && !codeSent && (
          <input
            value={email}
            onChange={(e) => { setEmail(e.target.value); setProblem(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && email.includes('@') && !busy) void onSend();
            }}
            type="email"
            autoComplete="email"
            autoFocus
            placeholder={t('email.emailPlaceholder')}
            className={inputClass}
            data-testid="panel-email"
          />
        )}

        {!codeSent ? (
          <button
            type="button"
            onClick={onSend}
            disabled={busy || !email.includes('@')}
            className={`mt-3 ${primary}`}
            data-testid="panel-send-code"
          >
            {busy ? t('account.waitingForDevice') : t('email.sendCode')}
          </button>
        ) : (
          <>
            <p className="mt-3 text-xs text-emerald-300">{t('email.codeSent')}</p>
            <input
              value={codeInput}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCodeInput(v);
                setProblem(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && codeInput.length === 6 && !busy) void onVerify();
              }}
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder={t('email.codePlaceholder')}
              className={`${inputClass} tracking-[0.3em]`}
              data-testid="panel-code"
            />
            <button
              type="button"
              onClick={onVerify}
              disabled={busy || codeInput.length !== 6}
              className={`mt-3 ${primary}`}
              data-testid="panel-verify-code"
            >
              {busy ? t('account.waitingForDevice') : t('email.verifyCode')}
            </button>
            <button
              type="button"
              onClick={() => { setCodeInput(''); setProblem(null); void (onResend ?? onSend)(); }}
              disabled={busy}
              className="mt-2 w-full text-xs text-slate-500 transition-colors hover:text-slate-300"
              data-testid="panel-resend-code"
            >
              {t('email.resendCode')}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={goBack}
          disabled={busy}
          className={`mt-1 ${quiet}`}
          data-testid="panel-back"
        >
          {t('account.back')}
        </button>
      </>
    );
  }

  function renderBody() {
    // Email sign-in flow
    if (mode === 'emailSignIn') {
      return renderEmailCodeFlow(
        () => void handleEmailSignInBegin(),
        () => void handleEmailSignInFinish(),
        true,
      );
    }

    // Email registration flow
    if (mode === 'emailRegister') {
      if (!codeSent) {
        return (
          <>
            <input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setProblem(null); }}
              autoComplete="username"
              spellCheck={false}
              maxLength={20}
              autoFocus
              placeholder={t('account.usernamePlaceholder')}
              className={inputClass}
              data-testid="panel-username"
            />
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); setProblem(null); }}
              type="email"
              autoComplete="email"
              placeholder={t('email.emailPlaceholder')}
              className={inputClass}
              data-testid="panel-email"
            />
            <button
              type="button"
              onClick={() => void handleEmailRegisterBegin()}
              disabled={busy || username.trim().length < 3 || !email.includes('@')}
              className={`mt-3 ${primary}`}
              data-testid="panel-send-code"
            >
              {busy ? t('account.waitingForDevice') : t('email.sendCode')}
            </button>
            <button
              type="button"
              onClick={goBack}
              disabled={busy}
              className={`mt-1 ${quiet}`}
              data-testid="panel-back"
            >
              {t('account.back')}
            </button>
          </>
        );
      }
      return renderEmailCodeFlow(
        () => void handleEmailRegisterBegin(),
        () => void handleEmailRegisterFinish(),
        false,
      );
    }

    // Adding email to existing account
    if (mode === 'addingEmail') {
      return renderEmailCodeFlow(
        () => void handleAddEmailBegin(),
        () => void handleAddEmailVerify(),
        true,
      );
    }

    // Passkeys blocked
    if (blocker !== null) {
      if (emailEnabled) {
        const msg = blocker === 'unsupported'
          ? t('passkey.unsupportedWithEmail')
          : t('passkey.insecureContextWithEmail');
        return (
          <>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{msg}</p>
            <button
              type="button"
              onClick={() => { setMode('emailRegister'); resetEmailState(); }}
              className={`mt-4 ${primary}`}
              data-testid="panel-register-email"
            >
              {t('email.registerViaEmail')}
            </button>
          </>
        );
      }
      const msg = blocker === 'unsupported'
        ? t('passkey.unsupported')
        : t('passkey.insecureContext');
      return <p className="mt-2 text-sm leading-relaxed text-slate-400">{msg}</p>;
    }

    // Logged in
    if (loggedIn) {
      return (
        <>
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

          <div className="mt-4 border-t border-white/8 pt-4">
            {identity?.email && identity.emailVerified ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>{identity.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveEmail()}
                  disabled={busy}
                  className="text-xs text-slate-500 transition-colors hover:text-rose-300"
                  data-testid="panel-remove-email"
                >
                  {t('email.removeEmail')}
                </button>
              </div>
            ) : identity?.email && !identity.emailVerified ? (
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-slate-300">
                    <span className="text-amber-400">○</span>
                    <span>{identity.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveEmail()}
                    disabled={busy}
                    className="text-xs text-slate-500 transition-colors hover:text-rose-300"
                    data-testid="panel-remove-email"
                  >
                    {t('email.removeEmail')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setEmail(identity.email!); setMode('addingEmail'); setCodeSent(true); setProblem(null); setCodeInput(''); }}
                  disabled={busy}
                  className="mt-1 text-xs text-amber-400/70 transition-colors hover:text-amber-300"
                  data-testid="panel-verify-email"
                >
                  {t('email.verifyCode')}
                </button>
              </div>
            ) : emailEnabled ? (
              <button
                type="button"
                onClick={() => { setMode('addingEmail'); resetEmailState(); }}
                className="w-full text-left text-sm text-slate-500 transition-colors hover:text-slate-300"
                data-testid="panel-add-email"
              >
                <span className="text-amber-400/70">○</span>{' '}{t('email.addEmail')}
              </button>
            ) : null}
          </div>

          <div className="mt-4 border-t border-white/8 pt-4">
            <h3 className="mb-2 text-sm font-medium text-slate-300">{t('passkey.managePasskeys')}</h3>
            {passkeys.length > 0 ? (
              <ul className="space-y-2">
                {passkeys.map((pk) => (
                  <li key={pk.id} className="flex items-center justify-between rounded-xl bg-slate-950/30 px-3 py-2 text-xs">
                    <span className="text-slate-400">
                      {t('passkey.createdAt', { date: new Date(pk.createdAt).toLocaleDateString() })}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDeletePasskey(pk.id)}
                      disabled={busy}
                      className="text-slate-500 transition-colors hover:text-rose-300"
                      data-testid={`panel-delete-passkey-${pk.id}`}
                    >
                      {t('passkey.deletePasskey')}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">{t('passkey.noPasskeys')}</p>
            )}
            {blocker === null && (
              <button
                type="button"
                onClick={() => void handleAddPasskey()}
                disabled={busy}
                className="mt-2 w-full rounded-xl bg-slate-950/30 px-3 py-2 text-xs text-slate-400 transition-colors hover:text-slate-200"
                data-testid="panel-add-passkey"
              >
                {t('passkey.addPasskey')}
              </button>
            )}
          </div>
        </>
      );
    }

    // Passkey registration (naming)
    if (mode === 'naming') {
      return (
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
            className={`mt-5 ${inputClass.replace('mt-3 ', '')}`}
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

          {emailEnabled && (
            <button
              type="button"
              onClick={() => { setMode('emailRegister'); resetEmailState(); }}
              disabled={busy}
              className={`mt-1 ${quiet}`}
              data-testid="panel-use-email-register"
            >
              {t('email.useEmail')}
            </button>
          )}

          <button
            ref={(el) => { controlRefs.current[1] = el; }}
            type="button"
            onClick={() => {
              setMode('idle');
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
      );
    }

    // Default: idle (log in / register)
    return (
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
          onClick={() => setMode('naming')}
          onPointerDown={handlePointerDown}
          disabled={busy}
          className={`mt-1 ${quiet}${fc(1)}`}
          data-testid="panel-register"
        >
          {t('account.register')}
        </button>

        {emailEnabled && (
          <>
            <button
              type="button"
              onClick={() => { setMode('emailRegister'); resetEmailState(); }}
              disabled={busy}
              className={`mt-1 ${quiet}`}
              data-testid="panel-register-email"
            >
              {t('email.registerViaEmail')}
            </button>

            <button
              type="button"
              onClick={() => { setMode('emailSignIn'); resetEmailState(); }}
              disabled={busy}
              className="mt-4 w-full text-xs text-slate-500 transition-colors hover:text-slate-300"
              data-testid="panel-recover"
            >
              {t('email.recoverAccount')}
            </button>
          </>
        )}
      </>
    );
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
              backgroundImage:
                'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
                ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
                'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderTopColor: 'rgba(255,255,255,0.22)',
            }}
          >
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
                      mode === 'naming' || mode === 'emailRegister'
                        ? colourForName(previewName)
                        : ballForAccount(identity?.ball ?? null, previewName),
                    )
              }
            />

            <h2 className="mt-4 text-xl font-semibold tracking-tight">
              {heading()}
            </h2>

            {renderBody()}

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

            {loggedIn && mode !== 'addingEmail' && (
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
