import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from './GameContext';
import { PageHeader } from './PageHeader';
import { LevelLeaderboard } from './LevelLeaderboard';

type TileState = 'completed' | 'current' | 'unlocked' | 'locked';

const PAGE_SIZE = 50;

function tileState(
  level: number,
  currentLevel: number,
  ceiling: number,
  progress: Map<number, { moves: number; hints: number; stars: number; points: number }>,
): TileState {
  if (progress.has(level)) return 'completed';
  if (level === currentLevel) return 'current';
  if (level <= ceiling) return 'unlocked';
  return 'locked';
}

const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

export function LevelSelect() {
  const { t } = useTranslation();
  const game = useGameContext();
  const navigate = useNavigate();
  const { levelId, levelCeiling, levelProgress: progress } = game;
  const totalPoints = game.progress?.totalPoints ?? 0;

  const [levelCode, setLevelCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(levelId > 0 ? levelId : null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  async function handleCodeUnlock() {
    setCodeError(null);
    setBusy(true);
    const result = await game.unlockWithCode(levelCode);
    setBusy(false);
    if (result === null) {
      setCodeError(t('levels.invalidCode'));
    } else {
      setLevelCode('');
      navigate('/play');
    }
  }

  const previewEnd = Math.ceil((levelCeiling + 5) / 5) * 5;
  const totalTiles = Math.max(previewEnd, levelCeiling + 5);

  const pageCount = Math.ceil(totalTiles / PAGE_SIZE);

  const [page, setPage] = useState(() => {
    if (levelId <= 0) return 0;
    const index = totalTiles - levelId;
    if (index < 0) return 0;
    return Math.min(Math.floor(index / PAGE_SIZE), pageCount - 1);
  });

  const pageStart = totalTiles - page * PAGE_SIZE;
  const pageEnd = Math.max(1, pageStart - PAGE_SIZE + 1);
  const tiles: number[] = [];
  for (let i = pageStart; i >= pageEnd; i--) {
    tiles.push(i);
  }

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onBack() {
    navigate('/');
  }

  function playLevel(level: number) {
    game.goToLevel(level);
    navigate('/play');
  }

  function handleTileClick(level: number, state: TileState) {
    if (state === 'locked') return;
    setSelectedLevel(level);
    setShowMobilePanel(true);
  }

  useEffect(() => {
    function findVerticalNeighbour(current: number, dir: 'up' | 'down'): number {
      const el = tileRefs.current[current];
      if (!el) return current;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let bestIdx = current;
      let bestDist = Infinity;

      for (let i = 0; i < tiles.length; i++) {
        if (i === current) continue;
        const other = tileRefs.current[i];
        if (!other) continue;
        const r = other.getBoundingClientRect();
        const ox = r.left + r.width / 2;
        const oy = r.top + r.height / 2;

        if (dir === 'down' && oy <= cy + 1) continue;
        if (dir === 'up' && oy >= cy - 1) continue;

        const dist = Math.hypot(ox - cx, oy - cy);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      return bestIdx;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showMobilePanel) {
          setShowMobilePanel(false);
        } else {
          onBack();
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const cur = prev ?? (() => {
            const idx = tiles.indexOf(selectedLevel ?? levelId);
            return idx >= 0 ? idx : 0;
          })();
          let next: number;
          if (e.key === 'ArrowRight') {
            next = Math.min(cur + 1, tiles.length - 1);
          } else if (e.key === 'ArrowLeft') {
            next = Math.max(cur - 1, 0);
          } else if (e.key === 'ArrowDown') {
            next = findVerticalNeighbour(cur, 'down');
          } else {
            next = findVerticalNeighbour(cur, 'up');
          }

          const level = tiles[next];
          const state = tileState(level, levelId, levelCeiling, progress);
          if (state !== 'locked') {
            setSelectedLevel(level);
          }
          return next;
        });
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (selectedLevel === null) return;
        e.preventDefault();
        const state = tileState(selectedLevel, levelId, levelCeiling, progress);
        if (state !== 'locked') {
          game.goToLevel(selectedLevel);
          navigate('/play');
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [tiles, levelId, levelCeiling, progress, focusedIndex, selectedLevel, showMobilePanel, game, navigate]);

  useEffect(() => {
    if (focusedIndex !== null) {
      tileRefs.current[focusedIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [focusedIndex]);

  function prevPage() {
    setPage(p => Math.max(0, p - 1));
    setFocusedIndex(null);
  }

  function nextPage() {
    setPage(p => Math.min(pageCount - 1, p + 1));
    setFocusedIndex(null);
  }

  function handlePointerDown() {
    setFocusedIndex(null);
  }

  const selectedState = selectedLevel !== null ? tileState(selectedLevel, levelId, levelCeiling, progress) : null;
  const selectedEntry = selectedLevel !== null ? progress.get(selectedLevel) : undefined;

  const gridContent = (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))]">
        {tiles.map((level, i) => {
          const state = tileState(level, levelId, levelCeiling, progress);
          const entry = progress.get(level);
          const accessible = state !== 'locked';
          const isSelected = selectedLevel === level;

          return (
            <motion.button
              ref={(el) => { tileRefs.current[i] = el; }}
              key={level}
              type="button"
              disabled={!accessible}
              whileTap={accessible ? { scale: 0.92 } : undefined}
              transition={{ type: 'spring', stiffness: 700, damping: 26 }}
              onClick={() => handleTileClick(level, state)}
              onPointerDown={handlePointerDown}
              data-testid={`tile-${level}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl text-center transition-colors ${tileClasses(state, isSelected)}`}
            >
              <span className={`text-base font-semibold tabular-nums ${state === 'locked' ? 'text-slate-600' : 'text-slate-200'}${level === 88 ? ' blur-sm' : ''}`}>
                {level}
              </span>
              {state === 'completed' && entry && entry.stars > 0 && (
                <span className="mt-0.5 flex gap-px text-[0.55rem]">
                  {[1, 2, 3].map((s) => (
                    <span key={s} className={s <= entry.stars ? 'text-amber-400' : 'text-slate-600'}>★</span>
                  ))}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-4">
          <button
            type="button"
            onClick={prevPage}
            disabled={page === 0}
            data-testid="page-prev"
            aria-label={t('levels.prevPage')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-sm text-slate-300 ring-1 ring-white/10 transition-colors hover:bg-white/15 disabled:opacity-30 disabled:cursor-default"
          >
            ‹
          </button>
          <span data-testid="page-indicator" className="text-sm tabular-nums text-slate-400">
            {t('levels.pageOf', { current: page + 1, total: pageCount })}
          </span>
          <button
            type="button"
            onClick={nextPage}
            disabled={page === pageCount - 1}
            data-testid="page-next"
            aria-label={t('levels.nextPage')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-sm text-slate-300 ring-1 ring-white/10 transition-colors hover:bg-white/15 disabled:opacity-30 disabled:cursor-default"
          >
            ›
          </button>
        </div>
      )}

      {/* Level code entry */}
      <div className="mx-auto mt-6 flex max-w-xs items-center gap-2">
        <input
          value={levelCode}
          onChange={(e) => { setLevelCode(e.target.value); setCodeError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && levelCode.trim().length > 0 && !busy) void handleCodeUnlock();
          }}
          autoComplete="off"
          spellCheck={false}
          maxLength={6}
          placeholder={t('levels.codePlaceholder')}
          className="min-w-0 flex-1 rounded-2xl bg-slate-950/50 px-4 py-2.5 text-center font-mono text-sm uppercase tracking-widest text-slate-100 outline-none ring-1 ring-white/10 transition placeholder:text-slate-500 placeholder:tracking-normal placeholder:normal-case focus:ring-2 focus:ring-sky-400/70"
          data-testid="code-input"
        />
        <button
          type="button"
          onClick={() => void handleCodeUnlock()}
          disabled={busy || levelCode.trim().length === 0}
          className="flex-shrink-0 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400 disabled:opacity-45"
        >
          {busy ? '...' : t('levels.unlock')}
        </button>
      </div>
      <AnimatePresence>
        {codeError !== null && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-center text-xs text-rose-300"
          >
            {codeError}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );

  const detailPanel = selectedLevel !== null && (
    <motion.div
      key={selectedLevel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="rounded-3xl bg-slate-800/60 p-5 ring-1 ring-white/10"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-lg font-bold text-white" style={fredoka}>
          Level {selectedLevel}
        </span>
        {selectedEntry && selectedEntry.stars > 0 && (
          <span className="flex gap-0.5">
            {[1, 2, 3].map((s) => (
              <span key={s} className={`text-sm ${s <= selectedEntry.stars ? 'text-amber-400' : 'text-slate-600'}`}>★</span>
            ))}
          </span>
        )}
      </div>

      <LevelLeaderboard level={selectedLevel} myId={game.identity?.playerId} />

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => playLevel(selectedLevel)}
        className="mt-5 w-full rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-500/30"
        style={fredoka}
      >
        {selectedState === 'completed' ? t('game.playAgain') : t('levels.play')}
      </motion.button>
    </motion.div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={t('levels.title')}
        trailing={totalPoints > 0 ? (
          <span className="text-sm font-medium tabular-nums text-amber-400">
            ★ {totalPoints.toLocaleString()}
          </span>
        ) : undefined}
      />
      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
        <div className="mx-auto w-full max-w-lg sm:max-w-4xl sm:grid sm:grid-cols-[1fr_20rem] sm:gap-6">
          <div>{gridContent}</div>
          <div className="hidden sm:block sticky top-0 self-start">
            {detailPanel || (
              <div className="flex h-48 items-center justify-center rounded-3xl bg-white/3 ring-1 ring-white/5">
                <p className="text-sm text-slate-500" style={fredoka}>{t('levelLeaderboard.selectLevel')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: full-screen leaderboard overlay */}
      <AnimatePresence>
        {selectedLevel !== null && showMobilePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/75 backdrop-blur-sm sm:hidden"
            onClick={() => setShowMobilePanel(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-slate-800/95 p-5 shadow-2xl ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-bold text-white" style={fredoka}>
                  Level {selectedLevel}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMobilePanel(false)}
                  className="text-sm text-slate-500"
                >
                  ✕
                </button>
              </div>

              {selectedEntry && selectedEntry.stars > 0 && (
                <div className="mb-3 flex gap-0.5">
                  {[1, 2, 3].map((s) => (
                    <span key={s} className={`text-sm ${s <= selectedEntry.stars ? 'text-amber-400' : 'text-slate-600'}`}>★</span>
                  ))}
                </div>
              )}

              <LevelLeaderboard level={selectedLevel} myId={game.identity?.playerId} />

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => playLevel(selectedLevel)}
                className="mt-5 w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-sky-500/30"
                style={fredoka}
              >
                {selectedState === 'completed' ? t('game.playAgain') : t('levels.play')}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function tileClasses(state: TileState, isSelected: boolean): string {
  if (isSelected) {
    return 'bg-violet-500/20 ring-2 ring-violet-400/60 shadow-lg shadow-violet-500/20';
  }
  switch (state) {
    case 'completed':
      return 'bg-white/8 ring-1 ring-white/10';
    case 'current':
    case 'unlocked':
      return 'bg-white/5 ring-1 ring-white/8';
    case 'locked':
      return 'bg-white/3 opacity-40 cursor-default';
  }
}
