import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SiteFooter } from '../../components/home/SiteFooter';

// ─── Legal pages: Privacy Policy (Datenschutzerklärung) + Imprint (Impressum) ─
// Launch requirement (GDPR Art. 13 information duties + German Impressumspflicht).
// Structure and processing descriptions match the real system (RLS-guarded
// profiles, redaction pipeline, consent-gated AI). Company identity fields are
// [PLACEHOLDER]s — they MUST be filled and the final wording reviewed by legal
// counsel before the public launch.

const PLACEHOLDER = (label: string) => (
  <span className="rounded bg-warning-bg px-1.5 py-0.5 font-mono text-[0.85em] text-warning-700 ring-1 ring-inset ring-warning-500/30">
    [{label}]
  </span>
);

function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <main className="bg-surface">
        <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 md:px-6">
          <h1 className="font-serif text-4xl font-semibold text-fg">{title}</h1>
          <p className="mt-3 text-[13px] text-fg-tertiary">{updated}</p>
          <div className="mt-10 space-y-10">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold text-fg">{heading}</h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-fg-secondary">{children}</div>
    </section>
  );
}

function DraftBanner() {
  const { t } = useTranslation('legal');
  return (
    <div className="rounded-lg border border-warning-500/30 bg-warning-bg px-4 py-3 text-[13px] leading-relaxed text-warning-700">
      {t('draftBanner')}
    </div>
  );
}

// ─── Privacy Policy ───────────────────────────────────────────────────────────

