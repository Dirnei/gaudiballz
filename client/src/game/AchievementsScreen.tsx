import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import type { Achievement, AchievementState } from './achievements';
import { useGameContext } from './GameContext';
import { PageLayout } from './PageLayout';

const CATEGORY_ORDER = ['milestone', 'perfection', 'streak', 'calendar', 'exploration'];

// Category labels now come from t(`achievements.category.${cat}`).

const CATEGORY_ICONS: Record<string, string> = {
  milestone: '📊',
  perfection: '✨',
  streak: '🔥',
  calendar: '📅',
  exploration: '🧭',
};

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl p-4 transition-colors ${
        achievement.earned
          ? 'bg-amber-500/10 ring-1 ring-amber-400/20'
          : 'bg-white/4 ring-1 ring-white/6'
      }`}
    >
      <span className="mt-0.5 text-xl">{achievement.earned ? '🏆' : '🔒'}</span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${
            achievement.earned ? 'text-amber-200' : 'text-slate-400'
          }`}
        >
          {achievement.name}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          {achievement.description}
        </p>
        {!achievement.earned &&
          achievement.threshold !== null &&
          achievement.progress !== null && (
            <div className="mt-2 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 rounded-full bg-white/8">
                <div
                  className="h-1.5 rounded-full bg-amber-400/50 transition-all"
                  style={{
                    width: `${Math.min(100, (achievement.progress / achievement.threshold) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[0.7rem] tabular-nums text-slate-500">
                {achievement.progress}/{achievement.threshold}
              </span>
            </div>
          )}
      </div>
    </div>
  );
}

function OverallProgress({ state }: { state: AchievementState }) {
  const { t } = useTranslation();
  const earned = state.achievements.filter((a) => a.earned).length;
  const total = state.achievements.length;
  const pct = total > 0 ? (earned / total) * 100 : 0;

  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/8">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{t('achievements.overallProgress')}</span>
        <span className="text-sm font-semibold tabular-nums text-amber-300">
          {earned} / {total}
        </span>
      </div>
      <div className="mt-2.5 h-2 rounded-full bg-white/8">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AchievementsScreen() {
  const { t } = useTranslation();
  const game = useGameContext();
  const navigate = useNavigate();
  const { identity, achievements: state } = game;
  const loggedIn = identity !== null && !identity.isAnonymous;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <PageLayout title={t('achievements.title')}>
      {!loggedIn ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl">🏆</span>
          <p className="mt-4 text-base font-semibold text-slate-300">
            {t('achievements.forRegistered')}
          </p>
          <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-slate-500">
            {t('achievements.createToEarn')}
          </p>
        </div>
      ) : state === null ? (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="text-sm text-slate-400"
          >
            {t('achievements.loading')}
          </motion.div>
        </div>
      ) : (
        <div className="space-y-5">
          <OverallProgress state={state} />

          {CATEGORY_ORDER.map((cat) => {
            const items = state.achievements.filter((a) => a.category === cat);
            if (items.length === 0) {
              return null;
            }

            const categoryEarned = items.filter((a) => a.earned).length;

            return (
              <section key={cat}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t(`achievements.category.${cat}`)}
                  </h2>
                  <span className="text-[0.65rem] tabular-nums text-slate-600">
                    {categoryEarned}/{items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((a) => (
                    <AchievementCard key={a.id} achievement={a} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
