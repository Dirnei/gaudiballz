import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { API, authHeaders } from './identity';
import { useGameContext } from './GameContext';
import { AchievementsSection } from './AchievementsSection';

interface PlayerStats {
  readonly totalPoints: number;
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  readonly winRate: number;
  readonly highestLevel: number;
  readonly bestMoves: number;
  readonly bestMovesLevel: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly globalRank: number;
  readonly totalLevels: number;
  readonly levelsCompleted: number;
  readonly comparisons?: Record<string, string>;
}

const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

export function StatsPage() {
  const { t } = useTranslation();
  const game = useGameContext();
  const isRegistered = game.identity !== null && !game.identity.isAnonymous;

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievementsReady, setAchievementsReady] = useState(false);

  useEffect(() => {
    if (!isRegistered) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/hub/player/stats`, { headers: authHeaders() });
        if (res.ok && !cancelled) setStats(await res.json() as PlayerStats);
      } catch { /* silent */ }
    })();

    void game.ensureAchievements();

    return () => { cancelled = true; };
  }, [isRegistered, game]);

  useEffect(() => {
    if (game.achievements) setAchievementsReady(true);
  }, [game.achievements]);

  if (!isRegistered) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="text-xl font-bold text-white" style={fredoka}>{t('stats.title')}</h2>
        <p className="mt-2 text-sm text-slate-400">{t('stats.registerPrompt')}</p>
      </div>
    );
  }

  const progressPct = stats ? Math.round((stats.levelsCompleted / Math.max(stats.totalLevels, 1)) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-6">
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="mx-auto w-full max-w-3xl pt-5"
      >
        <h1 className="text-2xl font-bold tracking-tight text-white" style={fredoka}>{t('stats.title')}</h1>

        {!stats ? (
          <p className="mt-12 text-center text-sm text-slate-500">{t('stats.loading')}</p>
        ) : (
          <>
            {/* Stat cards */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard value={stats.totalPoints.toLocaleString()} label={t('stats.totalPoints')} color="text-amber-400" sub={stats.comparisons?.['points']} icon="star" iconBg="bg-amber-400/12" />
              <StatCard value={String(stats.gamesPlayed)} label={t('stats.gamesPlayed')} color="text-emerald-400" sub={t('stats.wonAndRate', { won: stats.gamesWon, rate: stats.winRate })} icon="check" iconBg="bg-emerald-400/12" />
              <StatCard value={String(stats.highestLevel)} label={t('stats.highestLevel')} color="text-violet-400" sub={stats.comparisons?.['level']} icon="arrow" iconBg="bg-violet-400/12" />
              <StatCard value={String(stats.bestMoves)} label={t('stats.bestMoves')} color="text-sky-400" sub={stats.bestMovesLevel > 0 ? t('stats.levelN', { level: stats.bestMovesLevel }) : undefined} icon="chart" iconBg="bg-sky-400/12" />
              <StatCard value={String(stats.currentStreak)} label={t('stats.dayStreak')} color="text-emerald-400" sub={t('stats.bestDays', { days: stats.bestStreak })} icon="flame" iconBg="bg-emerald-400/12" />
              <StatCard value={`#${stats.globalRank}`} label={t('stats.globalRank')} color="text-slate-200" sub={stats.comparisons?.['rank']} icon="rank" iconBg="bg-white/6" />
            </div>

            {/* Level progress */}
            <div
              className="mt-5 rounded-2xl p-5"
              style={{
                backgroundImage:
                  'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
                  'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderTopColor: 'rgba(255,255,255,0.22)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white" style={fredoka}>{t('stats.levelProgress')}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{t('stats.levelsCompleted', { completed: stats.levelsCompleted, total: stats.totalLevels })}</div>
                </div>
                <div className="text-xl font-bold text-violet-400" style={fredoka}>{progressPct}%</div>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #9333EA, #3B82F6)' }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[0.7rem] tabular-nums text-slate-600">
                <span>{t('stats.levelN', { level: 1 })}</span>
                <span>{t('stats.levelN', { level: stats.totalLevels })}</span>
              </div>
            </div>

            {/* Achievements */}
            {achievementsReady && (
              <div className="mt-6">
                <AchievementsSection state={game.achievements} />
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({
  value, label, color, sub, icon, iconBg,
}: {
  value: string; label: string; color: string; sub?: string; icon: string; iconBg: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundImage:
          'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
          'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderTopColor: 'rgba(255,255,255,0.22)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-2xl font-bold tracking-tight tabular-nums ${color}`} style={fredoka}>{value}</div>
          <div className="mt-0.5 text-xs font-semibold text-slate-500">{label}</div>
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${iconBg}`}>
          <StatIcon name={icon} />
        </div>
      </div>
      {sub && <div className="mt-1.5 text-[0.7rem] tabular-nums text-slate-500">{sub}</div>}
    </div>
  );
}

function StatIcon({ name }: { name: string }) {
  const props = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true as const };
  switch (name) {
    case 'star':
      return <svg {...props}><path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7z" fill="#FACC15" /></svg>;
    case 'check':
      return <svg {...props}><path d="M4 8l3 3 5-6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'arrow':
      return <svg {...props}><path d="M8 2v12M4 6l4-4 4 4" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'chart':
      return <svg {...props}><path d="M2 14l4-5 3 2 5-7" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'flame':
      return <svg {...props}><path d="M8 1c0 3-3 4-3 7a3 3 0 006 0c0-3-3-4-3-7z" fill="#10B981" opacity="0.8" /></svg>;
    case 'rank':
      return <svg {...props}><rect x="1" y="9" width="4" height="6" rx="0.5" fill="#64748B" /><rect x="6" y="5" width="4" height="10" rx="0.5" fill="#94A3B8" /><rect x="11" y="1" width="4" height="14" rx="0.5" fill="#A855F7" /></svg>;
    default:
      return null;
  }
}
