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

/**
 * Renders the star rating.
 *
 * Three glyphs cost roughly three times the width of the digit they encode, which the
 * compact row needs for the player's name. The rating itself never goes away in either
 * form: it is the primary ranking key, and without it the order of the rows is contradicted
 * by every other number on screen.
 */
function Stars({ stars, compact }: { stars: number; compact: boolean }) {
  if (compact) {
    return (
      <span className="flex items-center justify-end gap-0.5 text-xs tabular-nums text-amber-400">
        <span aria-hidden="true">★</span>
        {stars}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`text-xs ${i <= stars ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
      ))}
    </div>
  );
}

export function LevelLeaderboard({
  level,
  myId,
  compact = false,
}: {
  level: number;
  myId?: string;
  /** Drops the ball and rank badge and shrinks the stars, for the completion dialog. */
  compact?: boolean;
}) {
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

      {/*
        A real table, because the columns have to line up down the list. Sizing them by hand
        meant guessing a width wide enough for "120.0s", which the name column then paid for
        on every row. Here each column takes exactly its widest cell and the name absorbs
        whatever is left: `w-px` shrinks a column to its content, while `w-full max-w-0`
        makes the name take the remainder and ellipsise inside it.
      */}
      {data && data.entries.length > 0 && (
        <table className="mt-3 w-full border-separate" style={{ borderSpacing: '0 4px' }}>
          <tbody>
            {data.entries.map((e) => {
              const isViewer = myId !== undefined && e.playerId === myId;
              const { tier, subLevel } = rankFromXp(e.allTimeXp);
              const cell = 'py-2';
              return (
                <tr
                  key={e.playerId}
                  style={{
                    background: isViewer ? 'rgba(147,51,234,0.12)' : 'rgba(255,255,255,0.04)',
                    outline: isViewer ? '1px solid rgba(147,51,234,0.4)' : 'none',
                    outlineOffset: '-1px',
                  }}
                >
                  <td className={`${cell} w-px rounded-l-xl pl-3 pr-2 text-right text-sm font-bold tabular-nums text-slate-500`} style={fredoka}>
                    {e.rank}
                  </td>
                  {!compact && (
                    <td className={`${cell} w-px pr-2`}>
                      <RankRing tier={tier} size={14}>
                        <span
                          className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
                          style={ballStyle(ballForAccount(e.ball, e.username))}
                        />
                      </RankRing>
                    </td>
                  )}
                  <td
                    className={`${cell} w-full max-w-0 truncate pr-2 text-sm font-semibold`}
                    style={{ ...fredoka, color: isViewer ? '#A855F7' : undefined }}
                  >
                    {e.username}
                    {isViewer && <span className="text-xs text-slate-500"> {t('leaderboard.you')}</span>}
                  </td>
                  {!compact && (
                    <td className={`${cell} w-px pr-2`}>
                      <RankBadge tier={tier} subLevel={subLevel} className="hidden sm:inline-flex" />
                    </td>
                  )}
                  <td className={`${cell} w-px pr-2`}>
                    <Stars stars={e.stars} compact={compact} />
                  </td>
                  <td className={`${cell} w-px pr-2 text-right text-xs tabular-nums text-slate-400`}>{e.moves}m</td>
                  <td className={`${cell} w-px rounded-r-xl pr-3 text-right text-xs tabular-nums text-slate-500`}>
                    {formatElapsed(e.timeMs)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Viewer outside top 10 */}
      {data?.viewer && !viewerInList && (
        <div className="mt-3 rounded-xl px-3 py-2" style={{ background: 'rgba(147,51,234,0.12)', border: '1px solid rgba(147,51,234,0.4)' }}>
          <p className="text-xs font-semibold text-violet-300" style={fredoka}>
            {t('levelLeaderboard.yourRank', { rank: data.viewer.rank })}
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-300">
            <Stars stars={data.viewer.stars} compact={compact} />
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
