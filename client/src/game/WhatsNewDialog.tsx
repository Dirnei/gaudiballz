import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import type { ChangelogEntry } from '../changelog/entries';
import { markAllSeen, useUnseenChangelog } from '../changelog/seen';
import { ChangelogEntryList } from './ChangelogEntryList';

/** More than this and the notice becomes a page; the rest is one link away. */
const MAX_SHOWN = 5;

const fredoka = { fontFamily: "'Fredoka', system-ui, sans-serif" } as const;

/**
 * Tells a returning player what changed since they were last here, once.
 *
 * Lives in the app shell, so it can never cover gameplay, the tutorial or the daily — it
 * simply waits until the player is back on a page with a footer. Any way out counts as
 * having seen it, so it does not come back until there is something newer.
 */
export function WhatsNewDialog() {
  const { t } = useTranslation();
  const unseen = useUnseenChangelog();
  const { pathname } = useLocation();
  const open = unseen.length > 0 && pathname !== '/changelog';

  return (
    <AnimatePresence>
      {open && <Notice entries={unseen.slice(0, MAX_SHOWN)} title={t('changelog.dialogTitle')} />}
    </AnimatePresence>
  );
}

function Notice({ entries, title }: { readonly entries: readonly ChangelogEntry[]; readonly title: string }) {
  const { t } = useTranslation();
  const gotIt = useRef<HTMLButtonElement>(null);
  const close = () => markAllSeen();

  useEffect(() => {
    gotIt.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') markAllSeen();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <motion.div
      data-testid="whats-new-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-slate-900 p-5 shadow-xl ring-1 ring-white/10"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <h2 id="whats-new-title" className="text-lg font-bold text-white" style={fredoka}>
          {title}
        </h2>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <ChangelogEntryList entries={entries} headingLevel={3} />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={gotIt}
            type="button"
            onClick={close}
            className="w-full rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white"
            style={fredoka}
          >
            {t('changelog.gotIt')}
          </button>
          <Link
            to="/changelog"
            onClick={close}
            className="w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-slate-400 transition-colors hover:text-slate-200"
            style={fredoka}
          >
            {t('changelog.seeAll')}
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