export function PrivacyPage() {
  const { locale } = useParams();
  const { t } = useTranslation('legal');
  const de = locale === 'de';

  if (de) {
    return (
      <LegalShell title={t('privacy.title')} updated={t('privacy.updated')}>
        <DraftBanner />
        <Section heading={t('privacy.headings.controller')}>
          <p>
            {PLACEHOLDER('Firmenname')}, {PLACEHOLDER('Anschrift')}, {PLACEHOLDER('E-Mail Datenschutzkontakt')}.
            Verantwortlicher im Sinne der DSGVO für alle auf dieser Plattform beschriebenen Verarbeitungen.
          </p>
        </Section>
        <Section heading={t('privacy.headings.data')}>
          <p>
            <strong className="text-fg">Kontodaten:</strong> E-Mail-Adresse, Rolle (Nutzer/Provider), Länderkontext,
            Einwilligungs-Status. <strong className="text-fg">Anfragedaten:</strong> Ihre strukturierten Wizard-Antworten und
            Nachrichten an Provider. <strong className="text-fg">Dokumente:</strong> Von Ihnen hochgeladene Inhalte werden vor
            der Speicherung automatisiert um personenbezogene Angaben bereinigt (Redaktions-Pipeline); gespeichert wird nur die
            bereinigte Fassung samt Redaktionsbericht. <strong className="text-fg">Protokolldaten:</strong> Sicherheits- und
            Audit-Ereignisse (z.&nbsp;B. Anfrage erstellt, Provider bestätigt, Dokument hochgeladen).
          </p>
        </Section>
        <Section heading={t('privacy.headings.purposes')}>
          <p>
            Vertragserfüllung und Vermittlung an Verified Partner (Art. 6 Abs. 1 lit. b DSGVO) · KI-gestützte Analyse Ihrer
            Dokumente ausschließlich nach ausdrücklicher Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, jederzeit widerruflich) ·
            Sicherheits-Protokollierung und Missbrauchsabwehr (Art. 6 Abs. 1 lit. f DSGVO).
          </p>
        </Section>
        <Section heading={t('privacy.headings.ai')}>
          <p>
            KI-Funktionen verarbeiten niemals Rohdokumente. Vor jeder KI-Verarbeitung werden personenbezogene Angaben
            automatisiert entfernt oder maskiert. Zusätzlich ist jede KI-Verarbeitung technisch gesperrt, solange keine
            ausdrückliche Einwilligung für das jeweilige Dokument vorliegt und die Inhalte nicht als unbedenklich klassifiziert
            wurden. Als &bdquo;restricted&ldquo; klassifizierte Inhalte (z.&nbsp;B. Gesundheits- oder Finanzidentifikatoren)
            sind von KI-Verarbeitung ausgeschlossen.
          </p>
        </Section>
        <Section heading={t('privacy.headings.recipients')}>
          <p>
            Hosting: Hostinger ({PLACEHOLDER('Serverstandort, z. B. Deutschland')}) · Datenbank/Auth: Supabase (Region EU) ·
            KI-Dienste: Anthropic (nur bereinigte Inhalte, gemäß Abschnitt 4). Mit allen Dienstleistern bestehen
            Auftragsverarbeitungsverträge nach Art. 28 DSGVO. Verified Partner erhalten Ihre Anfragedaten nur, wenn Sie eine
            Anfrage an sie richten.
          </p>
        </Section>
        <Section heading={t('privacy.headings.retention')}>
          <p>
            Kontodaten bis zur Löschung des Kontos · Anfragedaten für die Dauer des Mandatsverhältnisses zzgl. gesetzlicher
            Aufbewahrungsfristen · Protokolldaten {PLACEHOLDER('Frist, z. B. 12 Monate')}. Details regelt unser Löschkonzept.
          </p>
        </Section>
        <Section heading={t('privacy.headings.rights')}>
          <p>
            Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18),
            Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO) sowie das Recht, erteilte Einwilligungen jederzeit
            mit Wirkung für die Zukunft zu widerrufen. Beschwerden richten Sie an die zuständige Aufsichtsbehörde:{' '}
            {PLACEHOLDER('zuständige Landesdatenschutzbehörde')}.
          </p>
        </Section>
        <Section heading={t('privacy.headings.contact')}>
          <p>Für Datenschutzanfragen: {PLACEHOLDER('datenschutz@… E-Mail-Adresse')}.</p>
        </Section>
      </LegalShell>
    );
  }

  return (
    <LegalShell title={t('privacy.title')} updated={t('privacy.updated')}>
      <DraftBanner />
      <Section heading={t('privacy.headings.controller')}>
        <p>
          {PLACEHOLDER('Company name')}, {PLACEHOLDER('Address')}, {PLACEHOLDER('Privacy contact e-mail')}. Controller within
          the meaning of the GDPR for all processing described on this platform.
        </p>
      </Section>
      <Section heading={t('privacy.headings.data')}>
        <p>
          <strong className="text-fg">Account data:</strong> e-mail address, role (user/provider), country context, consent
          status. <strong className="text-fg">Request data:</strong> your structured wizard answers and messages to providers.{' '}
          <strong className="text-fg">Documents:</strong> uploaded content is automatically stripped of personal identifiers
          before storage (redaction pipeline); only the sanitized version and its redaction report are stored.{' '}
          <strong className="text-fg">Log data:</strong> security and audit events (e.g. request created, provider confirmed,
          document uploaded).
        </p>
      </Section>
      <Section heading={t('privacy.headings.purposes')}>
        <p>
          Contract performance and matching with Verified Partners (Art. 6(1)(b) GDPR) · AI-assisted analysis of your documents
          only after explicit consent (Art. 6(1)(a) GDPR, revocable at any time) · security logging and abuse prevention
          (Art. 6(1)(f) GDPR).
        </p>
      </Section>
      <Section heading={t('privacy.headings.ai')}>
        <p>
          AI features never process raw documents. Personal identifiers are automatically removed or masked before any AI
          processing. In addition, AI processing is technically blocked unless explicit consent exists for the specific
          document and its content is classified as eligible. Content classified as &ldquo;restricted&rdquo; (e.g. health or
          financial identifiers) is excluded from AI processing.
        </p>
      </Section>
      <Section heading={t('privacy.headings.recipients')}>
        <p>
          Hosting: Hostinger ({PLACEHOLDER('server location, e.g. Germany')}) · Database/Auth: Supabase (EU region) · AI
          services: Anthropic (sanitized content only, per section 4). Data processing agreements under Art. 28 GDPR are in
          place with all providers. Verified Partners receive your request data only when you direct a request to them.
        </p>
      </Section>
      <Section heading={t('privacy.headings.retention')}>
        <p>
          Account data until account deletion · request data for the duration of the engagement plus statutory retention
          periods · log data {PLACEHOLDER('period, e.g. 12 months')}. Details are governed by our deletion policy.
        </p>
      </Section>
      <Section heading={t('privacy.headings.rights')}>
        <p>
          You have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), data
          portability (Art. 20) and objection (Art. 21 GDPR), and the right to withdraw any consent at any time with future
          effect. Complaints may be directed to the competent supervisory authority: {PLACEHOLDER('competent authority')}.
        </p>
      </Section>
      <Section heading={t('privacy.headings.contact')}>
        <p>For privacy inquiries: {PLACEHOLDER('privacy@… e-mail address')}.</p>
      </Section>
    </LegalShell>
  );
}

