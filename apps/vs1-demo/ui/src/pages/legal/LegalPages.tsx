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
