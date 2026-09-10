import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Tube } from './Tube';
import { FlaskLogo } from './FlaskLogo';
import { isSolved } from '../engine/rules';
import { play, startGame, type GameState } from '../engine/history';
import {
  advanceTutorial,
  completeTutorial,
  createTutorialBoard,
  markTutorialSeen,
  startTutorial,
  tutorialPrompt,
  type TutorialState,
} from './tutorial';

export function TutorialScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>(() => startGame(createTutorialBoard()));
  const [tutorial, setTutorial] = useState<TutorialState>(startTutorial);
  const [selected, setSelected] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  const board = gameState.board;

  const skip = useCallback(() => {
    markTutorialSeen();
    navigate('/play');
  }, [navigate]);

  const tapTube = useCallback(
    (index: number) => {
      if (solved) return;

      if (selected === null) {
        if (board.tubes[index].length > 0) {
          setSelected(index);
          if (tutorial.step === 'pick-source') {
            setTutorial((t) => advanceTutorial(t));
          }
        }
        return;
      }

      if (selected === index) {
        setSelected(null);
        return;
      }

      const next = play(gameState, { from: selected, to: index });
      if (next !== gameState) {
        setGameState(next);
        setSelected(null);
        setTutorial((t) => {
          const advanced = t.step === 'pick-target' ? advanceTutorial(t) : { ...t, moveCount: t.moveCount + 1 };
          if (isSolved(next.board)) {
            markTutorialSeen();
            setSolved(true);
            return completeTutorial(advanced);
          }
          return advanced;
        });
      } else {
        setSelected(board.tubes[index].length > 0 ? index : null);
      }
    },
    [gameState, selected, board, tutorial.step, solved],
  );

  return (
    <>
      <header className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <FlaskLogo className="h-8 w-auto text-slate-200" />
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
          >
            {t('tutorial.title')}
          </span>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={skip}
            className="rounded-full bg-white/8 px-4 py-1.5 text-sm text-slate-400 ring-1 ring-white/10 transition-colors hover:bg-white/12 hover:text-slate-200"
          >
            {t('tutorial.skip')}
          </button>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-2">
        {tutorial.step !== 'done' && (
          <motion.div
            key={tutorial.step}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl bg-slate-800/90 px-5 py-3 text-center text-sm text-slate-200 shadow-xl ring-1 ring-white/10 backdrop-blur"
            data-testid="tutorial-prompt"
          >
            {tutorialPrompt(tutorial.step)}
          </motion.div>
        )}

        <div
          className="grid max-w-full items-end justify-items-center"
          style={{
            gridTemplateColumns: `repeat(${board.tubes.length}, min-content)`,
            justifyContent: 'center',
            contain: 'layout style',
          }}
        >
          {board.tubes.map((tube, index) => (
            <Tube
              key={index}
              items={tube}
              capacity={board.capacity}
              selected={selected === index}
              focused={false}
              complete={tube.length === board.capacity && tube.every((c) => c === tube[0])}
              onTap={() => tapTube(index)}
            />
          ))}
        </div>
      </main>

      <AnimatePresence>
        {solved && (
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
              <p className="text-2xl font-bold tracking-tight">{t('tutorial.solvedTitle')}</p>
              <p className="mt-2 text-sm text-slate-400">{t('tutorial.solvedBody')}</p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/play')}
                className="mt-6 w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-sky-500/30"
                data-testid="tutorial-continue"
              >
                {t('tutorial.letsGo')}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
