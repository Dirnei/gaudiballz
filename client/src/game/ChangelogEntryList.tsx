import { useTranslation } from 'react-i18next';
import type { ChangelogEntry } from '../changelog/entries';

function formatDate(date: string, language: string): string {
  // Pinned to UTC so a calendar day never slips to the day before in western timezones.
  return new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

function Items({ label, items }: { readonly label: string; readonly items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {/* Release notes come from commit subjects and are English whatever the UI language. */}
      <ul lang="en" className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Releases as a version heading with "New" and "Fixed" lists. */
export function ChangelogEntryList({
  entries,
  headingLevel = 2,
}: {
  readonly entries: readonly ChangelogEntry[];
  /** 3 when nested under a dialog's own heading. */
  readonly headingLevel?: 2 | 3;
}) {
  const { t, i18n } = useTranslation();
  const Heading = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <div className="space-y-6 text-sm leading-relaxed text-slate-300">
      {entries.map((entry) => (
        <section key={entry.version} className="space-y-3">
          <Heading className="flex flex-wrap items-baseline gap-x-2 font-semibold text-violet-300">
            {t('changelog.version', { version: entry.version })}{' '}
            <span className="text-xs font-normal text-slate-500">{formatDate(entry.date, i18n.language)}</span>
          </Heading>
          <Items label={t('changelog.features')} items={entry.features} />
          <Items label={t('changelog.fixes')} items={entry.fixes} />
        </section>
      ))}
    </div>
  );
}