// ─── Imprint (Impressum) ──────────────────────────────────────────────────────

export function ImprintPage() {
  const { locale } = useParams();
  const { t } = useTranslation('legal');
  const de = locale === 'de';

  if (de) {
    return (
      <LegalShell title={t('imprint.title')} updated={t('imprint.updated')}>
        <DraftBanner />
        <Section heading={t('imprint.headings.provider')}>
          <p>
            {PLACEHOLDER('Firmenname + Rechtsform')}
            <br />
            {PLACEHOLDER('Straße, Hausnummer')}
            <br />
            {PLACEHOLDER('PLZ, Ort')}
          </p>
        </Section>
        <Section heading={t('imprint.headings.representedBy')}>
          <p>{PLACEHOLDER('Geschäftsführer:in')}</p>
        </Section>
        <Section heading={t('imprint.headings.contact')}>
          <p>
            E-Mail: {PLACEHOLDER('kontakt@…')} · Telefon: {PLACEHOLDER('Telefonnummer')}
          </p>
        </Section>
        <Section heading={t('imprint.headings.register')}>
          <p>
            {PLACEHOLDER('Registergericht')} · {PLACEHOLDER('HRB-Nummer')} · USt-IdNr.: {PLACEHOLDER('DE…')}
          </p>
        </Section>
        <Section heading={t('imprint.headings.responsible')}>
          <p>{PLACEHOLDER('Name, Anschrift')}</p>
        </Section>
        <Section heading={t('imprint.headings.dispute')}>
          <p>
            Plattform der EU-Kommission zur Online-Streitbeilegung:{' '}
            <a href="https://ec.europa.eu/consumers/odr/" className="text-fg-brand underline" target="_blank" rel="noreferrer">
              ec.europa.eu/consumers/odr
            </a>
            . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </Section>
        <Section heading={t('imprint.headings.notice')}>
          <p>
            CompliHub360 ist eine Orchestrierungsplattform — keine Kanzlei. Rechts-, Steuer- und Regulierungsberatung erbringen
            Verified Partner in eigener beruflicher Verantwortung. Wir erbringen keine Rechtsberatung im Sinne von RDG/StBerG.
          </p>
        </Section>
      </LegalShell>
    );
  }

  return (
    <LegalShell title={t('imprint.title')} updated={t('imprint.updated')}>
      <DraftBanner />
      <Section heading={t('imprint.headings.provider')}>
        <p>
          {PLACEHOLDER('Company name + legal form')}
          <br />
          {PLACEHOLDER('Street, number')}
          <br />
          {PLACEHOLDER('Postal code, city')}
        </p>
      </Section>
      <Section heading={t('imprint.headings.representedBy')}>
        <p>{PLACEHOLDER('Managing director')}</p>
      </Section>
      <Section heading={t('imprint.headings.contact')}>
        <p>
          E-mail: {PLACEHOLDER('contact@…')} · Phone: {PLACEHOLDER('phone number')}
        </p>
      </Section>
      <Section heading={t('imprint.headings.register')}>
        <p>
          {PLACEHOLDER('Register court')} · {PLACEHOLDER('HRB number')} · VAT ID: {PLACEHOLDER('DE…')}
        </p>
      </Section>
      <Section heading={t('imprint.headings.dispute')}>
        <p>
          EU Commission platform for online dispute resolution:{' '}
          <a href="https://ec.europa.eu/consumers/odr/" className="text-fg-brand underline" target="_blank" rel="noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          . We are neither obliged nor willing to participate in dispute resolution proceedings before a consumer arbitration
          board.
        </p>
      </Section>
      <Section heading={t('imprint.headings.notice')}>
        <p>
          CompliHub360 is an orchestration platform — not a law firm. Legal, tax, and regulatory advice is delivered by
          Verified Partners under their own professional liability.
        </p>
      </Section>
    </LegalShell>
  );
}

// ─── Terms of Service ─────────────────────────────────────────────────────────
// SCAFFOLD. Sections 2, 3, 4 and 7 describe the system as it actually behaves
// (orchestration not advice, Verified Partners carry their own professional
// liability, SLA windows) and can stand. Everything that is contract substance —
// entity, fees, liability caps, term, governing law — is a [PLACEHOLDER] and MUST
// be drafted by legal counsel. The entity is US-incorporated while customers are
// EU B2B, so venue and consumer-law carve-outs are not a formality.

