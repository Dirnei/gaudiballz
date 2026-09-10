import { PageLayout } from './PageLayout';
import { useLegalContact } from './useLegalContact';

export function Datenschutz() {
  const { contact, loading, configured } = useLegalContact();

  return (
    <PageLayout title="Datenschutz">
      <div className="space-y-6 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Verantwortlicher</h2>
          {loading ? (
            <p className="text-slate-500">Laden…</p>
          ) : !configured ? (
            <p className="rounded bg-amber-500/15 px-3 py-2 text-amber-300">
              Die Betreiberinformationen wurden noch nicht konfiguriert.
            </p>
          ) : (
            <>
              <p>
                {contact!.name}, {contact!.street}, {contact!.city}, {contact!.country}
              </p>
              <p className="mt-1">E-Mail: {contact!.email}</p>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Erhobene Daten</h2>
          <p>
            Diese Anwendung erhebt und verarbeitet die folgenden personenbezogenen Daten:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
            <li>
              <strong className="text-slate-300">Anonyme Kennung:</strong> Beim ersten Start wird
              eine zufällige Spieler-ID erzeugt, die keinen Rückschluss auf Ihre Person erlaubt.
            </li>
            <li>
              <strong className="text-slate-300">Passkey-Authentifizierung:</strong> Wenn Sie ein
              Konto erstellen, werden die für WebAuthn notwendigen kryptografischen Schlüsselpaare
              gespeichert. Es werden keine Passwörter verwendet oder gespeichert.
            </li>
            <li>
              <strong className="text-slate-300">Spielfortschritt:</strong> Abgeschlossene Level,
              Zugzahlen, Zeiten und erzielte Punkte werden gespeichert, um Ihren Fortschritt
              geräteübergreifend bereitzustellen.
            </li>
            <li>
              <strong className="text-slate-300">Cookies und lokaler Speicher:</strong> Die
              Anwendung nutzt localStorage zur Speicherung Ihrer Spieler-ID und Einstellungen.
              Es werden keine Tracking-Cookies oder Cookies von Drittanbietern eingesetzt.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Rechtsgrundlage</h2>
          <p>
            Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung — Bereitstellung des Spiels) und Art. 6 Abs. 1 lit. f DSGVO
            (berechtigtes Interesse — Betrieb und Sicherheit des Dienstes).
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Speicherdauer</h2>
          <p>
            Spielfortschrittsdaten werden so lange gespeichert, wie Ihr Konto besteht. Anonyme
            Kennungen ohne verknüpftes Konto werden nach 12 Monaten Inaktivität gelöscht.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Ihre Rechte</h2>
          <p>Sie haben nach der DSGVO folgende Rechte:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
          </ul>
          <p className="mt-2">
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die oben genannte E-Mail-Adresse.
            Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-semibold text-slate-200">Drittanbieter</h2>
          <p>
            Diese Anwendung lädt keine Ressourcen von Drittanbietern. Alle Schriftarten,
            Grafiken und Skripte werden vom eigenen Server bereitgestellt.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
