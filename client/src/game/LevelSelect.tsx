import { motion } from 'motion/react';

interface LevelSelectProps {
  readonly levelId: number;
  readonly levelCeiling: number;
  readonly progress: Map<number, { moves: number; hints: number }>;
  readonly onSelectLevel: (level: number) => void;
  readonly onBack: () => void;
}

type TileState = 'completed' | 'current' | 'unlocked' | 'locked';

function tileState(
  level: number,
  currentLevel: number,
  ceiling: number,
  progress: Map<number, { moves: number; hints: number }>,
): TileState {
  if (progress.has(level)) return 'completed';
  if (level === currentLevel) return 'current';
  if (level <= ceiling) return 'unlocked';
  return 'locked';
}

/**
 * A scrollable grid of level tiles showing the player's progress at a glance.
 * Each tile reflects one of four states: completed, current, unlocked, or locked.
 */
export function LevelSelect({
  levelId,
  levelCeiling,
  progress,
  onSelectLevel,
  onBack,
}: LevelSelectProps) {
  // Show levels up to ceiling + a small locked preview, rounded up to the next multiple of 5.
  const previewEnd = Math.ceil((levelCeiling + 5) / 5) * 5;
  const totalTiles = Math.max(previewEnd, levelCeiling + 5);

  const tiles: number[] = [];
  for (let i = 1; i <= totalTiles; i++) {
    tiles.push(i);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col"
    >
      {/* Header */}
      <header className="relative flex items-center gap-3 px-5 pt-3">
        <motion.button
          type="button"
          aria-label="Back to menu"
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 700, damping: 26 }}
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-slate-200 ring-1 ring-white/10 backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
        </motion.button>
        <h1 className="text-lg font-semibold">Level Select</h1>
      </header>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
        <div className="mx-auto grid max-w-lg grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(4rem,1fr))]">
          {tiles.map((level) => {
            const state = tileState(level, levelId, levelCeiling, progress);
            const entry = progress.get(level);
            const accessible = state !== 'locked';

            return (
              <motion.button
                key={level}
                type="button"
                disabled={!accessible}
                whileTap={accessible ? { scale: 0.92 } : undefined}
                transition={{ type: 'spring', stiffness: 700, damping: 26 }}
                onClick={() => accessible && onSelectLevel(level)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl text-center transition-colors ${tileClasses(state)}`}
              >
                <span className={`text-base font-semibold tabular-nums ${state === 'locked' ? 'text-slate-600' : state === 'current' ? 'text-sky-100' : 'text-slate-200'}`}>
                  {level}
                </span>
                {state === 'completed' && entry && (
                  <span className="mt-0.5 text-[0.6rem] tabular-nums text-slate-400">
                    {entry.moves} moves
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
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
