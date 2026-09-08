import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Tube } from './Tube';
import { useGame } from './useGame';
import { AccountPanel } from './AccountPanel';
import { ballStyle, colourForName } from '../skins';
import { haptics } from './haptics';

/** A tube is finished when it is full and single-coloured; empty tubes are just empty. */
function isComplete(tube: readonly number[], capacity: number): boolean {
  return tube.length === capacity && tube.every((colour) => colour === tube[0]);
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
  primary,
  remaining,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  primary?: boolean;
  /** Uses left, when the control is limited. Shown so the cost is visible before spending. */
  remaining?: number;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 700, damping: 26 }}
      className={`relative flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-semibold shadow-lg transition-colors disabled:opacity-30 ${
        primary
          ? 'bg-sky-500 text-white shadow-sky-500/30'
          : 'bg-white/8 text-slate-200 ring-1 ring-white/10 backdrop-blur-sm'
      }`}
    >
      {children}
      {remaining !== undefined && (
        <span
          className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.65rem] font-semibold tabular-nums ${
            remaining === 0
              ? 'bg-slate-700 text-slate-500'
              : 'bg-slate-900 text-slate-200 ring-1 ring-white/15'
          }`}
        >
          {remaining}
        </span>
      )}
    </motion.button>
  );
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): Promise<void> {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  return Promise.resolve();
}

function LevelBadge({ levelId, code }: { levelId: number; code: string | null }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (code === null) return;
    void copyText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex items-center gap-2.5 rounded-full bg-white/8 py-1.5 pl-3.5 pr-3 ring-1 ring-white/10"
    >
      <span className="text-sm font-semibold">Level {levelId}</span>
      {code !== null && (
        <span className="rounded-md bg-white/6 px-1.5 py-0.5 font-mono text-[0.65rem] tracking-widest text-slate-400 transition-colors group-active:bg-sky-500/20 group-active:text-sky-300">
          {copied ? '✓' : code}
        </span>
      )}
    </button>
  );
}

export function App() {
  const game = useGame();
  const completedCount = useRef(0);

  const board = game.state?.board;
  const done = board ? board.tubes.filter((t) => isComplete(t, board.capacity)).length : 0;

  // Physical confirmation, on the move that earned it.
  useEffect(() => {
    if (done > completedCount.current) {
      haptics.complete();
    }
    completedCount.current = done;
  }, [done]);

  useEffect(() => {
    if (game.solved) {
      haptics.win();
    }
  }, [game.solved]);

  useEffect(() => {
    if (game.stuck) {
      haptics.blocked();
    }
  }, [game.stuck]);

  const par = game.info?.parMoves ?? 0;
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // A level that changes the rules announces itself, so a step up in difficulty reads as
  // intended rather than as the game breaking. Shown once, briefly, on arrival.
  const note = game.info?.chapterNote ?? null;
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    if (note === null) {
      setShowNote(false);
      return undefined;
    }

    setShowNote(true);
    const timer = setTimeout(() => setShowNote(false), 4200);
    return () => clearTimeout(timer);
  }, [note]);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background:
          'radial-gradient(120% 80% at 50% -10%, #1e2b52 0%, #101833 42%, #070b16 100%)',
      }}
    >
      {/* Soft colour bloom behind the board, so the background is not flat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/4 h-64 opacity-45 blur-3xl"
        style={{
          background:
            'radial-gradient(40% 60% at 25% 50%, rgba(56,189,248,0.35), transparent 70%),' +
            'radial-gradient(40% 60% at 75% 50%, rgba(168,85,247,0.30), transparent 70%)',
        }}
      />

      <header className="relative flex items-center justify-between px-5 pt-3">
        <LevelBadge levelId={game.levelId} code={game.levelCode} />

        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/8 px-3.5 py-1.5 text-sm tabular-nums ring-1 ring-white/10">
            <span className="font-semibold">{game.moveCount}</span>
            {par > 0 && <span className="text-slate-400"> / {par}</span>}
          </div>

          {/* Reachable at any time, and it never asks. No dot, no badge, no reminder — it
              looks the same whether or not there is an account behind it. */}
          <button
            type="button"
            aria-label={
              game.identity !== null && !game.identity.isAnonymous
                ? `Logged in as ${game.identity.username ?? 'your account'}`
                : 'Not logged in — log in or register'
            }
            onClick={() => setAccountOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-white/8 py-1.5 pl-2.5 pr-3 text-sm text-slate-300 ring-1 ring-white/10"
          >
            {game.identity !== null && !game.identity.isAnonymous ? (
              <span
                className="h-4 w-4 shrink-0"
                style={ballStyle(colourForName(game.identity.username ?? game.identity.playerId))}
              />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-white/25" />
            )}
            <span className="max-w-[7rem] truncate">
              {game.identity !== null && !game.identity.isAnonymous
                ? (game.identity.username ?? 'Account')
                : 'Log in'}
            </span>
          </button>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-2">
        {game.load === 'loading' && (
          <motion.div
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-sm text-slate-400"
          >
            Loading level…
          </motion.div>
        )}

        {game.load === 'error' && (
          <div className="max-w-xs text-center text-sm text-slate-400">
            <p className="mb-1 font-medium text-slate-200">Can’t reach the level server</p>
            <p className="text-xs leading-relaxed">
              Start it with{' '}
              <code className="text-slate-300">dotnet run --project src/Puzzle.Server</code>
            </p>
          </div>
        )}

        {game.load === 'ready' && board && (
          <div className="flex max-w-xl flex-wrap items-end justify-center">
            {board.tubes.map((tube, index) => (
              <Tube
                key={index}
                items={tube}
                capacity={board.capacity}
                selected={game.selected === index}
                complete={isComplete(tube, board.capacity)}
                onTap={() => {
                  haptics.move();
                  game.tapTube(index);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="relative flex items-center justify-center gap-3 px-5 pb-5 pt-2">
        <IconButton label="Previous level" onClick={() => game.goToLevel(game.levelId - 1)} disabled={game.levelId <= 1}>
          ‹
        </IconButton>
        <IconButton
          label={`Undo last move, ${game.undosRemaining} left`}
          onClick={game.undo}
          disabled={!game.canUndo}
          remaining={game.undosRemaining}
        >
          ↶
        </IconButton>
        <IconButton
          label="Show me a move"
          onClick={() => {
            haptics.move();
            game.useHint();
          }}
          disabled={game.stuck || game.solved}
        >
          ?
        </IconButton>
        <IconButton
          label="Restart level"
          onClick={() => setConfirmingReset(true)}
        >
          ↻
        </IconButton>
        <IconButton label="Next level" onClick={() => game.goToLevel(game.levelId + 1)} disabled={game.levelId >= game.levelCeiling}>
          ›
        </IconButton>
      </footer>

      <AccountPanel
        open={accountOpen}
        identity={game.identity}
        onClose={() => setAccountOpen(false)}
        onLoggedIn={(who) => {
          setAccountOpen(false);
          void game.loggedIn(who);
        }}
        onRegistered={(username) => {
          setAccountOpen(false);
          game.registered(username);
        }}
        onLogOut={() => {
          setAccountOpen(false);
          void game.logOut();
        }}
        onUnlockWithCode={game.unlockWithCode}
      />

      {/* A restart throws away the progress on the level, so it is asked about first. */}
      <AnimatePresence>
        {confirmingReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmingReset(false)}
            className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 24, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.97, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[19rem] rounded-3xl bg-slate-800/95 p-6 text-center shadow-2xl ring-1 ring-white/10"
            >
              <p className="text-lg font-semibold">Restart this level?</p>
              <p className="mt-1 text-sm text-slate-400">You get your undos back.</p>

              <button
                type="button"
                onClick={() => {
                  setConfirmingReset(false);
                  game.restart();
                }}
                className="mt-5 w-full rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-500/25"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {game.stuck && !game.solved && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-5"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-amber-500/12 px-4 py-3 text-sm ring-1 ring-amber-400/30 backdrop-blur">
              <span className="text-amber-200">No moves left.</span>
              <button
                type="button"
                onClick={game.undo}
                disabled={!game.canUndo}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100"
              >
                Restart
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNote && note !== null && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-6"
          >
            <div className="rounded-2xl bg-slate-800/95 px-4 py-2.5 text-center text-sm text-slate-200 shadow-xl ring-1 ring-white/10 backdrop-blur">
              {note}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {game.solved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 30, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              className="w-full max-w-[19rem] rounded-3xl bg-slate-800/95 p-7 text-center shadow-2xl ring-1 ring-white/10"
            >
              <motion.div
                initial={{ scale: 0.4, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 15, delay: 0.08 }}
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15 text-3xl ring-1 ring-sky-400/40"
              >
                ✓
              </motion.div>

              <p className="text-2xl font-bold tracking-tight">Solved</p>
              <p className="mt-1 text-sm text-slate-400">
                {game.moveCount} moves
                {par > 0 && game.moveCount <= par && ' · under par'}
                {game.hintsUsed > 0 &&
                  ` · ${game.hintsUsed} hint${game.hintsUsed === 1 ? '' : 's'}`}
              </p>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => game.goToLevel(game.levelId + 1)}
                className="mt-6 w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-sky-500/30"
              >
                Next level
              </motion.button>
              <button
                type="button"
                onClick={game.restart}
                className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400"
              >
                Play again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
