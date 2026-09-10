import { useTranslation } from 'react-i18next';
import { useGameContext } from './GameContext';

export function RecentGames() {
  const { t } = useTranslation();
  const game = useGameContext();
  const levels = game.progress?.levels;

  if (!levels || levels.length === 0) return null;

  const recent = [...levels]
    .sort((a, b) => b.level - a.level)
    .slice(0, 4);

  return (
    <div>
      <h2
        className="mb-3 text-lg font-bold tracking-tight text-white"
        style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
      >
        {t('recentGames.title')}
      </h2>
      <div
        className="rounded-2xl px-4 py-2"
        style={{
          backgroundImage:
            'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
            ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
            'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderTopColor: 'rgba(255,255,255,0.22)',
        }}
      >
        {recent.map((entry) => (
          <div
            key={entry.level}
            className="flex items-center gap-3 border-b border-white/6 py-2.5 last:border-b-0"
          >
            <span
              className={
                'rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ' +
                (entry.stars >= 1
                  ? 'bg-emerald-500/12 text-emerald-400'
                  : 'bg-red-500/10 text-red-400')
              }
            >
              {entry.stars >= 1 ? t('recentGames.won') : t('recentGames.lost')}
            </span>
            <div className="flex-1">
              <div
                className="text-sm font-semibold text-slate-200"
                style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
              >
                {t('recentGames.level', { level: entry.level })}
              </div>
              <div className="text-xs text-slate-500">{t('recentGames.moves', { count: entry.moves })}</div>
            </div>
            <div className="text-sm font-bold tabular-nums text-amber-400">
              {t('recentGames.points', { points: entry.points.toLocaleString() })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