export function TermsPage() {
  const { locale } = useParams();
  const { t } = useTranslation('legal');
  const de = locale === 'de';

  if (de) {
    return (
      <LegalShell title={t('terms.title')} updated={t('terms.updated')}>
        <DraftBanner />
        <Section heading={t('terms.headings.scope')}>
          <p>
            Diese Bedingungen gelten zwischen {PLACEHOLDER('Firmenname + Rechtsform')} (&bdquo;CompliHub360&ldquo;) und
            Unternehmen, die die Plattform nutzen. Das Angebot richtet sich ausschließlich an Unternehmer im Sinne des
            § 14 BGB, nicht an Verbraucher. {PLACEHOLDER('Abgrenzung zu abweichenden AGB der Kundenseite')}
          </p>
        </Section>
        <Section heading={t('terms.headings.service')}>
          <p>
            CompliHub360 strukturiert Ihren Geschäftskontext über einen adaptiven Assistenten, berechnet daraus ein
            Risikoprofil auf Basis hinterlegter Quellen und vermittelt Ihnen passende Verified Partner. Gegenstand der
            Leistung ist die Orchestrierung: Strukturierung, Risikodarstellung, Vermittlung und Nachverfolgung der
            Anfrage. Die fachliche Beratung selbst ist nicht Gegenstand dieses Vertrags.
          </p>
        </Section>
        <Section heading={t('terms.headings.noAdvice')}>
          <p>
            CompliHub360 ist keine Kanzlei und keine Steuerberatungsgesellschaft. Wir erbringen keine Rechtsberatung im
            Sinne des RDG und keine Steuerberatung im Sinne des StBerG. Risikodarstellungen und Checklisten sind
            Orientierung, keine verbindliche Auskunft und kein Ersatz für eine Prüfung des Einzelfalls.
          </p>
        </Section>
        <Section heading={t('terms.headings.partners')}>
          <p>
            Verified Partner erbringen ihre Leistungen im eigenen Namen, auf eigene Rechnung und in eigener beruflicher
            Verantwortung. Der Beratungsvertrag kommt unmittelbar zwischen Ihnen und dem Partner zustande; CompliHub360
            ist daran nicht beteiligt und haftet nicht für dessen Leistung.{' '}
            {PLACEHOLDER('Prüf- und Aufnahmekriterien für Partner, Folgen bei Ausschluss')}
          </p>
        </Section>
        <Section heading={t('terms.headings.account')}>
          <p>{PLACEHOLDER('Registrierung, Zugangsdaten, Sperrung, Mindestalter/Vertretungsbefugnis')}</p>
        </Section>
        <Section heading={t('terms.headings.fees')}>
          <p>
            {PLACEHOLDER('Preismodell, Abrechnungszeitraum, Fälligkeit, Verzug, Steuern/Reverse-Charge, Erstattungen')}
          </p>
        </Section>
        <Section heading={t('terms.headings.sla')}>
          <p>
            Für vermittelte Anfragen überwacht die Plattform Bestätigungs- und Antwortfristen der Partner und meldet
            Überschreitungen. Die Fristen selbst sowie die Rechtsfolgen einer Überschreitung sind noch festzulegen:{' '}
            {PLACEHOLDER('Fristen, Rechtsfolgen bei Überschreitung')}
          </p>
        </Section>
        <Section heading={t('terms.headings.obligations')}>
          <p>{PLACEHOLDER('Richtigkeit der Angaben, zulässige Nutzung, Rechte an hochgeladenen Inhalten')}</p>
        </Section>
        <Section heading={t('terms.headings.liability')}>
          <p>{PLACEHOLDER('Haftungsmaßstab, Haftungshöchstgrenze, Ausschlüsse, zwingende Haftung')}</p>
        </Section>
        <Section heading={t('terms.headings.term')}>
          <p>{PLACEHOLDER('Laufzeit, Verlängerung, ordentliche und außerordentliche Kündigung, Datenexport nach Ende')}</p>
        </Section>
        <Section heading={t('terms.headings.changes')}>
          <p>{PLACEHOLDER('Änderungsvorbehalt, Ankündigungsfrist, Widerspruchsrecht')}</p>
        </Section>
        <Section heading={t('terms.headings.law')}>
          <p>
            {PLACEHOLDER('Anwendbares Recht und Gerichtsstand — beachten: Gesellschaft in den USA registriert, Kunden in der EU')}
          </p>
        </Section>
      </LegalShell>
    );
  }

  return (
    <LegalShell title={t('terms.title')} updated={t('terms.updated')}>
      <DraftBanner />
      <Section heading={t('terms.headings.scope')}>
        <p>
          These terms govern the relationship between {PLACEHOLDER('company name + legal form')} (&ldquo;CompliHub360&rdquo;)
          and businesses using the platform. The service is offered to businesses only, not to consumers.{' '}
          {PLACEHOLDER('treatment of conflicting customer terms')}
        </p>
      </Section>
      <Section heading={t('terms.headings.service')}>
        <p>
          CompliHub360 structures your business context through an adaptive wizard, derives a risk profile from validated
          sources, and matches you with suitable Verified Partners. What we owe is the orchestration: structuring, risk
          presentation, matching, and tracking of the request. The professional advice itself is not part of this contract.
        </p>
      </Section>
      <Section heading={t('terms.headings.noAdvice')}>
        <p>
          CompliHub360 is not a law firm and not a tax advisory firm. Risk presentations and checklists are orientation, not
          binding advice, and no substitute for an assessment of your specific case.
        </p>
      </Section>
      <Section heading={t('terms.headings.partners')}>
        <p>
          Verified Partners act in their own name, for their own account, and under their own professional liability. The
          advisory contract is concluded directly between you and the partner; CompliHub360 is not a party to it and is not
          liable for the partner&apos;s performance. {PLACEHOLDER('vetting criteria, consequences of removal')}
        </p>
      </Section>
      <Section heading={t('terms.headings.account')}>
        <p>{PLACEHOLDER('registration, credentials, suspension, authority to bind the company')}</p>
      </Section>
      <Section heading={t('terms.headings.fees')}>
        <p>{PLACEHOLDER('pricing model, billing period, due dates, late payment, taxes/reverse charge, refunds')}</p>
      </Section>
      <Section heading={t('terms.headings.sla')}>
        <p>
          For matched requests, the platform monitors partner confirmation and response windows and flags breaches. The
          windows themselves and the consequences of a breach are still to be set:{' '}
          {PLACEHOLDER('response windows, consequences of breach')}
        </p>
      </Section>
      <Section heading={t('terms.headings.obligations')}>
        <p>{PLACEHOLDER('accuracy of input, acceptable use, rights in uploaded content')}</p>
      </Section>
      <Section heading={t('terms.headings.liability')}>
        <p>{PLACEHOLDER('standard of liability, cap, exclusions, mandatory liability')}</p>
      </Section>
      <Section heading={t('terms.headings.term')}>
        <p>{PLACEHOLDER('term, renewal, termination for convenience and for cause, data export on exit')}</p>
      </Section>
      <Section heading={t('terms.headings.changes')}>
        <p>{PLACEHOLDER('right to amend, notice period, right to object')}</p>
      </Section>
      <Section heading={t('terms.headings.law')}>
        <p>
          {PLACEHOLDER('governing law and venue — note: company incorporated in the US, customers in the EU')}
        </p>
      </Section>
    </LegalShell>
  );
}

