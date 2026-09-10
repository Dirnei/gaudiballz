import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { API, authHeaders } from './identity';
import { useGameContext } from './GameContext';
import { ballForAccount } from './profileBall';
import { ballStyle } from '../skins';

interface LeaderboardEntry {
  readonly rank: number;
  readonly playerId: string;
  readonly username: string;
  readonly ball: number | null;
  readonly totalPoints: number;
  readonly gamesPlayed: number;
  readonly gamesWon: number;
}

interface LeaderboardResponse {
  readonly entries: LeaderboardEntry[];
  readonly viewer: LeaderboardEntry | null;
  readonly total: number;
}

type Period = 'alltime' | 'week' | 'today';

export function LeaderboardPage() {
  const { t } = useTranslation();
  const game = useGameContext();
  const myId = game.identity?.playerId ?? null;

  const [period, setPeriod] = useState<Period>('alltime');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/hub/leaderboard?period=${p}&limit=20`, { headers: authHeaders() });
      if (res.ok) setData(await res.json() as LeaderboardResponse);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchData(period); }, [period, fetchData]);

  const allEntries = data?.entries ?? [];
  const top3 = allEntries.length >= 3 ? allEntries.slice(0, 3) : [];
  const rest = allEntries.length >= 3 ? allEntries.slice(3) : allEntries;
  const winRate = (e: LeaderboardEntry) =>
    e.gamesPlayed > 0 ? Math.round((e.gamesWon / e.gamesPlayed) * 100) : 0;

  const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-6">
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="mx-auto w-full max-w-3xl pt-5"
      >
        <h1 className="text-2xl font-bold tracking-tight text-white" style={fredoka}>
          {t('leaderboard.title')}
        </h1>

        {/* Period tabs */}
        <div className="mt-4 flex gap-1 rounded-full bg-white/4 p-1 w-fit">
          {([['alltime', t('leaderboard.allTime')], ['week', t('leaderboard.thisWeek')], ['today', t('leaderboard.today')]] as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors ' +
                (period === key
                  ? 'bg-violet-500/15 text-violet-300'
                  : 'text-slate-400 hover:text-slate-200')
              }
              style={fredoka}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && !data && (
          <p className="mt-12 text-center text-sm text-slate-500">{t('leaderboard.loading')}</p>
        )}

        {/* Podium */}
        {top3.length >= 3 && (
          <div className="mt-6 flex items-end justify-center gap-4">
            <PodiumSlot entry={top3[1]} rank={2} winRate={winRate(top3[1])} />
            <PodiumSlot entry={top3[0]} rank={1} winRate={winRate(top3[0])} first />
            <PodiumSlot entry={top3[2]} rank={3} winRate={winRate(top3[2])} />
          </div>
        )}

        {/* Table */}
        {rest.length > 0 && (
          <div className="mt-6 overflow-x-auto px-1">
            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: '0 0.3rem' }}>
              <thead>
                <tr className="text-left text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500" style={fredoka}>
                  <th className="py-1 px-3">{t('leaderboard.rank')}</th>
                  <th className="py-1 px-3">{t('leaderboard.player')}</th>
                  <th className="py-1 px-3">{t('leaderboard.points')}</th>
                  <th className="py-1 px-3 hidden sm:table-cell">{t('leaderboard.games')}</th>
                  <th className="py-1 px-3 text-right">{t('leaderboard.winRate')}</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((e) => {
                  const isMe = e.playerId === myId;
                  return (
                    <tr
                      key={e.playerId}
                      className="transition-colors hover:bg-white/5"
                      style={isMe ? { boxShadow: 'inset 0 0 0 2px #9333EA', borderRadius: '0.75rem' } : undefined}
                    >
                      <td className="rounded-l-xl bg-white/4 py-2.5 px-3 font-bold tabular-nums text-slate-500" style={fredoka}>{e.rank}</td>
                      <td className="bg-white/4 py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-full flex-shrink-0" style={ballStyle(ballForAccount(e.ball, e.username))} />
                          <span className="font-semibold" style={{ ...fredoka, color: isMe ? '#A855F7' : undefined }}>
                            {e.username}{isMe ? ` ${t('leaderboard.you')}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="bg-white/4 py-2.5 px-3 font-bold tabular-nums text-amber-400">{e.totalPoints.toLocaleString()}</td>
                      <td className="bg-white/4 py-2.5 px-3 hidden sm:table-cell tabular-nums text-slate-400">{e.gamesPlayed}</td>
                      <td className="rounded-r-xl bg-white/4 py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="h-1.5 w-12 rounded-full bg-white/6 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${winRate(e)}%` }} />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-slate-400 min-w-[2rem] text-right">{winRate(e)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Own rank if not visible */}
        {data?.viewer && !data.entries.some((e) => e.playerId === myId) && (
          <div
            className="mx-auto mt-4 flex max-w-sm items-center justify-between gap-3 rounded-2xl px-4 py-3"
            style={{
              backgroundImage:
                'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.02) 70%, rgba(255,255,255,0.06) 100%)',
              border: '2px solid #9333EA',
            }}
          >
            <span className="text-sm font-bold text-violet-300" style={fredoka}>{t('leaderboard.yourRank', { rank: data.viewer.rank })}</span>
            <span className="text-sm font-bold tabular-nums text-amber-400">{t('leaderboard.pts', { points: data.viewer.totalPoints.toLocaleString() })}</span>
          </div>
        )}

        {data && data.entries.length === 0 && (
          <p className="mt-12 text-center text-sm text-slate-500">
            {t('leaderboard.empty')}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function PodiumSlot({
  entry, rank, winRate, first,
}: {
  entry: LeaderboardEntry;
  rank: number;
  winRate: number;
  first?: boolean;
}) {
  const { t } = useTranslation();
  const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;
  const size = first ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base';
  const pedestalH = first ? 'h-[72px]' : rank === 2 ? 'h-[52px]' : 'h-[36px]';

  return (
    <div className="w-[120px] flex-shrink-0 text-center sm:w-[140px]">
      <div
        className={`mx-auto flex items-center justify-center rounded-full font-bold text-white ${size}`}
        style={{
          ...ballStyle(ballForAccount(entry.ball, entry.username)),
          boxShadow: first ? '0 0 24px rgba(250,204,21,0.3)' : undefined,
          border: first ? '2px solid #FACC15' : undefined,
        }}
      >
        {entry.username.charAt(0).toUpperCase()}
      </div>
      <div className="mt-1.5 text-xs font-bold text-amber-400" style={fredoka}>
        {first && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mr-0.5 inline-block align-[-2px]" aria-hidden="true">
            <path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7z" fill="#FACC15" />
          </svg>
        )}
        #{rank}
      </div>
      <div className="mt-0.5 truncate text-sm font-bold text-slate-200" style={fredoka}>{entry.username}</div>
      <div className="text-xs tabular-nums text-slate-500">{t('leaderboard.pts', { points: entry.totalPoints.toLocaleString() })}</div>
      <div className="text-[0.65rem] font-bold text-emerald-400">{t('leaderboard.winPct', { pct: winRate })}</div>
      <div className={`mt-2 rounded-t-lg bg-gradient-to-t from-white/4 to-white/7 ring-1 ring-white/6 ring-b-0 ${pedestalH}`} />
    </div>
  );
}
