import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameContext } from './GameContext';
import { API, authHeaders } from './identity';
import { rankFromXp, nextThreshold, currentThreshold, TIER_COLOURS, type TierName } from './rank';
import { StreakFreezeBadge, StreakSavedNotice } from './StreakFreeze';

interface HubStats {
  readonly currentStreak: number;
  readonly globalRank: number;
  readonly streakFreezes?: number;
  readonly streakSavedDays?: number;
  readonly streakAnchorDay?: string | null;
}

export function ProgressTiles() {
  const { t } = useTranslation();
  const game = useGameContext();
  const totalPoints = game.progress?.totalPoints ?? 0;
  const highestLevel = game.progress?.highestCompleted ?? 0;
  const isRegistered = game.identity !== null && !game.identity.isAnonymous;
  // Anonymous players have a server-side streak too, and streak freezes live there.
  const playerId = game.identity?.playerId ?? null;
  const [hub, setHub] = useState<HubStats | null>(null);

  useEffect(() => {
    if (playerId === null) return;
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
  }, [playerId]);

  if (totalPoints === 0 && highestLevel === 0) return null;

  const streak = hub?.currentStreak ?? (highestLevel > 0 ? 1 : 0);
  const globalRank = hub?.globalRank;
  const playerRank = rankFromXp(totalPoints);

  const freezes = hub?.streakFreezes ?? 0;

  return (
    <div className="space-y-2.5">
      {hub && (
        <StreakSavedNotice
          savedDays={hub.streakSavedDays ?? 0}
          streak={hub.currentStreak}
          freezesLeft={freezes}
          anchorDay={hub.streakAnchorDay ?? null}
        />
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <RankTile tier={playerRank.tier} subLevel={playerRank.subLevel} xp={totalPoints} />
        <Tile value={String(highestLevel)} label={t('stats.currentLevel')} color="text-violet-400" />
        <Tile value={String(streak)} label={t('stats.dayStreak')} color="text-emerald-400" badge={<StreakFreezeBadge count={freezes} />} />
        {isRegistered && globalRank != null && globalRank > 0
          ? <Tile value={`#${globalRank}`} label={t('stats.globalRank')} color="text-sky-400" />
          : <Tile value={totalPoints.toLocaleString()} label={t('stats.totalPoints')} color="text-amber-400" />
        }
      </div>
    </div>
  );
}

function Tile({ value, label, color, badge }: { value: string; label: string; color: string; badge?: ReactNode }) {
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
      <div className="mt-0.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500">
        {label}
        {badge}
      </div>
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
