import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { BoardPreview } from './BoardPreview';
import { formatDailyDate } from './dailyDate';
import { useGameContext } from './GameContext';
import { API } from './identity';
import { formatTime } from './LiveTimer';
import { PageLayout } from './PageLayout';
import { ballForAccount } from './profileBall';
import { ballStyle } from '../skins';

interface SharedResult {
  readonly kind: 'level' | 'daily';
  readonly level?: number;
  readonly code?: string;
  readonly date?: string;
  readonly isToday?: boolean;
  readonly stars: number;
  readonly moves: number;
  readonly hints: number;
  readonly elapsedTimeMs: number;
  readonly par: number;
  readonly timeTargetMs: number;
  readonly player: { readonly username: string; readonly ball: number | null } | null;
  readonly board: { readonly tubes: number[][]; readonly capacity: number };
  readonly rank: { readonly position: number; readonly total: number };
}

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'missing' }
  | { readonly state: 'ready'; readonly result: SharedResult };

const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

/**
 * The page behind a shared result link: what a friend solved, how well, on which board, and a
 * way straight into the same puzzle. Open to anyone, and it asks nothing of the viewer.
 */
export function SharedResultPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const game = useGameContext();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/v1/shares/${encodeURIComponent(id ?? '')}`);
        if (cancelled) return;
        setLoad(res.ok ? { state: 'ready', result: await res.json() as SharedResult } : { state: 'missing' });
      } catch {
        if (!cancelled) setLoad({ state: 'missing' });
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (load.state !== 'ready') {
    return (
      <PageLayout title={t('shared.title')}>
        {load.state === 'loading' ? (
          <p className="text-center text-sm text-slate-400">{t('shared.loading')}</p>
        ) : (
          <div className="text-center">
            <p className="text-sm text-slate-300">{t('shared.notFound')}</p>
            <PlayButton label={t('shared.toGame')} onClick={() => navigate('/')} />
          </div>
        )}
      </PageLayout>
    );
  }

  const r = load.result;
  const isDaily = r.kind === 'daily';

  async function playLevel() {
    if (r.code !== undefined && (await game.unlockWithCode(r.code)) !== null) {
      navigate('/play');
    }
  }

  return (
    <PageLayout title={t('shared.title')}>
      <div className="mx-auto max-w-sm rounded-3xl bg-slate-800/80 p-6 text-center ring-1 ring-white/10">
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-base text-slate-300">
          {r.player !== null && (
            <span
              className="h-4 w-4 flex-shrink-0 rounded-full"
              style={ballStyle(ballForAccount(r.player.ball, r.player.username))}
            />
          )}
          <span className="font-semibold text-white" style={fredoka}>
            {r.player?.username ?? t('shared.aPlayer')}
          </span>
          <span>
            {isDaily
              ? t('shared.solvedDaily', { date: formatDailyDate(r.date ?? '', i18n.language) })
              : t('shared.solvedLevel', { id: r.level })}
          </span>
        </p>

        <div
          className="mt-3 flex justify-center gap-1"
          role="img"
          aria-label={t('shared.starsLabel', { stars: r.stars })}
        >
          {[1, 2, 3].map((i) => (
            <span key={i} className={`text-3xl ${i <= r.stars ? 'text-amber-400' : 'text-slate-600'}`}>★</span>
          ))}
        </div>

        <div className="mt-2 space-y-0.5 text-sm tabular-nums text-slate-300">
          <p>{t('game.shareMoves', { moves: r.moves, par: r.par })}</p>
          <p>{t('shared.time', { time: formatTime(r.elapsedTimeMs), target: formatTime(r.timeTargetMs) })}</p>
          {r.hints > 0 && <p className="text-slate-400">{t('game.hints', { count: r.hints })}</p>}
        </div>

        <p className="mt-3 text-sm font-semibold text-violet-300">
          {t(isDaily ? 'shared.rankDaily' : 'shared.rankLevel', r.rank)}
        </p>

        <div className="mt-5">
          <BoardPreview tubes={r.board.tubes} capacity={r.board.capacity} />
        </div>

        {isDaily && !r.isToday && (
          <p className="mt-5 text-sm text-slate-400">{t('shared.dailyEnded')}</p>
        )}
        {isDaily ? (
          <PlayButton label={t('shared.playDaily')} onClick={() => navigate('/daily')} />
        ) : (
          <PlayButton label={t('shared.playLevel', { id: r.level })} onClick={() => void playLevel()} />
        )}
      </div>
    </PageLayout>
  );
}

function PlayButton({ label, onClick }: { readonly label: string; readonly onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="mt-5 w-full rounded-2xl bg-sky-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-sky-500/30"
    >
      {label}
    </motion.button>
  );
}
