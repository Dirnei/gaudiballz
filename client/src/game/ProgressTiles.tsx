import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameContext } from './GameContext';
import { API, authHeaders } from './identity';
import { rankFromXp, nextThreshold, currentThreshold, TIER_COLOURS, type TierName } from './rank';

interface HubStats {
  readonly currentStreak: number;
  readonly globalRank: number;
}

export function ProgressTiles() {
  const { t } = useTranslation();
  const game = useGameContext();
  const totalPoints = game.progress?.totalPoints ?? 0;
  const highestLevel = game.progress?.highestCompleted ?? 0;
  const isRegistered = game.identity !== null && !game.identity.isAnonymous;
  const [hub, setHub] = useState<HubStats | null>(null);

  useEffect(() => {
    if (!isRegistered) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/hub/player/stats`, { headers: authHeaders() });
        if (res.ok && !cancelled) {
          const data = await res.json() as HubStats;
          setHub(data);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [isRegistered]);

  if (totalPoints === 0 && highestLevel === 0) return null;

  const streak = hub?.currentStreak ?? (highestLevel > 0 ? 1 : 0);
  const globalRank = hub?.globalRank;
  const playerRank = rankFromXp(totalPoints);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <RankTile tier={playerRank.tier} subLevel={playerRank.subLevel} xp={totalPoints} />
      <Tile value={String(highestLevel)} label={t('stats.currentLevel')} color="text-violet-400" />
      <Tile value={String(streak)} label={t('stats.dayStreak')} color="text-emerald-400" />
      {isRegistered && globalRank != null && globalRank > 0
        ? <Tile value={`#${globalRank}`} label={t('stats.globalRank')} color="text-sky-400" />
        : <Tile value={totalPoints.toLocaleString()} label={t('stats.totalPoints')} color="text-amber-400" />
      }
    </div>
  );
}

function Tile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div
      className="rounded-2xl p-4 text-center"
      style={{
        backgroundImage:
          'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
          ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
          'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderTopColor: 'rgba(255,255,255,0.22)',
      }}
    >
      <div
        className={`text-2xl font-bold tracking-tight tabular-nums ${color}`}
        style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
}

function RankTile({ tier, subLevel, xp }: { tier: TierName; subLevel: number; xp: number }) {
  const { t } = useTranslation();
  const colour = TIER_COLOURS[tier];
  const next = nextThreshold(xp);
  const current = currentThreshold(xp);
  const progress = next != null ? (xp - current) / (next - current) : 1;

  return (
    <div
      className="rounded-2xl p-4 text-center"
      style={{
        backgroundImage:
          'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%,' +
          ' rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%),' +
          'radial-gradient(120% 90% at 50% -10%, #1B2748 0%, #131C36 45%, #0B1122 100%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderTopColor: 'rgba(255,255,255,0.22)',
      }}
    >
      <div
        className="text-lg font-bold tracking-tight"
        style={{ color: colour, fontFamily: "'Fredoka', system-ui, sans-serif" }}
      >
        {t(`rank.${tier}`)} {subLevel}
      </div>
      {next != null && (
        <div className="mx-auto mt-1.5 h-1 w-full max-w-[5rem] overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${Math.min(progress * 100, 100)}%`, backgroundColor: colour }} />
        </div>
      )}
      <div className="mt-0.5 text-xs font-semibold text-slate-500">{t('stats.rankProgress')}</div>
    </div>
  );
}
