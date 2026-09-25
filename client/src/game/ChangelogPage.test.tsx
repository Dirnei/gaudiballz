import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../i18n/i18n';
import { CHANGELOG } from '../changelog/entries';
import { SEEN_KEY, unseenEntries } from '../changelog/seen';
import { ChangelogPage } from './ChangelogPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ChangelogPage />
    </MemoryRouter>,
  );
}

const newest = CHANGELOG[0]!;
const firstItem = newest.features[0] ?? newest.fixes[0]!;

beforeEach(() => localStorage.setItem(SEEN_KEY, '0.0.0'));
afterEach(async () => {
  await act(() => i18n.changeLanguage('en'));
});

describe('ChangelogPage', () => {
  it('lists every release, newest first, with its version and date', () => {
    renderPage();

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(CHANGELOG.map((r) => expect.stringContaining(`Version ${r.version}`)));

    const date = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(
      new Date(`${newest.date}T00:00:00Z`),
    );
    expect(headings[0]).toContain(date);
    expect(screen.getAllByText(firstItem)[0]).toBeInTheDocument();
  });

  it('groups a release into what is new and what is fixed', () => {
    renderPage();

    const release = CHANGELOG.find((r) => r.features.length > 0 && r.fixes.length > 0) ?? newest;
    const section = screen.getByRole('heading', { level: 2, name: (name) => name.startsWith(`Version ${release.version} `) })
      .parentElement!;
    if (release.features.length > 0) expect(within(section).getByText('New')).toBeInTheDocument();
    if (release.fixes.length > 0) expect(within(section).getByText('Fixed')).toBeInTheDocument();
  });

  it('keeps release text in English but labels in German', async () => {
    await act(() => i18n.changeLanguage('de'));
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Was ist neu' })).toBeInTheDocument();
    const item = screen.getAllByText(firstItem)[0]!;
    expect(item.closest('[lang="en"]')).not.toBeNull();
    expect(screen.getAllByText(/^(Neu|Behoben)$/).length).toBeGreaterThan(0);
  });

  it('counts as having seen every release', () => {
    expect(unseenEntries().length).toBeGreaterThan(0);

    renderPage();

    expect(unseenEntries()).toEqual([]);
  });
});
