import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { FlaskLogo } from './FlaskLogo';
import { useGameContext } from './GameContext';
import { StatsRibbon } from './StatsRibbon';
import { ProgressTiles } from './ProgressTiles';
import { RecentGames } from './RecentGames';
import { ActivityFeed } from './ActivityFeed';

export function MainMenu() {
  const game = useGameContext();
  const navigate = useNavigate();
  const totalPoints = game.progress?.totalPoints ?? 0;

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const onPlay = useCallback(() => navigate('/play'), [navigate]);
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

      </motion.div>
    </div>
  );
}
