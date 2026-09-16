import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, authHeaders } from './identity';
import { ballForAccount } from './profileBall';
import { ballStyle } from '../skins';
import { rankFromXp } from './rank';
import { RankBadge } from './RankBadge';
import { RankRing } from './RankRing';

interface LevelLeaderboardEntry {
  readonly rank: number;
  readonly playerId: string;
  readonly username: string;
  readonly ball: number | null;
  readonly stars: number;
  readonly moves: number;
  readonly timeMs: number;
  readonly allTimeXp: number;
}

interface LevelLeaderboardViewer {
  readonly rank: number;
  readonly stars: number;
  readonly moves: number;
  readonly timeMs: number;
}

interface LevelLeaderboardResponse {
  readonly entries: LevelLeaderboardEntry[];
  readonly viewer: LevelLeaderboardViewer | null;
}

type Period = 'alltime' | 'week' | 'today';

function formatElapsed(ms: number): string {
  if (ms <= 0) return '—';
  const s = (ms / 1000).toFixed(1);
  return `${s}s`;
}

export async function fetchLevelLeaderboard(level: number, period: Period): Promise<LevelLeaderboardResponse | null> {
  try {
    const p = period === 'alltime' ? '' : `&period=${period}`;
    const res = await fetch(`${API}/api/hub/level-leaderboard?level=${level}${p}`, { headers: authHeaders() });
    if (res.ok) return await res.json() as LevelLeaderboardResponse;
  } catch { /* silent */ }
  return null;
}

export function LevelLeaderboard({ level, myId }: { level: number; myId?: string }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('alltime');
  const [data, setData] = useState<LevelLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const result = await fetchLevelLeaderboard(level, period);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [level, period]);

  const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

  const periods: { key: Period; label: string }[] = [
    { key: 'alltime', label: t('levelLeaderboard.allTime') },
    { key: 'week', label: t('levelLeaderboard.thisWeek') },
    { key: 'today', label: t('levelLeaderboard.today') },
  ];

  const viewerInList = data?.viewer && data.entries.some((e) => e.playerId === myId);

  return (
    <div>
      <h3 className="text-base font-bold tracking-tight text-white" style={fredoka}>
        {t('levelLeaderboard.title', { level })}
      </h3>

      {/* Period toggle */}
      <div className="mt-2 flex rounded-full bg-white/4 p-1">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              period === p.key ? 'bg-violet-500/15 text-violet-300' : 'text-slate-400'
            }`}
            style={fredoka}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && !data && (
        <p className="mt-4 text-center text-sm text-slate-500">{t('levelLeaderboard.loading')}</p>
      )}

      {data && data.entries.length === 0 && !loading && (
        <p className="mt-4 text-center text-sm text-slate-500">{t('levelLeaderboard.empty')}</p>
      )}

      {data && data.entries.length > 0 && (
        <div className="mt-3 space-y-1">
          {data.entries.map((e) => {
            const isViewer = myId !== undefined && e.playerId === myId;
            const { tier, subLevel } = rankFromXp(e.allTimeXp);
            return (
              <div
                key={e.playerId}
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: isViewer ? 'rgba(147,51,234,0.12)' : 'rgba(255,255,255,0.04)',
                  border: isViewer ? '1px solid rgba(147,51,234,0.4)' : '1px solid transparent',
                }}
              >
                <span className="w-5 text-right text-sm font-bold tabular-nums text-slate-500" style={fredoka}>
                  {e.rank}
                </span>
                <RankRing tier={tier} size={14}>
                  <span
                    className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
                    style={ballStyle(ballForAccount(e.ball, e.username))}
                  />
                </RankRing>
                <span
                  className="flex-1 truncate text-sm font-semibold"
                  style={{ ...fredoka, color: isViewer ? '#A855F7' : undefined }}
                >
                  {e.username}
                  {isViewer && <span className="text-xs text-slate-500"> {t('leaderboard.you')}</span>}
                </span>
                <RankBadge tier={tier} subLevel={subLevel} className="hidden sm:inline-flex" />
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((i) => (
                    <span key={i} className={`text-xs ${i <= e.stars ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
                  ))}
                </div>
                <span className="text-xs tabular-nums text-slate-400">{e.moves}m</span>
                <span className="text-xs tabular-nums text-slate-500">{formatElapsed(e.timeMs)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Viewer outside top 10 */}
      {data?.viewer && !viewerInList && (
        <div className="mt-3 rounded-xl px-3 py-2" style={{ background: 'rgba(147,51,234,0.12)', border: '1px solid rgba(147,51,234,0.4)' }}>
          <p className="text-xs font-semibold text-violet-300" style={fredoka}>
            {t('levelLeaderboard.yourRank', { rank: data.viewer.rank })}
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-300">
            <span>
              {[1, 2, 3].map((i) => (
                <span key={i} className={i <= data.viewer!.stars ? 'text-amber-400' : 'text-slate-700'}>★</span>
              ))}
            </span>
            <span className="text-slate-500">·</span>
            <span>{data.viewer.moves}m</span>
            <span className="text-slate-500">·</span>
            <span>{formatElapsed(data.viewer.timeMs)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
