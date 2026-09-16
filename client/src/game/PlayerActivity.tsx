import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, authHeaders } from './identity';
import { useGameContext } from './GameContext';

interface ActivityStats {
  readonly gamesThisWeek: number;
  readonly gamesThisMonth: number;
  readonly gamesAllTime: number;
  readonly bestStreak: number;
  readonly winRate: number;
}

const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

const CARD_BG = {
  backgroundImage:
    'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
    ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
    'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderTopColor: 'rgba(255,255,255,0.22)',
} as const;

export function PlayerActivity() {
  const { t } = useTranslation();
  const game = useGameContext();
  const isRegistered = game.identity !== null && !game.identity.isAnonymous;
  const [stats, setStats] = useState<ActivityStats | null>(null);

  useEffect(() => {
    if (!isRegistered) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/hub/player/stats`, { headers: authHeaders() });
        if (res.ok && !cancelled) {
          setStats(await res.json() as ActivityStats);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [isRegistered]);

  if (!stats) return null;

  return (
    <div>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-white" style={fredoka}>
        {t('playerActivity.title')}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label={t('playerActivity.thisWeek')} value={stats.gamesThisWeek} />
        <MiniStat label={t('playerActivity.thisMonth')} value={stats.gamesThisMonth} />
        <MiniStat label={t('playerActivity.allTime')} value={stats.gamesAllTime} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <MiniStat label={t('playerActivity.bestStreak')} value={`${stats.bestStreak}d`} />
        <MiniStat label={t('playerActivity.winRate')} value={`${stats.winRate}%`} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl px-3 py-2 text-center" style={CARD_BG}>
      <div className="text-base font-bold tabular-nums text-sky-400" style={fredoka}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-[0.65rem] font-semibold text-slate-500" style={fredoka}>{label}</div>
    </div>
  );
}
