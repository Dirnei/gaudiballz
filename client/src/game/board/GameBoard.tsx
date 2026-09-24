import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Tube } from '../Tube';
import { HINT_COOLDOWN_MS } from '../attempt';
import { LiveTimer } from '../LiveTimer';
import { haptics } from '../haptics';
import { DragOverlay } from '../DragOverlay';
import { useDrag, type Point } from '../useDrag';
import { topColour, topRunLength } from '../../engine/board';
import { validate } from '../../engine/rules';
import { APP_VERSION } from '../version';
import { isComplete } from '../isComplete';
import { ControlButton, CooldownSweep, hintLabel } from './controls';
import type { BoardPlay } from './useBoardPlay';

/** What the board needs from a mode's game. Every mode's hook provides at least this. */
export type BoardGame = Pick<
  BoardPlay,
  | 'state' | 'selected' | 'solved' | 'stuck'
  | 'undosRemaining' | 'hintsRemaining' | 'hintCooldownEnd' | 'canHint' | 'canUndo'
  | 'moveCount' | 'elapsed'
  | 'tapTube' | 'pour' | 'clearSelection' | 'undo' | 'useHint' | 'restart'
>;

/** Which pieces of chrome around the board a mode shows. */
export interface BoardControls {
  /** The moves / par / timer pill under the board. */
  readonly stats?: boolean;
  readonly undo?: boolean;
  readonly hint?: boolean;
  /** The restart button, its confirmation, and the stuck notice that offers it. */
  readonly restart?: boolean;
}

export const ALL_CONTROLS: BoardControls = { stats: true, undo: true, hint: true, restart: true };

interface GameBoardProps {
  readonly game: BoardGame;
  readonly load?: 'loading' | 'ready' | 'error';
  readonly loadingText?: string;
  readonly controls?: BoardControls;
  readonly par?: number;
  readonly timeTargetMs?: number;
  /** Shown before the stats pill, e.g. the campaign's level badge. */
  readonly statsLead?: ReactNode;
  /** Shown above the tubes, e.g. the tutorial's prompt. */
  readonly above?: ReactNode;
  /** The Home control, and where Escape goes when nothing is picked up. */
  readonly onHome?: () => void;
  /** Keys while the board is solved; the mode's overlay decides what they do. */
  readonly onSolvedKey?: (e: KeyboardEvent) => void;
  /** Keyboard focus is dropped whenever this changes, e.g. on a new level. */
  readonly focusResetKey?: unknown;
}

