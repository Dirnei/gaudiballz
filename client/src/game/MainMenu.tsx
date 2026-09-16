import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { FlaskLogo } from './FlaskLogo';
import { useGameContext } from './GameContext';
import { StatsRibbon, useCommunityStats } from './StatsRibbon';
import { ProgressTiles } from './ProgressTiles';
import { ActivityFeed } from './ActivityFeed';
import { needsTutorial } from './tutorial';

const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

const CARD_BG = {
  backgroundImage:
    'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
    ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
    'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderTopColor: 'rgba(255,255,255,0.22)',
} as const;

function isDailyDone(): boolean {
  try {
    const stored = localStorage.getItem('puzzle.dailyDone');
    if (stored === null) return false;
    const now = new Date();
    const todayUTC = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    return stored === todayUTC;
  } catch {
    return false;
  }
}

export function MainMenu() {
  const { t } = useTranslation();
  const game = useGameContext();
  const navigate = useNavigate();
  const totalPoints = game.progress?.totalPoints ?? 0;
  const community = useCommunityStats();

  const [focusedIndex, setFocusedIndex] = useState(0);

  const hasProgress = (game.progress?.highestCompleted ?? 0) > 0;
  const onPlay = useCallback(() => navigate(!hasProgress && needsTutorial() ? '/tutorial' : '/play'), [navigate, hasProgress]);
  const onLevelSelect = useCallback(() => navigate('/levels'), [navigate]);
  const onDaily = useCallback(() => navigate('/daily'), [navigate]);

  const actions = useMemo(() => [onPlay, onDaily, onLevelSelect], [onPlay, onDaily, onLevelSelect]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        setFocusedIndex((prev) => (prev + dir + actions.length) % actions.length);
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        actions[focusedIndex]();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [actions, focusedIndex]);

  function handlePointerDown() {
    setFocusedIndex(0);
  }

  const dailyDone = isDailyDone();

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
          <h1 className="text-4xl font-bold tracking-tight text-white" style={fredoka}>
            GAUDI BALLZ
          </h1>
          <p className="mt-2 text-sm text-slate-400">{t('brand.tagline')}</p>
          {totalPoints > 0 && (
            <p className="mt-3 text-sm font-medium tabular-nums text-amber-400">
              {t('menu.points', { points: totalPoints.toLocaleString() })}
            </p>
          )}

          {/* Play + actions */}
          <div className="mx-auto mt-6 flex w-full max-w-xs flex-col gap-2.5">
            {([
              { action: onPlay, label: t('menu.play'), testId: 'menu-play', idx: 0, badge: false },
              { action: onDaily, label: t('menu.dailyChallenge'), testId: 'menu-daily', idx: 1, badge: dailyDone },
              { action: onLevelSelect, label: t('menu.levelSelect'), testId: 'menu-level-select', idx: 2, badge: false },
            ] as const).map(({ action, label, testId, idx, badge }) => (
              <motion.button
                key={testId}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={action}
                onPointerDown={handlePointerDown}
                className={`relative w-full rounded-2xl px-5 py-3 font-semibold transition-colors ${
                  focusedIndex === idx
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                    : 'border border-white/14 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
                style={fredoka}
                data-testid={testId}
              >
                {label}
                {badge && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[0.6rem] font-bold text-white shadow">
                    ✓
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Community chips */}
        <StatsRibbon stats={community} />

        {/* Progress tiles */}
        <div className="mt-2">
          <ProgressTiles />
        </div>

        {/* Global activity chart + stats */}
        {community && (
          <div className="mt-6">
            <div className="rounded-2xl px-4 pt-4 pb-3" style={CARD_BG}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500" style={fredoka}>
                {t('community.activityTitle')}
              </h3>
              <ActivityChart days={community.dailyHistory} />
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <MiniStat label={t('playerActivity.thisWeek')} value={community.gamesThisWeek} />
              <MiniStat label={t('playerActivity.thisMonth')} value={community.gamesThisMonth} />
              <MiniStat label={t('playerActivity.allTime')} value={community.gamesAllTime} />
            </div>
          </div>
        )}

        {/* Activity feed */}
        <div className="mt-6">
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
            {t('menu.supportOnKofi')}
          </a>
        </div>

      </motion.div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl px-3 py-2 text-center" style={CARD_BG}>
      <div className="text-base font-bold tabular-nums text-sky-400" style={fredoka}>
        {value.toLocaleString()}
      </div>
      <div className="text-[0.65rem] font-semibold text-slate-500" style={fredoka}>{label}</div>
    </div>
  );
}

interface DayEntry { readonly date: string; readonly count: number }

function ActivityChart({ days }: { days: readonly DayEntry[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.count), 1);
  const W = 100;
  const H = 40;
  const barW = W / days.length;
  const gap = barW * 0.2;

  const weekday = (iso: string) => new Date(iso + 'T00:00:00').getUTCDay();

  const activeDay = active !== null ? days[active] : null;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 80 }}
          preserveAspectRatio="none"
          onMouseLeave={() => setActive(null)}
        >
          {days.map((d, i) => {
            const barH = (d.count / max) * (H - 2);
            const x = i * barW + gap / 2;
            const w = barW - gap;
            const y = H - barH;
            const isMonday = weekday(d.date) === 1;
            const isActive = active === i;
            return (
              <g key={d.date}>
                {isMonday && i > 0 && (
                  <line x1={x - gap / 2} y1={0} x2={x - gap / 2} y2={H} stroke="rgba(255,255,255,0.06)" strokeWidth={0.2} />
                )}
                <rect
                  x={x}
                  y={d.count > 0 ? y : H - 1}
                  width={w}
                  height={d.count > 0 ? barH : 1}
                  rx={w / 3}
                  fill={isActive ? '#7dd3fc' : d.count > 0 ? '#38bdf8' : 'rgba(255,255,255,0.06)'}
                  opacity={d.count > 0 ? (isActive ? 1 : 0.4 + 0.6 * (d.count / max)) : 1}
                />
                <rect
                  x={i * barW}
                  y={0}
                  width={barW}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                  onTouchStart={() => setActive(i)}
                />
              </g>
            );
          })}
        </svg>

        {activeDay && active !== null && (
          <div
            className="pointer-events-none absolute -top-8 rounded-lg bg-slate-800 px-2.5 py-1 text-center shadow-lg ring-1 ring-white/10"
            style={{
              left: `${((active + 0.5) / days.length) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-xs font-bold tabular-nums text-sky-300" style={fredoka}>
              {activeDay.count}
            </span>
            <span className="ml-1.5 text-[0.6rem] text-slate-500" style={fredoka}>
              {formatLabel(activeDay.date)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[0.6rem] tabular-nums text-slate-600" style={fredoka}>
        <span>{formatShort(days[0].date)}</span>
        <span>{formatShort(days[days.length - 1].date)}</span>
      </div>
    </div>
  );
}

function formatShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}
