import { AnimatePresence, motion } from 'motion/react';
import { Tube } from './Tube';
import { useGame } from './useGame';

/** A tube is finished when it is full and single-coloured; empty tubes are just empty. */
function isComplete(tube: readonly number[], capacity: number): boolean {
  return tube.length === capacity && tube.every((colour) => colour === tube[0]);
}

export function App() {
  const game = useGame();

  return (
    <main className="flex min-h-full flex-col items-center bg-slate-900 px-4 py-5 text-slate-100">
      <header className="flex w-full max-w-2xl items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Sort Puzzle</h1>
        <p className="text-xs tabular-nums text-slate-400">
          Level {game.levelId} · {game.moveCount} moves
          {game.info !== null && ` · par ${game.info.parMoves}`}
        </p>
      </header>

      <section className="flex flex-1 items-center justify-center py-8">
        {game.load === 'loading' && <p className="text-sm text-slate-400">Loading…</p>}

        {game.load === 'error' && (
          <div className="max-w-sm text-center text-sm text-slate-400">
            <p className="mb-1 text-slate-200">Could not reach the level server.</p>
            <p>
              Start it with{' '}
              <code className="text-slate-300">dotnet run --project src/Puzzle.Server</code>
            </p>
          </div>
        )}

        {game.load === 'ready' && game.state !== null && (
          <div className="flex max-w-2xl flex-wrap items-end justify-center gap-1 sm:gap-2">
            {game.state.board.tubes.map((tube, index) => (
              <Tube
                key={index}
                items={tube}
                capacity={game.state!.board.capacity}
                selected={game.selected === index}
                complete={isComplete(tube, game.state!.board.capacity)}
                onTap={() => game.tapTube(index)}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="flex w-full max-w-2xl items-center justify-center gap-2">
        <button
          type="button"
          onClick={game.undo}
          disabled={!game.canUndo}
          className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-35"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={game.restart}
          className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
        >
          Restart
        </button>
        <button
          type="button"
          onClick={() => game.goToLevel(game.levelId - 1)}
          disabled={game.levelId <= 1}
          aria-label="Previous level"
          className="rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-35"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => game.goToLevel(game.levelId + 1)}
          aria-label="Next level"
          className="rounded-lg bg-slate-800 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
        >
          →
        </button>
      </footer>

      <AnimatePresence>
        {game.solved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 24, scale: 0.94 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="w-full max-w-xs rounded-2xl bg-slate-800 p-6 text-center shadow-2xl"
            >
              <p className="text-xl font-semibold">Solved</p>
              <p className="mt-1 text-sm text-slate-400">
                {game.moveCount} moves
                {game.info !== null &&
                  game.moveCount <= game.info.parMoves &&
                  ' · at or under par'}
              </p>
              <button
                type="button"
                onClick={() => game.goToLevel(game.levelId + 1)}
                className="mt-5 w-full rounded-lg bg-sky-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-sky-400"
              >
                Next level
              </button>
              <button
                type="button"
                onClick={game.restart}
                className="mt-2 w-full rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
              >
                Play again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