function findVerticalNeighbour(refs: (HTMLButtonElement | null)[], from: number, direction: 'up' | 'down'): number | null {
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

/**
 * The board every mode plays on: tubes, tap, drag, keyboard, and the controls around them.
 *
 * One component on purpose. The campaign, the daily challenge and the tutorial each used to
 * carry their own copy, and the copies drifted - the daily board let a finished column be
 * picked up long after the campaign had stopped allowing it. A mode now only decides what
 * surrounds the board and which controls it shows.
 */
export function GameBoard({
  game,
  load = 'ready',
  loadingText,
  controls = {},
  par = 0,
  timeTargetMs,
  statsLead,
  above,
  onHome,
  onSolvedKey,
  focusResetKey,
}: GameBoardProps) {
  const { t } = useTranslation();
  const completedCount = useRef(0);

  const board = game.state?.board;
  const done = board ? board.tubes.filter((tube) => isComplete(tube, board.capacity)).length : 0;

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
  }, [focusResetKey]);

  const handleTubeTap = useCallback(
    (index: number) => {
      haptics.move();
      game.tapTube(index);
      setFocusedTube(index);
    },
    [game],
  );

  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<Point>({ x: 0, y: 0 });
  const [dragHoverTarget, setDragHoverTarget] = useState<number | null>(null);
  const dragSourceRef = useRef<number | null>(null);

  const dragColours = useMemo(() => {
    if (dragSource === null || !board) return [];
    const tube = board.tubes[dragSource];
    const colour = topColour(tube);
    if (colour === 0) return [];
    const count = topRunLength(tube);
    return Array.from({ length: count }, () => colour);
  }, [dragSource, board]);

  const validDropTargets = useMemo(() => {
    if (dragSource === null || !board) return new Set<number>();
    const targets = new Set<number>();
    for (let i = 0; i < board.tubes.length; i++) {
      if (i === dragSource) continue;
      if (validate(board, { from: dragSource, to: i }) === 'None') {
        targets.add(i);
      }
    }
    return targets;
  }, [dragSource, board]);

  const pendingTubeRef = useRef<number | null>(null);

  const { isDragging, handlers: dragHandlers } = useDrag({
    onTap: () => {
      const idx = pendingTubeRef.current;
      if (idx !== null) handleTubeTap(idx);
    },
    onDragStart: () => {
      const idx = pendingTubeRef.current;
      if (idx === null || !board || board.tubes[idx].length === 0 || isComplete(board.tubes[idx], board.capacity)) return;
      dragSourceRef.current = idx;
      setDragSource(idx);
      if (game.selected !== null && game.selected !== idx) {
        game.clearSelection();
      }
    },
    onDragMove: (pos: Point) => {
      setDragPos(pos);
      const src = dragSourceRef.current;
      if (src === null || !board) {
        setDragHoverTarget(null);
        return;
      }
      const el = document.elementFromPoint(pos.x, pos.y);
      const tubeButton = el?.closest<HTMLElement>('[data-tube-index]');
      if (tubeButton) {
        const idx = Number(tubeButton.dataset.tubeIndex);
        if (!Number.isNaN(idx) && idx !== src && validate(board, { from: src, to: idx }) === 'None') {
          setDragHoverTarget(idx);
          return;
        }
      }
      setDragHoverTarget(null);
    },
    onDragEnd: (pos: Point) => {
      const src = dragSourceRef.current;
      dragSourceRef.current = null;
      setDragSource(null);
      setDragHoverTarget(null);

      if (src === null || !board) return;

      const el = document.elementFromPoint(pos.x, pos.y);
      const tubeButton = el?.closest<HTMLElement>('[data-tube-index]');
      if (!tubeButton) return;

      const targetIndex = Number(tubeButton.dataset.tubeIndex);
      if (Number.isNaN(targetIndex) || targetIndex === src) return;

      if (validate(board, { from: src, to: targetIndex }) === 'None') {
        haptics.move();
        game.pour(src, targetIndex);
      }
    },
  });

  const handleTubePointerDown = useCallback((index: number, e: React.PointerEvent) => {
    pendingTubeRef.current = index;
    dragHandlers.onPointerDown(e);
  }, [dragHandlers]);

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
        onSolvedKey?.(e);
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
            const neighbour = findVerticalNeighbour(tubeRefs.current, prev, e.key === 'ArrowUp' ? 'up' : 'down');
            if (neighbour === null) return prev;
            tubeRefs.current[neighbour]?.scrollIntoView({ block: 'nearest' });
            return neighbour;
          });
          return;
        }
        case 'Enter':
        case ' ': {
          if (focusedTube === null) return;
          if (game.selected === null && board && isComplete(board.tubes[focusedTube], board.capacity)) return;
          e.preventDefault();
          haptics.move();
          game.tapTube(focusedTube);
          return;
        }
        case 'Escape': {
          if (game.selected !== null) {
            e.preventDefault();
            game.clearSelection();
          } else if (onHome) {
            e.preventDefault();
            onHome();
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
          if (controls.undo && game.canUndo) {
            e.preventDefault();
            game.undo();
          }
          return;
        case 'h':
          if (controls.hint && game.canHint) {
            e.preventDefault();
            haptics.move();
            game.useHint();
          }
          return;
        case 'r':
          if (controls.restart) {
            e.preventDefault();
            setConfirmingReset(true);
          }
          return;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [board, focusedTube, confirmingReset, game, controls, onHome, onSolvedKey]);

  const showFooter = onHome !== undefined || controls.undo || controls.hint || controls.restart;

  return (
    <>
      <main className="relative flex flex-1 flex-col items-center justify-center px-2">
        {load === 'loading' && (
          <motion.div
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-sm text-slate-400"
          >
            {loadingText ?? t('game.loading')}
          </motion.div>
        )}

        {load === 'error' && (
          <div className="max-w-xs text-center text-sm text-slate-400">
            <p className="mb-1 font-medium text-slate-200">{t('game.cantReach')}</p>
            <p className="text-xs leading-relaxed">
              {t('game.startWith')}{' '}
              <code className="text-slate-300">dotnet run --project src/GaudiBallz.Server</code>
            </p>
          </div>
        )}

        {load === 'ready' && board && (
          <>
            {above}

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
                  items={dragSource === index ? tube.slice(0, tube.length - dragColours.length) : tube}
                  capacity={board.capacity}
                  selected={game.selected === index}
                  focused={focusedTube === index}
                  complete={isComplete(tube, board.capacity)}
                  dropTarget={validDropTargets.has(index)}
                  dropHover={dragHoverTarget === index}
                  tubeIndex={index}
                  onTap={() => handleTubeTap(index)}
                  onPointerDown={(e) => handleTubePointerDown(index, e)}
                />
              ))}
            </div>

            {(statsLead !== undefined || controls.stats) && (
              <div className="mt-3 flex items-center gap-3">
                {statsLead}
                {controls.stats && (
                  <div className="flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs tabular-nums ring-1 ring-white/10">
                    <span className="font-semibold text-sm text-slate-200">{game.moveCount}</span>
                    {par > 0 && <span className="text-slate-500">/ {par}</span>}
                    <span className="text-slate-600">·</span>
                    <LiveTimer
                      elapsedMs={game.elapsed.elapsedMs}
                      running={(game.selected !== null || game.moveCount > 0) && !game.solved}
                      timeTargetMs={timeTargetMs}
                      className="text-slate-300"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {isDragging && dragSource !== null && dragColours.length > 0 && (
          <DragOverlay colours={dragColours} position={dragPos} />
        )}
      </main>

      {showFooter && (
        <footer className="relative flex items-center justify-center gap-3 px-5 pb-5 pt-2">
          {onHome && (
            <ControlButton
              label={t('nav.backToMenu')}
              text={t('game.home')}
              onClick={onHome}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
              </svg>
            </ControlButton>
          )}
          {controls.undo && (
            <ControlButton
              label={t('game.undoLabel', { count: game.undosRemaining })}
              text={t('game.undo')}
              onClick={game.undo}
              disabled={!game.canUndo}
              badge={game.undosRemaining}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clipRule="evenodd" />
              </svg>
            </ControlButton>
          )}
          {controls.hint && (
            <span className="relative inline-flex">
              {game.hintCooldownEnd !== undefined && game.hintCooldownEnd !== null && game.hintsRemaining !== 0 && (
                <CooldownSweep key={game.hintCooldownEnd} end={game.hintCooldownEnd} duration={HINT_COOLDOWN_MS} />
              )}
              <ControlButton
                label={hintLabel(game.hintsRemaining, game.hintCooldownEnd, game.stuck, t)}
                text={t('game.hint')}
                onClick={() => { haptics.move(); game.useHint(); }}
                disabled={!game.canHint}
                badge={game.hintsRemaining}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.062a.75.75 0 0 1-1.062-1.061l1.061-1.06a.75.75 0 0 1 1.06 0ZM3 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 8ZM14.75 7.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5ZM7.5 8a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0ZM8 12.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-.225.535l-1.25 1.224a.75.75 0 0 1-1.05 0l-1.25-1.224A.75.75 0 0 1 8 15.25v-3Z" />
                </svg>
              </ControlButton>
            </span>
          )}
          {controls.restart && (
            <ControlButton
              label={t('game.restartLabel')}
              text={t('game.restart')}
              onClick={() => setConfirmingReset(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.451a.75.75 0 0 0 0-1.5H4.5a.75.75 0 0 0-.75.75v3.75a.75.75 0 0 0 1.5 0v-2.033l.364.363a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm-10.624-3.85a5.5 5.5 0 0 1 9.201-2.465l.312.31H11.75a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 .75-.75V2.5a.75.75 0 0 0-1.5 0v2.033l-.364-.364A7 7 0 0 0 3.238 7.187a.75.75 0 0 0 1.449.388Z" clipRule="evenodd" />
              </svg>
            </ControlButton>
          )}
          <span className="absolute bottom-1.5 right-3 text-[0.55rem] tabular-nums text-slate-600">{APP_VERSION}</span>
        </footer>
      )}

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
              <p className="text-lg font-semibold">{t('game.restartTitle')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('game.restartBody')}</p>
              <button
                type="button"
                onClick={() => {
                  setConfirmingReset(false);
                  game.restart();
                }}
                className="mt-5 w-full rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white shadow-lg shadow-sky-500/25"
              >
                {t('game.restartConfirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400"
              >
                {t('game.restartCancel')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stuck notice */}
      <AnimatePresence>
        {controls.restart && game.stuck && !game.solved && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-5"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-amber-500/12 px-4 py-3 text-sm ring-1 ring-amber-400/30 backdrop-blur">
              <span className="text-amber-200">{t('game.stuckNoMoves')}</span>
              {controls.undo && (
                <button
                  type="button"
                  onClick={game.undo}
                  disabled={!game.canUndo}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 disabled:opacity-40"
                >
                  {t('game.undo')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100"
              >
                {t('game.restart')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