// ─── Cookie & Storage Policy ──────────────────────────────────────────────────
// Unlike the other three, this page is substantive rather than a scaffold: it
// describes verifiable behaviour. The app sets no cookies at all (no
// document.cookie anywhere); it only writes localStorage/sessionStorage. The
// key list below was taken from the code and must be kept in step with it —
// grep for localStorage./sessionStorage. before editing. The one genuinely
// legal call, whether each entry is "strictly necessary" under §25 TDDDG /
// ePrivacy or needs consent, is left to counsel.

const STORAGE_KEYS: { name: string; scope: 'local' | 'session'; en: string; de: string }[] = [
  { name: 'ch360_last_profile', scope: 'local',
    en: 'Your most recent wizard answers, so the risk map can be restored when you come back.',
    de: 'Ihre zuletzt im Assistenten gemachten Angaben, damit die Risk Map beim Wiederkommen erhalten bleibt.' },
  { name: 'ch360_guest_key', scope: 'local',
    en: 'A random identifier that lets sessions be saved before you register. Not linked to a name or e-mail.',
    de: 'Eine Zufallskennung, mit der Sitzungen schon vor der Registrierung gespeichert werden. Ohne Bezug zu Name oder E-Mail.' },
  { name: 'ch360_last_session_id', scope: 'local',
    en: 'Points to the session you last saved, so it can be reopened.',
    de: 'Verweist auf die zuletzt gespeicherte Sitzung, damit sie wieder geöffnet werden kann.' },
  { name: 'ch360_adopted_for', scope: 'local',
    en: 'Records that a guest session has already been transferred to your account, to avoid doing it twice.',
    de: 'Hält fest, dass eine Gast-Sitzung bereits Ihrem Konto zugeordnet wurde, damit das nicht doppelt geschieht.' },
  { name: 'ch360-theme', scope: 'local',
    en: 'Your light/dark mode choice.',
    de: 'Ihre Auswahl zwischen hellem und dunklem Erscheinungsbild.' },
  { name: 'i18nextLng', scope: 'local',
    en: 'Your language choice, so it survives a page reload.',
    de: 'Ihre Sprachwahl, damit sie einen Seitenwechsel übersteht.' },
  { name: 'ch360_assistant', scope: 'local',
    en: 'Switch for the VAT assistant, set only if you open a link carrying that parameter.',
    de: 'Schalter für den USt-Assistenten, wird nur gesetzt, wenn Sie einen Link mit diesem Parameter öffnen.' },
  { name: 'complihub360.compliance.country', scope: 'session',
    en: 'The country you selected on the compliance areas page. Cleared when you close the tab.',
    de: 'Das auf der Seite „Compliance-Bereiche" gewählte Land. Wird beim Schließen des Tabs verworfen.' },
  { name: 'demo_is_logged_in, demo_user_role, demo_user_name', scope: 'local',
    en: 'Demo login state. Only written in demo mode, never in the production build.',
    de: 'Zustand des Demo-Logins. Wird nur im Demo-Modus geschrieben, nie im Produktivstand.' },
];

