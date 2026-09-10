import { PageLayout } from './PageLayout';
import { useLegalContact } from './useLegalContact';

export function Impressum() {
  const { contact, loading, configured } = useLegalContact();

  return (
    <PageLayout title="Impressum">
      <div className="space-y-6 text-sm leading-relaxed text-slate-300">
        <p className="text-xs text-slate-500">Angaben gemäß § 5 TMG / § 18 MStV</p>

        {loading ? (
          <p className="text-slate-500">Laden…</p>
        ) : !configured ? (
          <p className="rounded bg-amber-500/15 px-3 py-2 text-amber-300">
            Die Betreiberinformationen wurden noch nicht konfiguriert.
          </p>
        ) : (
          <>
            <section>
              <h2 className="mb-1 font-semibold text-slate-200">Verantwortlich</h2>
              <p>{contact!.name}</p>
            </section>

            <section>
              <h2 className="mb-1 font-semibold text-slate-200">Anschrift</h2>
              <p>
                {contact!.street}<br />
                {contact!.city}<br />
                {contact!.country}
              </p>
            </section>

            <section>
              <h2 className="mb-1 font-semibold text-slate-200">Kontakt</h2>
              <p>E-Mail: {contact!.email}</p>
            </section>
          </>
        )}

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Haftungsausschluss</h2>
          <p className="text-xs leading-relaxed text-slate-400">
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die
            Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich
            deren Betreiber verantwortlich.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
