import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Tube } from './Tube';
import { useGameContext } from './GameContext';
import { HINT_COOLDOWN_MS } from './attempt';
import { AchievementToast } from './AchievementToast';
import { AccountBall } from './AccountBall';
import { AccountPanel } from './AccountPanel';
import { FlaskLogo } from './FlaskLogo';
import { LiveTimer, formatTime } from './LiveTimer';
import { haptics } from './haptics';

function isComplete(tube: readonly number[], capacity: number): boolean {
  return tube.length === capacity && tube.every((colour) => colour === tube[0]);
}

function hintLabel(remaining: number, cooldownEnd: number | null): string {
  if (remaining === 0) {
    return 'No hints left this attempt';
  }
  if (cooldownEnd !== null) {
    return `Show me a move, ${remaining} left — available shortly`;
  }
  return `Show me a move, ${remaining} left`;
}

function CooldownSweep({ end, duration }: { end: number; duration: number }) {
  const [readAt, setReadAt] = useState(() => Date.now());

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setReadAt(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const elapsed = Math.min(duration, Math.max(0, duration - (end - readAt)));

  return (
    <svg
      aria-hidden
      viewBox="0 0 56 56"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full -rotate-90"
    >
      <circle
        key={readAt}
        cx="28"
        cy="28"
        r={radius}
        fill="none"
        stroke="rgba(56,189,248,0.65)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{
          ['--cooldown-circumference' as string]: `${circumference}`,
          animation: `hint-cooldown ${duration}ms linear forwards`,
          animationDelay: `-${elapsed}ms`,
        }}
      />
    </svg>
  );
}