function StorageTable({ de }: { de: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-stroke-subtle text-fg-tertiary">
            <th className="py-2 pr-4 font-medium">{de ? 'Schlüssel' : 'Key'}</th>
            <th className="py-2 pr-4 font-medium">{de ? 'Ablage' : 'Storage'}</th>
            <th className="py-2 font-medium">{de ? 'Zweck' : 'Purpose'}</th>
          </tr>
        </thead>
        <tbody>
          {STORAGE_KEYS.map((k) => (
            <tr key={k.name} className="border-b border-stroke-subtle/60 align-top">
              <td className="py-2.5 pr-4 font-mono text-[12px] text-fg">{k.name}</td>
              <td className="py-2.5 pr-4 whitespace-nowrap text-fg-tertiary">
                {k.scope === 'local' ? 'localStorage' : 'sessionStorage'}
              </td>
              <td className="py-2.5 text-fg-secondary">{de ? k.de : k.en}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CookiePage() {
  const { locale } = useParams();
  const { t } = useTranslation('legal');
  const de = locale === 'de';

  if (de) {
    return (
      <LegalShell title={t('cookies.title')} updated={t('cookies.updated')}>
        <DraftBanner />
        <Section heading={t('cookies.headings.summary')}>
          <p>
            Diese Website setzt <strong className="text-fg">keine Cookies</strong> — weder eigene noch solche Dritter, weder
            zur Analyse noch zur Werbung. Es gibt daher auch kein Cookie-Banner. Gespeichert wird ausschließlich im lokalen
            Speicher Ihres Browsers, und zwar nur, was die Anwendung zum Funktionieren braucht.
          </p>
        </Section>
        <Section heading={t('cookies.headings.noCookies')}>
          <p>
            Wir binden kein Tracking, keine Werbenetzwerke und keine Analyse-Dienste ein, die Cookies setzen würden. Ihr
            Verhalten auf der Seite wird nicht über Sitzungen oder Websites hinweg verfolgt.
          </p>
        </Section>
        <Section heading={t('cookies.headings.storage')}>
          <p>
            Die folgenden Einträge legt die Anwendung in Ihrem Browser ab. Sie verbleiben auf Ihrem Gerät und werden nicht
            als solche an uns übertragen:
          </p>
          <StorageTable de />
        </Section>
        <Section heading={t('cookies.headings.purposes')}>
          <p>
            Alle Einträge dienen dem Betrieb: Sie erhalten Ihre Eingaben über einen Seitenwechsel hinweg, merken sich Ihre
            Sprach- und Darstellungswahl und ermöglichen es, eine Sitzung schon vor der Registrierung zu speichern. Kein
            Eintrag dient der Reichweitenmessung, der Profilbildung oder der Werbung.
          </p>
        </Section>
        <Section heading={t('cookies.headings.consent')}>
          <p>
            Die Speicherung auf Ihrem Endgerät richtet sich nach § 25 TDDDG. Welche der oben genannten Einträge als
            unbedingt erforderlich einzustufen sind und für welche gegebenenfalls eine Einwilligung einzuholen ist, ist
            rechtlich zu bewerten: {PLACEHOLDER('Einstufung je Eintrag durch Rechtsberatung')}
          </p>
        </Section>
        <Section heading={t('cookies.headings.manage')}>
          <p>
            Sie können diese Daten jederzeit selbst entfernen, indem Sie in Ihrem Browser die Website-Daten für diese Domain
            löschen (in den meisten Browsern unter Einstellungen &rsaquo; Datenschutz &rsaquo; Website-Daten). Danach
            starten Sie ohne gespeicherte Angaben, gespeicherte Sitzungen sind über Ihr Konto weiterhin erreichbar. Der
            Eintrag mit sessionStorage verschwindet ohnehin, sobald Sie den Tab schließen.
          </p>
        </Section>
        <Section heading={t('cookies.headings.thirdParty')}>
          <p>
            Eingebundene Inhalte Dritter können eigene Speichermechanismen mitbringen. Derzeit betrifft das:{' '}
            {PLACEHOLDER('eingebundene Drittinhalte prüfen und auflisten, z. B. Schriftarten, Karten, Videos')}
          </p>
        </Section>
        <Section heading={t('cookies.headings.contact')}>
          <p>Fragen zu dieser Seite beantworten wir unter {PLACEHOLDER('datenschutz@… E-Mail-Adresse')}.</p>
        </Section>
      </LegalShell>
    );
  }

  return (
    <LegalShell title={t('cookies.title')} updated={t('cookies.updated')}>
      <DraftBanner />
      <Section heading={t('cookies.headings.summary')}>
        <p>
          This site sets <strong className="text-fg">no cookies</strong> — none of our own, none from third parties, none for
          analytics or advertising. That is also why you see no cookie banner. The only thing we write is your browser&apos;s
          local storage, and only what the application needs in order to work.
        </p>
      </Section>
      <Section heading={t('cookies.headings.noCookies')}>
        <p>
          We embed no tracking, no ad networks, and no analytics services that would set cookies. Your behaviour is not
          followed across sessions or across sites.
        </p>
      </Section>
      <Section heading={t('cookies.headings.storage')}>
        <p>
          The application stores the following entries in your browser. They stay on your device and are not transmitted to
          us as such:
        </p>
        <StorageTable de={false} />
      </Section>
      <Section heading={t('cookies.headings.purposes')}>
        <p>
          Every entry serves operation: keeping your input across a page change, remembering your language and appearance
          choice, and letting a session be saved before you register. None of them is used for audience measurement,
          profiling, or advertising.
        </p>
      </Section>
      <Section heading={t('cookies.headings.consent')}>
        <p>
          Storing information on your device is governed by §&nbsp;25 TDDDG (implementing the ePrivacy Directive). Which of
          the entries above count as strictly necessary, and which may require consent, is a legal assessment:{' '}
          {PLACEHOLDER('per-entry classification by legal counsel')}
        </p>
      </Section>
      <Section heading={t('cookies.headings.manage')}>
        <p>
          You can remove this data yourself at any time by clearing the site data for this domain in your browser (in most
          browsers under Settings &rsaquo; Privacy &rsaquo; Site data). You will then start with nothing stored; sessions you
          saved remain reachable through your account. The sessionStorage entry disappears as soon as you close the tab.
        </p>
      </Section>
      <Section heading={t('cookies.headings.thirdParty')}>
        <p>
          Embedded third-party content can bring its own storage. Currently this concerns:{' '}
          {PLACEHOLDER('review and list embedded third-party content, e.g. fonts, maps, video')}
        </p>
      </Section>
      <Section heading={t('cookies.headings.contact')}>
        <p>Questions about this page: {PLACEHOLDER('privacy@… e-mail address')}.</p>
      </Section>
    </LegalShell>
  );
}
