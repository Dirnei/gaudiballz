import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { FlaskLogo } from './FlaskLogo';
import { useGameContext } from './GameContext';
import { StatsRibbon } from './StatsRibbon';
import { ProgressTiles } from './ProgressTiles';
import { RecentGames } from './RecentGames';
import { ActivityFeed } from './ActivityFeed';
import { needsTutorial } from './tutorial';

export function MainMenu() {
  const game = useGameContext();
  const navigate = useNavigate();
  const totalPoints = game.progress?.totalPoints ?? 0;

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const onPlay = useCallback(() => navigate(needsTutorial() ? '/tutorial' : '/play'), [navigate]);
  const onLevelSelect = useCallback(() => navigate('/levels'), [navigate]);

  const actions = useMemo(() => [onPlay, onLevelSelect], [onPlay, onLevelSelect]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === null) return 0;
          const dir = e.key === 'ArrowDown' ? 1 : -1;
          return (prev + dir + actions.length) % actions.length;
        });
        return;
      }

      if ((e.key === 'Enter' || e.key === ' ') && focusedIndex !== null) {
        e.preventDefault();
        actions[focusedIndex]();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [actions, focusedIndex]);

  function handlePointerDown() {
    setFocusedIndex(null);
  }

  function fc(idx: number) {
    return focusedIndex === idx ? ' kb-focus' : '';
  }

  const playIdx = 0;
  const levelSelectIdx = 1;

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 pb-4">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-3xl"
      >
        {/* Hero */}
        <div className="pb-2 pt-8 text-center">
          <div className="mb-2 flex justify-center">
            <FlaskLogo className="h-16 w-auto text-slate-200" />
          </div>
          <h1
            className="text-4xl font-bold tracking-tight text-white"
            style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
          >
            GAUDI BALLZ
          </h1>
          <p className="mt-2 text-sm text-slate-400">Sort the colours. Clear the board.</p>
          {totalPoints > 0 && (
            <p className="mt-3 text-sm font-medium tabular-nums text-amber-400">
              ★ {totalPoints.toLocaleString()} pts
            </p>
          )}

          {/* Play + actions */}
          <div className="mx-auto mt-6 flex max-w-xs flex-wrap justify-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onPlay}
              onPointerDown={handlePointerDown}
              className={`rounded-2xl bg-sky-500 px-8 py-3 font-semibold text-white shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400${fc(playIdx)}`}
              style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
              data-testid="menu-play"
            >
              Play
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onLevelSelect}
              onPointerDown={handlePointerDown}
              className={`rounded-2xl border border-white/14 px-5 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200${fc(levelSelectIdx)}`}
              style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
              data-testid="menu-level-select"
            >
              Level Select
            </motion.button>
          </div>
        </div>

        {/* Community stats */}
        <StatsRibbon />

        {/* Progress tiles */}
        <div className="mt-2">
          <ProgressTiles />
        </div>

        {/* Recent games + Activity feed */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <RecentGames />
          <ActivityFeed />
        </div>

        {/* Support */}
        <div className="mt-8 flex justify-center pb-2">
          <a
            href="https://ko-fi.com/dirnei"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-rose-400" aria-hidden="true">
              <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
            </svg>
            Support on Ko-fi
          </a>
        </div>

      </motion.div>
    </div>
  );
}
