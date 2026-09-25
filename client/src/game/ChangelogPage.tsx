import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CHANGELOG } from '../changelog/entries';
import { markAllSeen } from '../changelog/seen';
import { ChangelogEntryList } from './ChangelogEntryList';
import { PageLayout } from './PageLayout';

export function ChangelogPage() {
  const { t } = useTranslation();

  // Reading the whole list is seeing it; the notice has nothing left to say afterwards.
  useEffect(() => markAllSeen(), []);

  return (
    <PageLayout title={t('changelog.title')}>
      <ChangelogEntryList entries={CHANGELOG} />
    </PageLayout>
  );
}