function ControlButton({
  label,
  text,
  onClick,
  disabled,
  children,
  badge,
}: {
  label: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 700, damping: 26 }}
      className="relative flex flex-col items-center gap-1 rounded-2xl bg-white/8 px-3 py-2.5 text-slate-200 ring-1 ring-white/10 transition-colors disabled:opacity-30"
    >
      {children}
      <span className="text-[0.6rem] font-medium uppercase tracking-wider text-slate-400">{text}</span>
      {badge !== undefined && (
        <span
          className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.55rem] font-semibold tabular-nums ${
            badge === 0
              ? 'bg-slate-700 text-slate-500'
              : 'bg-slate-900 text-slate-200 ring-1 ring-white/15'
          }`}
        >
          {badge}
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

export function GameScreen() {
  const game = useGameContext();
  const navigate = useNavigate();
  const completedCount = useRef(0);

  const board = game.state?.board;
  const done = board ? board.tubes.filter((t) => isComplete(t, board.capacity)).length : 0;

  useEffect(() => {
    if (done > completedCount.current) {
      haptics.complete();
    }
    completedCount.current = done;
  }, [done]);

  useEffect(() => {
    if (game.solved) haptics.win();
  }, [game.solved]);

  useEffect(() => {
    if (game.stuck) haptics.blocked();
  }, [game.stuck]);

  const par = game.info?.parMoves ?? 0;
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (confirmingReset) {
      game.elapsed.pause();
    } else {
      game.elapsed.resume();
    }
  }, [confirmingReset, game.elapsed]);

  const [focusedTube, setFocusedTube] = useState<number | null>(null);
  const tubeRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setFocusedTube(null);
  }, [game.levelId]);

  const handleTubeTap = useCallback(
    (index: number) => {
      haptics.move();
      game.tapTube(index);
      setFocusedTube(index);
    },
    [game],
  );

  function findVerticalNeighbour(from: number, direction: 'up' | 'down'): number | null {
    const refs = tubeRefs.current;
    const origin = refs[from]?.getBoundingClientRect();
    if (!origin) return null;

    let best: number | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < refs.length; i++) {
      if (i === from) continue;
      const rect = refs[i]?.getBoundingClientRect();
      if (!rect) continue;

      const above = direction === 'up' && rect.top < origin.top - 1;
      const below = direction === 'down' && rect.top > origin.top + 1;
      if (!above && !below) continue;

      const dx = rect.left + rect.width / 2 - (origin.left + origin.width / 2);
      const dy = rect.top + rect.height / 2 - (origin.top + origin.height / 2);
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inTextInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (confirmingReset) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setConfirmingReset(false);
          game.restart();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setConfirmingReset(false);
        }
        return;
      }

      if (game.solved) {
        if (e.key === 'Enter') {
          e.preventDefault();
          game.goToLevel(game.levelId + 1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          game.goToLevel(game.levelId);
        }
        return;
      }

      const tubeCount = board?.tubes.length ?? 0;

      switch (e.key) {
        case 'ArrowLeft': {
          e.preventDefault();
          if (tubeCount === 0) return;
          setFocusedTube((prev) => {
            const next = prev === null ? 0 : (prev - 1 + tubeCount) % tubeCount;
            tubeRefs.current[next]?.scrollIntoView({ block: 'nearest' });
            return next;
          });
          return;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (tubeCount === 0) return;
          setFocusedTube((prev) => {
            const next = prev === null ? 0 : (prev + 1) % tubeCount;
            tubeRefs.current[next]?.scrollIntoView({ block: 'nearest' });
            return next;
          });
          return;
        }
        case 'ArrowUp':
        case 'ArrowDown': {
          e.preventDefault();
          if (tubeCount === 0) return;
          setFocusedTube((prev) => {
            if (prev === null) return 0;
            const neighbour = findVerticalNeighbour(prev, e.key === 'ArrowUp' ? 'up' : 'down');
            if (neighbour === null) return prev;
            tubeRefs.current[neighbour]?.scrollIntoView({ block: 'nearest' });
            return neighbour;
          });
          return;
        }
        case 'Enter':
        case ' ': {
          if (focusedTube === null) return;
          e.preventDefault();
          haptics.move();
          game.tapTube(focusedTube);
          return;
        }
        case 'Escape': {
          e.preventDefault();
          if (game.selected !== null) {
            game.tapTube(game.selected);
          } else {
            navigate('/');
          }
          return;
        }
      }

      if (inTextInput || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      if (e.key >= '1' && e.key <= '9') {
        const index = Number(e.key) - 1;
        if (index < tubeCount) {
          e.preventDefault();
          haptics.move();
          game.tapTube(index);
          setFocusedTube(index);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'u':
          if (game.canUndo) {
            e.preventDefault();
            game.undo();
          }
          return;
        case 'h':
          if (game.canHint) {
            e.preventDefault();
            haptics.move();
            game.useHint();
          }
          return;
        case 'r':
          e.preventDefault();
          setConfirmingReset(true);
          return;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [board, focusedTube, confirmingReset, game, navigate]);

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

  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <header className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-1">
        <button
          type="button"
          aria-label="Back to menu"
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <FlaskLogo className="h-8 w-auto text-slate-200" />
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
          >
            Gaudi Ballz
          </span>
        </button>
        <div className="ml-auto">
          <button
            type="button"
            aria-label={
              game.identity !== null && !game.identity.isAnonymous
                ? `Logged in as ${game.identity.username ?? 'your account'}`
                : 'Not logged in — log in or register'
            }
            onClick={() => {
              setAccountOpen(true);
              void game.ensureBallUnlocks();
              void game.ensureAchievements();
            }}
            className="flex items-center gap-1.5 rounded-full bg-white/8 py-1.5 pl-2.5 pr-3 text-sm text-slate-300 ring-1 ring-white/10"
          >
            <AccountBall identity={game.identity} />
            <span className="max-w-[7rem] truncate">
              {game.identity !== null && !game.identity.isAnonymous
                ? (game.identity.username ?? 'Account')
                : 'Log in'}
            </span>
          </button>
        </div>
      </header>

      <div className="relative z-10 hidden sm:flex justify-center pt-1">
        <span
          className="font-bold tracking-wide text-white/30"
          style={{ fontFamily: "'Fredoka', system-ui, sans-serif", fontSize: '4rem', lineHeight: 1 }}
        >
          GAUDI BALLZ
        </span>
      </div>

      <main className="relative flex flex-1 flex-col items-center justify-center px-2">
        {game.load === 'loading' && (
          <motion.div
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-sm text-slate-400"
          >
            Loading level...
          </motion.div>
        )}

        {game.load === 'error' && (
          <div className="max-w-xs text-center text-sm text-slate-400">
            <p className="mb-1 font-medium text-slate-200">Can&#39;t reach the level server</p>
            <p className="text-xs leading-relaxed">
              Start it with{' '}
              <code className="text-slate-300">dotnet run --project src/Puzzle.Server</code>
            </p>
          </div>
        )}

        {game.load === 'ready' && board && (
          <>
            <div
              className="grid max-w-full items-end justify-items-center"
              style={{
                gridTemplateColumns: `repeat(${
                  board.tubes.length <= 7
                    ? board.tubes.length
                    : Math.ceil(board.tubes.length / 2)
                }, min-content)`,
                justifyContent: 'center',
                contain: 'layout style',
              }}
            >
              {board.tubes.map((tube, index) => (
                <Tube
                  key={index}
                  ref={(el) => { tubeRefs.current[index] = el; }}
                  items={tube}
                  capacity={board.capacity}
                  selected={game.selected === index}
                  focused={focusedTube === index}
                  complete={isComplete(tube, board.capacity)}
                  onTap={() => handleTubeTap(index)}
                />
              ))}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <LevelBadge levelId={game.levelId} code={game.levelCode} />
              <div className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs tabular-nums ring-1 ring-white/10">
                <span className="font-semibold text-sm text-slate-200">{game.moveCount}</span>
                {par > 0 && <span className="text-slate-500">/ {par}</span>}
                <span className="text-slate-600">·</span>
                <LiveTimer
                  elapsedMs={game.elapsed.elapsedMs}
                  running={(game.selected !== null || game.moveCount > 0) && !game.solved}
                  timeTargetMs={game.info?.timeTargetMs}
                  className="text-slate-300"
                />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="relative flex items-center justify-center gap-3 px-5 pb-5 pt-2">
        <ControlButton
          label="Back to menu"
          text="Home"
          onClick={() => navigate('/')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
          </svg>
        </ControlButton>
        <ControlButton
          label={`Undo last move, ${game.undosRemaining} left`}
          text="Undo"
          onClick={game.undo}
          disabled={!game.canUndo}
          badge={game.undosRemaining}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clipRule="evenodd" />
          </svg>
        </ControlButton>
        <span className="relative inline-flex">
          {game.hintCooldownEnd !== undefined && game.hintCooldownEnd !== null && game.hintsRemaining !== 0 && (
            <CooldownSweep key={game.hintCooldownEnd} end={game.hintCooldownEnd} duration={HINT_COOLDOWN_MS} />
          )}
          <ControlButton
            label={hintLabel(game.hintsRemaining, game.hintCooldownEnd)}
            text="Hint"
            onClick={() => { haptics.move(); game.useHint(); }}
            disabled={!game.canHint}
            badge={game.hintsRemaining}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.062a.75.75 0 0 1-1.062-1.061l1.061-1.06a.75.75 0 0 1 1.06 0ZM3 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 8ZM14.75 7.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM7.5 8a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0ZM8 12.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.225.535l-1.25 1.224a.75.75 0 0 1-1.05 0l-1.25-1.224A.75.75 0 0 1 8 15.25v-3Z" />
            </svg>
          </ControlButton>
        </span>
        <ControlButton
          label="Restart level"
          text="Restart"
          onClick={() => setConfirmingReset(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.5a.75.75 0 0 0-.75.75v3.75a.75.75 0 0 0 1.5 0v-2.033l.364.363a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm-10.624-3.85a5.5 5.5 0 0 1 9.201-2.465l.312.31H11.75a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 .75-.75V2.5a.75.75 0 0 0-1.5 0v2.033l-.364-.364A7 7 0 0 0 3.238 7.187a.75.75 0 0 0 1.449.388Z" clipRule="evenodd" />
          </svg>
        </ControlButton>
      </footer>

      {/* Restart confirmation */}
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

      {/* Stuck notice */}
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

      {/* Chapter note */}
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

      <AchievementToast
        achievements={game.newAchievements}
        onDone={game.clearNewAchievements}
      />

      {/* Solved overlay */}
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

              {game.attemptStars > 0 && (() => {
                const totalEarned = game.starDelta + game.replayBonus + game.timeBonus;
                const best = game.levelProgress.get(game.levelId);
                const bestStars = best?.stars ?? 0;

                return (
                  <>
                    <div className="mt-2 flex items-center justify-center gap-1">
                      {[1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={`text-2xl ${i <= game.attemptStars ? 'text-amber-400' : 'text-slate-600'}`}
                        >
                          ★
                        </span>
                      ))}
                      {totalEarned > 0 && (
                        <span className="ml-2 text-sm font-medium text-amber-400">
                          +{totalEarned} pts
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                      {game.starDelta > 0 && <span className="text-amber-400/80">+{game.starDelta} star upgrade</span>}
                      {game.timeBonus > 0 && <span className="text-amber-400/80">+{game.timeBonus} best time</span>}
                      {game.replayBonus > 0 && <span>+{game.replayBonus} replay</span>}
                    </div>

                    {bestStars > 0 && bestStars > game.attemptStars && (
                      <p className="mt-1 text-xs text-slate-500">
                        Best: {'★'.repeat(bestStars)}{'☆'.repeat(3 - bestStars)}
                      </p>
                    )}
                  </>
                );
              })()}

              <p className="mt-1 text-sm text-slate-400">
                {game.moveCount} moves
                {par > 0 && game.moveCount <= par && ' · under par'}
                {game.hintsUsed > 0 &&
                  ` · ${game.hintsUsed} hint${game.hintsUsed === 1 ? '' : 's'}`}
              </p>
              <p className="mt-0.5 text-sm tabular-nums text-slate-400">
                {formatTime(game.elapsed.elapsedMs())}s
                {game.info?.timeTargetMs != null && (
                  <span className="text-slate-500"> / {formatTime(game.info.timeTargetMs)}s</span>
                )}
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
        ballUnlocks={game.ballUnlocks}
        highestCompleted={game.progress?.highestCompleted ?? 0}
        onChooseBall={game.chooseBall}
      />
    </>
  );
}
