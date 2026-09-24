import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { FlaskLogo } from './FlaskLogo';
import { formatTime } from './LiveTimer';
import { useDailyGame } from './useDailyGame';
import { DailyLeaderboard } from './DailyLeaderboard';
import { ALL_CONTROLS, GameBoard } from './board/GameBoard';

/** Format remaining time as e.g. "5h 32m" or "12m 5s". */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function NextDailyCountdown() {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() => msUntilMidnightUTC());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(msUntilMidnightUTC()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p className="mt-2 text-xs text-slate-500">
      {t('daily.nextIn', { time: formatCountdown(remaining) })}
    </p>
  );
}

function msUntilMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getTime() - now.getTime();
}

function formatDailyDate(dateStr: string, lng: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString(lng, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return dateStr;
  }
}

export function DailyScreen() {
  const { t, i18n } = useTranslation();
  const game = useDailyGame();
  const navigate = useNavigate();

  const par = game.puzzle?.parMoves ?? 0;
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const goHome = useCallback(() => navigate('/'), [navigate]);

  const onSolvedKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      navigate('/');
    }
  }, [navigate]);

  return (
    <>
      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-1">
        <button
          type="button"
          aria-label={t('brand.homeLabel')}
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <FlaskLogo className="h-8 w-auto text-slate-200" />
        </button>
        <div className="flex flex-col">
          <span
            className="text-base font-bold tracking-tight text-white"
            style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
          >
            {t('daily.title')}
          </span>
          {game.puzzle && (
            <span className="text-xs text-slate-400">
              {formatDailyDate(game.puzzle.date, i18n.language)}
            </span>
          )}
        </div>
      </header>

      {/* Already completed — show leaderboard directly */}
      {game.alreadyDone && !game.solved && (
        <main className="relative flex flex-1 flex-col items-center overflow-y-auto px-4 pt-4">
          <div className="w-full max-w-sm">
            <DailyLeaderboard />
            <NextDailyCountdown />
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-4 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400"
            >
              {t('nav.backToMenu')}
            </button>
          </div>
        </main>
      )}

      {/* Main area — gameplay */}
      {!game.alreadyDone && (
        <GameBoard
          game={game}
          load={game.load}
          loadingText={t('daily.loading')}
          controls={ALL_CONTROLS}
          par={par}
          timeTargetMs={game.puzzle?.timeTargetMs}
          onHome={goHome}
          onSolvedKey={onSolvedKey}
        />
      )}

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
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-3xl ring-1 ring-amber-400/40"
              >
                ✓
              </motion.div>

              <p className="text-2xl font-bold tracking-tight">{t('daily.solved')}</p>

              {game.completion && (
                <>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    {[1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`text-2xl ${i <= game.completion!.stars ? 'text-amber-400' : 'text-slate-600'}`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="ml-2 text-sm font-medium text-amber-400">
                      {t('game.points', { points: game.completion.points })}
                    </span>
                  </div>

                  {game.completion.isNewBest && (
                    <p className="mt-1 text-xs font-semibold text-amber-400/80">
                      {t('daily.newBest')}
                    </p>
                  )}
                </>
              )}

              <p className="mt-1 text-sm text-slate-400">
                {t('game.moves', { count: game.moveCount })}
                {par > 0 && game.moveCount <= par && ` · ${t('game.underPar')}`}
                {game.hintsUsed > 0 && ` · ${t('game.hints', { count: game.hintsUsed })}`}
              </p>
              <p className="mt-0.5 text-sm tabular-nums text-slate-400">
                {formatTime(game.elapsed.elapsedMs())}s
                {game.puzzle?.timeTargetMs != null && (
                  <span className="text-slate-500"> / {formatTime(game.puzzle.timeTargetMs)}s</span>
                )}
              </p>

              <NextDailyCountdown />

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowLeaderboard(true)}
                className="mt-5 w-full rounded-2xl bg-amber-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-amber-500/30"
              >
                {t('daily.viewLeaderboard')}
              </motion.button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400"
              >
                {t('nav.backToMenu')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Leaderboard modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaderboard(false)}
            className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 24, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.97, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-3xl bg-slate-800/95 p-5 shadow-2xl ring-1 ring-white/10"
            >
              <DailyLeaderboard />
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="mt-4 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400"
              >
                {t('game.restartCancel')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
