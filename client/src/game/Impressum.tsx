import { PageLayout } from './PageLayout';

export function Impressum() {
  return (
    <PageLayout title="Impressum">
      <div className="space-y-6 text-sm leading-relaxed text-slate-300">
        <p className="text-xs text-slate-500">Angaben gemäß § 5 TMG / § 18 MStV</p>

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Verantwortlich</h2>
          <p>
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">[Ihr Name]</span>
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Anschrift</h2>
          <p>
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">[Ihre Straße und Hausnummer]</span><br />
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">[PLZ und Stadt]</span><br />
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">[Land]</span>
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Kontakt</h2>
          <p>
            E-Mail:{' '}
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">[Ihre E-Mail-Adresse]</span>
          </p>
        </section>

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
