import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from './GameContext';
import { AchievementToast } from './AchievementToast';
import { AccountBall } from './AccountBall';
import { AccountPanel } from './AccountPanel';
import { copyText } from './clipboard';
import { FlaskLogo } from './FlaskLogo';
import { formatTime } from './LiveTimer';
import { LevelLeaderboard } from './LevelLeaderboard';
import { LeaveAttemptPrompt } from './LeaveAttemptPrompt';
import { MissedStars } from './MissedStars';
import { ShareResultButton } from './ShareResultButton';
import { buildShareText, resultUrl } from './shareResult';
import { ALL_CONTROLS, GameBoard } from './board/GameBoard';

function LevelBadge({ levelId, code }: { levelId: number; code: string | null }) {
  const { t } = useTranslation();
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
      <span className={`text-sm font-semibold${levelId === 88 ? ' blur-sm' : ''}`}>{t('game.level', { id: levelId })}</span>
      {code !== null && (
        <span className="rounded-md bg-white/6 px-1.5 py-0.5 font-mono text-[0.65rem] tracking-widest text-slate-400 transition-colors group-active:bg-sky-500/20 group-active:text-sky-300">
          {copied ? '✓' : code}
        </span>
      )}
    </button>
  );
}

export function GameScreen() {
  const { t } = useTranslation();
  const game = useGameContext();
  const navigate = useNavigate();

  const par = game.info?.parMoves ?? 0;

  const goHome = useCallback(() => navigate('/'), [navigate]);

  const onSolvedKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      game.goToLevel(game.levelId + 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      game.goToLevel(game.levelId);
    }
  }, [game]);

  const note = game.info?.chapterNote ?? null;
  const [showNote, setShowNote] = useState(false);
  const [showLevelBoard, setShowLevelBoard] = useState(false);

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
      <LeaveAttemptPrompt active={game.attemptOpen} onLeave={game.abandonAttempt} />

      <header className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-1">
        <button
          type="button"
          aria-label={t('brand.homeLabel')}
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
                ? t('account.loggedInAs', { username: game.identity.username ?? t('account.yourAccount') })
                : t('account.notLoggedIn')
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
                ? (game.identity.username ?? t('account.fallback'))
                : t('account.logIn')}
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

      <GameBoard
        game={game}
        load={game.load}
        controls={ALL_CONTROLS}
        par={par}
        timeTargetMs={game.info?.timeTargetMs}
        statsLead={<LevelBadge levelId={game.levelId} code={game.levelCode} />}
        onHome={goHome}
        onSolvedKey={onSolvedKey}
        focusResetKey={game.levelId}
      />

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

              <p className="text-2xl font-bold tracking-tight">{t('game.solved')}</p>

              {game.attemptStars > 0 && (() => {
                const bonus = game.replayBonus + game.timeBonus + game.noHintBonus + game.firstClearBonus + game.streakBonus;
                const totalEarned = game.starDelta + bonus;
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
                      <span className="ml-2 text-sm font-medium text-amber-400">
                        {t('game.points', { points: game.attemptPoints })}
                      </span>
                    </div>

                    <MissedStars
                      stars={game.attemptStars}
                      attempt={{
                        moves: game.moveCount,
                        par,
                        elapsedMs: game.elapsed.elapsedMs(),
                        timeTargetMs: game.info?.timeTargetMs,
                        hintsUsed: game.hintsUsed,
                      }}
                    />

                    {totalEarned > 0 && (
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                        {game.starDelta > 0 && <span className="text-amber-400/80">{t('game.starUpgrade', { points: game.starDelta })}</span>}
                        {game.noHintBonus > 0 && <span className="text-emerald-400/80">{t('game.noHint', { points: game.noHintBonus })}</span>}
                        {game.firstClearBonus > 0 && <span className="text-sky-400/80">{t('game.firstClear', { points: game.firstClearBonus })}</span>}
                        {game.streakBonus > 0 && <span className="text-orange-400/80">{t('game.streak', { points: game.streakBonus })}</span>}
                        {game.timeBonus > 0 && <span className="text-amber-400/80">{t('game.bestTime', { points: game.timeBonus })}</span>}
                        {game.replayBonus > 0 && <span>{t('game.replay', { points: game.replayBonus })}</span>}
                      </div>
                    )}

                    {bestStars > 0 && bestStars > game.attemptStars && (
                      <p className="mt-1 text-xs text-slate-500">
                        {t('game.bestStars')} {'★'.repeat(bestStars)}{'☆'.repeat(3 - bestStars)}
                      </p>
                    )}

                    {game.rankUp && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
                        className={`mt-3 rounded-xl px-3 py-2 text-center ${
                          game.rankUp.kind === 'tierPromotion'
                            ? 'bg-gradient-to-r from-amber-500/20 to-violet-500/20 ring-1 ring-amber-400/30'
                            : 'bg-white/5 ring-1 ring-white/10'
                        }`}
                      >
                        <p className={`text-sm font-semibold ${game.rankUp.kind === 'tierPromotion' ? 'text-amber-300' : 'text-slate-300'}`}>
                          {t(`rank.${game.rankUp.newTier}`)} {game.rankUp.newSubLevel}
                        </p>
                      </motion.div>
                    )}
                  </>
                );
              })()}

              <p className="mt-1 text-sm text-slate-400">
                {t('game.moves', { count: game.moveCount })}
                {par > 0 && game.moveCount <= par && ` · ${t('game.underPar')}`}
                {game.hintsUsed > 0 &&
                  ` · ${t('game.hints', { count: game.hintsUsed })}`}
              </p>
              <p className="mt-0.5 text-sm tabular-nums text-slate-400">
                {formatTime(game.elapsed.elapsedMs())}s
                {game.info?.timeTargetMs != null && (
                  <span className="text-slate-500"> / {formatTime(game.info.timeTargetMs)}s</span>
                )}
              </p>

              {/* Per-level leaderboard toggle */}
              <button
                type="button"
                onClick={() => setShowLevelBoard((v) => !v)}
                className="mt-4 w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-violet-300 ring-1 ring-white/10"
              >
                {t('levelLeaderboard.viewLeaderboard')} {showLevelBoard ? '▾' : '▸'}
              </button>
              <AnimatePresence>
                {showLevelBoard && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 text-left">
                      <LevelLeaderboard level={game.levelId} myId={game.identity?.playerId} compact />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => game.goToLevel(game.levelId + 1)}
                className="mt-6 w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-sky-500/30"
              >
                {t('game.nextLevel')}
              </motion.button>
              {game.attemptStars > 0 && game.info && (
                <ShareResultButton
                  text={() => buildShareText(
                    {
                      title: t('game.shareTitle', { id: game.levelId }),
                      stars: game.attemptStars,
                      moves: game.moveCount,
                      par,
                      elapsedMs: game.elapsed.elapsedMs(),
                      timeTargetMs: game.info!.timeTargetMs,
                      hintsUsed: game.hintsUsed,
                      url: resultUrl(game.shareId, '/'),
                    },
                    t,
                  )}
                />
              )}
              <button
                type="button"
                onClick={game.restart}
                className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400"
              >
                {t('game.playAgain')}
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
        onEmailChanged={game.emailChanged}
        ballUnlocks={game.ballUnlocks}
        highestCompleted={game.progress?.highestCompleted ?? 0}
        onChooseBall={game.chooseBall}
      />
    </>
  );
}
