import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { FlaskLogo } from './FlaskLogo';
import { useGameContext } from './GameContext';

export function MainMenu() {
  const game = useGameContext();
  const navigate = useNavigate();
  const totalPoints = game.progress?.totalPoints ?? 0;
  const showAchievements = game.identity !== null && !game.identity.isAnonymous;

  const [enteringCode, setEnteringCode] = useState(false);
  const [levelCode, setLevelCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const onPlay = useCallback(() => navigate('/play'), [navigate]);
  const onLevelSelect = useCallback(() => navigate('/levels'), [navigate]);
  const onAchievements = useCallback(() => {
    navigate('/achievements');
    void game.ensureAchievements();
  }, [navigate, game]);
  const openCodeEntry = useCallback(() => setEnteringCode(true), []);

  const actions = useMemo(() => {
    const items: (() => void)[] = [onPlay, onLevelSelect];
    if (showAchievements) items.push(onAchievements);
    items.push(openCodeEntry);
    return items;
  }, [onPlay, onLevelSelect, onAchievements, showAchievements, openCodeEntry]);

  const codeIndex = actions.length - 1;

  useEffect(() => {
    if (enteringCode) return undefined;

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
  }, [actions, enteringCode, focusedIndex]);

  useEffect(() => {
    if (!enteringCode) return undefined;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setEnteringCode(false);
        setCodeError(null);
        setLevelCode('');
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enteringCode]);

  useEffect(() => {
    setFocusedIndex(null);
  }, [actions.length]);

  function handlePointerDown() {
    setFocusedIndex(null);
  }

  async function handleCodeUnlock() {
    setCodeError(null);
    setBusy(true);
    const result = await game.unlockWithCode(levelCode);
    setBusy(false);
    if (result === null) {
      setCodeError('Invalid code.');
    } else {
      setEnteringCode(false);
      setLevelCode('');
      navigate('/play');
    }
  }

  const primary =
    'w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white ' +
    'shadow-lg shadow-sky-500/25 transition-colors hover:bg-sky-400 disabled:opacity-45';
  const quiet =
    'w-full rounded-2xl px-4 py-2.5 text-sm text-slate-400 transition-colors ' +
    'hover:text-slate-200 disabled:opacity-45';

  function fc(idx: number) {
    return focusedIndex === idx ? ' kb-focus' : '';
  }

  let nextIdx = 0;
  const playIdx = nextIdx++;
  const levelSelectIdx = nextIdx++;
  const achievementsIdx = showAchievements ? nextIdx++ : -1;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-[20rem] text-center"
      >
        {/* Branding */}
        <div className="mb-2 flex justify-center">
          <FlaskLogo className="h-16 w-auto text-slate-200" />
        </div>
        <h1
          className="text-4xl font-bold tracking-tight text-white"
          style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
        >
          GUADI BALLZ
        </h1>
        <p className="mt-2 text-sm text-slate-400">Sort the colours. Clear the board.</p>
        {totalPoints > 0 && (
          <p className="mt-3 text-sm font-medium tabular-nums text-amber-400">
            ★ {totalPoints.toLocaleString()} pts
          </p>
        )}

        {/* Main action panel */}
        <div
          className="mt-8 w-full overflow-hidden rounded-[1.75rem] p-7 shadow-2xl"
          style={{
            backgroundImage:
              'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
              ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
              'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderTopColor: 'rgba(255,255,255,0.22)',
          }}
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onPlay}
            onPointerDown={handlePointerDown}
            className={`${primary}${fc(playIdx)}`}
            data-testid="menu-play"
          >
            Play
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onLevelSelect}
            onPointerDown={handlePointerDown}
            className={`mt-3 ${quiet}${fc(levelSelectIdx)}`}
            data-testid="menu-level-select"
          >
            Level Select
          </motion.button>

          {showAchievements && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onAchievements}
              onPointerDown={handlePointerDown}
              className={`mt-1 ${quiet}${fc(achievementsIdx)}`}
              data-testid="menu-achievements"
            >
              Achievements
            </motion.button>
          )}

          {/* Level code entry */}
          <div className="mt-5 border-t border-white/8 pt-5">
            {enteringCode ? (
              <>
                <input
                  value={levelCode}
                  onChange={(e) => {
                    setLevelCode(e.target.value);
                    setCodeError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && levelCode.trim().length > 0 && !busy) {
                      void handleCodeUnlock();
                    }
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={6}
                  autoFocus
                  placeholder="Enter level code"
                  className="w-full rounded-2xl bg-slate-950/50 px-4 py-3 text-center font-mono text-base uppercase tracking-widest text-slate-100 outline-none ring-1 ring-white/10 transition placeholder:text-slate-600 placeholder:tracking-normal placeholder:normal-case focus:ring-2 focus:ring-sky-400/70"
                  data-testid="code-input"
                />
                <button
                  type="button"
                  onClick={() => void handleCodeUnlock()}
                  disabled={busy || levelCode.trim().length === 0}
                  className={`mt-3 ${primary}`}
                >
                  {busy ? 'Checking...' : 'Unlock'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnteringCode(false);
                    setCodeError(null);
                    setLevelCode('');
                  }}
                  className={`mt-1 ${quiet}`}
                >
                  Cancel
                </button>
                <AnimatePresence>
                  {codeError !== null && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 text-xs text-rose-300"
                    >
                      {codeError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <button
                type="button"
                onClick={openCodeEntry}
                onPointerDown={handlePointerDown}
                className={`${quiet}${fc(codeIndex)}`}
                data-testid="menu-enter-code"
              >
                Enter a level code
              </button>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
