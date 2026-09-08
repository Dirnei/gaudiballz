import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useGameContext } from './GameContext';
import { PageLayout } from './PageLayout';

type TileState = 'completed' | 'current' | 'unlocked' | 'locked';

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

export function LevelSelect() {
  const game = useGameContext();
  const navigate = useNavigate();
  const { levelId, levelCeiling, levelProgress: progress } = game;
  const totalPoints = game.progress?.totalPoints ?? 0;

  const previewEnd = Math.ceil((levelCeiling + 5) / 5) * 5;
  const totalTiles = Math.max(previewEnd, levelCeiling + 5);

  const tiles: number[] = [];
  for (let i = 1; i <= totalTiles; i++) {
    tiles.push(i);
  }

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onBack() {
    navigate('/');
  }

  function onSelectLevel(level: number) {
    game.goToLevel(level);
    navigate('/play');
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
        onBack();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          if (prev === null) {
            const idx = tiles.indexOf(levelId);
            return idx >= 0 ? idx : 0;
          }

          if (e.key === 'ArrowRight') return (prev + 1) % tiles.length;
          if (e.key === 'ArrowLeft') return (prev - 1 + tiles.length) % tiles.length;
          if (e.key === 'ArrowDown') return findVerticalNeighbour(prev, 'down');
          if (e.key === 'ArrowUp') return findVerticalNeighbour(prev, 'up');
          return prev;
        });
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (focusedIndex === null) return;
        e.preventDefault();
        const level = tiles[focusedIndex];
        const state = tileState(level, levelId, levelCeiling, progress);
        if (state !== 'locked') {
          onSelectLevel(level);
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [tiles, levelId, levelCeiling, progress, focusedIndex]);

  useEffect(() => {
    if (focusedIndex !== null) {
      tileRefs.current[focusedIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [focusedIndex]);

  function handlePointerDown() {
    setFocusedIndex(null);
  }

  return (
    <PageLayout
      title="Level Select"
      trailing={totalPoints > 0 ? (
        <span className="text-sm font-medium tabular-nums text-amber-400">
          ★ {totalPoints.toLocaleString()}
        </span>
      ) : undefined}
    >
      <div className="grid max-w-lg mx-auto grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(4rem,1fr))]">
        {tiles.map((level, i) => {
          const state = tileState(level, levelId, levelCeiling, progress);
          const entry = progress.get(level);
          const accessible = state !== 'locked';

          return (
            <motion.button
              ref={(el) => { tileRefs.current[i] = el; }}
              key={level}
              type="button"
              disabled={!accessible}
              whileTap={accessible ? { scale: 0.92 } : undefined}
              transition={{ type: 'spring', stiffness: 700, damping: 26 }}
              onClick={() => accessible && onSelectLevel(level)}
              onPointerDown={handlePointerDown}
              data-testid={`tile-${level}`}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl text-center transition-colors ${tileClasses(state)}${focusedIndex === i ? ' kb-focus' : ''}`}
            >
              <span className={`text-base font-semibold tabular-nums ${state === 'locked' ? 'text-slate-600' : state === 'current' ? 'text-sky-100' : 'text-slate-200'}`}>
                {level}
              </span>
              {state === 'completed' && entry && entry.stars > 0 && (
                <span className="mt-0.5 flex gap-px text-[0.55rem]">
                  {[1, 2, 3].map((i) => (
                    <span key={i} className={i <= entry.stars ? 'text-amber-400' : 'text-slate-600'}>★</span>
                  ))}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </PageLayout>
  );
}

function tileClasses(state: TileState): string {
  switch (state) {
    case 'completed':
      return 'bg-white/8 ring-1 ring-white/10';
    case 'current':
      return 'bg-sky-500/20 ring-2 ring-sky-400/60 shadow-lg shadow-sky-500/20';
    case 'unlocked':
      return 'bg-white/5 ring-1 ring-white/8';
    case 'locked':
      return 'bg-white/3 opacity-40 cursor-default';
  }
}
