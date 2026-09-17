import type { Plugin } from 'vite';

// ─── Mock-API für den lokalen Dev-Server ─────────────────────────────────────
// `VITE_MOCK_API=1 npm run dev` (Repo-Root: `npm run dev:ui:mock`): jede
// Anfrage an /api/v1/* wird hier aus einem eingebauten Datensatz beantwortet
// statt an die compliance-api weitergereicht. Zweck: die gefuellten Screens
// des Arbeitsbereichs ohne Backend, Supabase und Seed durchklicken koennen —
// und zwar im WORST CASE (viele Termine in allen Zustaenden, Anfragen in allen
// acht Formen, ueberlange Namen).
//
// Nur `vite dev`, nie im Build. Schreibende Aufrufe antworten mit ok:true,
// aendern aber nichts — der Datensatz wird bei jedem Aufruf frisch relativ zu
// "jetzt" berechnet, damit Fristen und Datumsmarken realistisch bleiben.
//
// POST /search antwortet mit einem festen Satz Anbieter und Pflichten im
// Drahtformat der Engine (SearchLaw / AnonProvider), damit die Sitzungsseite
// mit Aufgaben-Chips, Fortschritt und Anbieter-Spalte prueferbar ist. Die
// Engine selbst laeuft serverseitig und wird hier nicht nachgebaut.

const H = 3_600_000;
const iso = (days: number, hour = 10, minute = 0) => {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, minute, 0, 0); return d.toISOString();
};
const plus = (ms: number) => new Date(Date.now() + ms).toISOString();
const uuid = (n: number, block = 2) => `5eed000${block}-0000-4000-8000-${String(n).padStart(12, '0')}`;

const USER_ID = 'fa49d5ab-4dc9-4bb4-a84d-fe624e2eea2e';

function bookings() {
  const b = (id: string, key: string, name: string, region: string, web: string | null, start: string, end: string, status: string) =>
    ({ id, provider_key: key, provider_name: name, provider_region: region, provider_website: web, slot_start: start, slot_end: end, status, message: null });
  return [
    b('m0ck-b01', 'studio-bianchi', 'Studio Bianchi & Partner Commercialisti Associati S.r.l.', 'Norditalien', 'https://example.org', iso(0, 16), iso(0, 16, 30), 'confirmed'),
    b('m0ck-b02', 'schmidt-partner', 'Schmidt & Partner Steuerberatungsgesellschaft mbH', 'Norddeutschland', 'https://example.org', iso(1, 9), iso(1, 9, 30), 'confirmed'),
    // Bewusst NICHT 'madrid-tax': von den drei Anbietern, die die Suche zeigt,
    // soll einer ohne Termin bleiben. Sonst trugen im Mock alle drei Karten den
    // Klarnamen und der Normalfall — Pseudonym, „Details ansehen" — war nicht
    // mehr zu sehen.
    b('m0ck-b03', 'lucid-reg', 'LUCID Registrierungsdienst Hamburg', 'Hamburg', null, iso(4, 11), iso(4, 11, 30), 'confirmed'),
    b('m0ck-b04', 'dahlmann-cpa', 'Dahlmann CPA', 'USA', null, iso(6, 15), iso(6, 15, 30), 'confirmed'),
    b('m0ck-b05', 'paris-legal', 'Cabinet Durand & Associés — Droit des affaires', 'Île-de-France', null, iso(12, 10), iso(12, 10, 30), 'confirmed'),
    b('m0ck-b06', 'ams-privacy', 'Amsterdam Privacy Partners', 'Niederlande', null, iso(19, 13), iso(19, 13, 30), 'confirmed'),
    b('m0ck-b07', 'lucid-reg', 'LUCID Registrierungsdienst Hamburg', 'Hamburg', null, iso(-1, 14), iso(-1, 14, 30), 'confirmed'),
    b('m0ck-b08', 'oss-experts', 'OSS Experts GmbH', 'Berlin', null, iso(-2, 10), iso(-2, 10, 30), 'confirmed'),
    b('m0ck-b09', 'oss-experts', 'OSS Experts GmbH', 'Berlin', null, iso(-8, 9), iso(-8, 9, 30), 'completed'),
    b('m0ck-b10', 'dahlmann-cpa', 'Dahlmann CPA', 'USA', null, iso(-17, 16), iso(-17, 16, 30), 'cancelled'),
    b('m0ck-b11', 'ams-privacy', 'Amsterdam Privacy Partners', 'Niederlande', null, iso(-21, 11), iso(-21, 11, 30), 'no_show'),
    b('m0ck-b12', 'schmidt-partner', 'Schmidt & Partner Steuerberatungsgesellschaft mbH', 'Norddeutschland', null, iso(-30, 15), iso(-30, 15, 30), 'completed'),
    b('m0ck-b13', 'paris-legal', 'Cabinet Durand & Associés', 'Paris', null, iso(-45, 10), iso(-45, 10, 30), 'completed'),
  ];
}

function requests() {
  const r = (n: number, over: Record<string, unknown>) => ({
    id: uuid(n), user_id: USER_ID, provider_key: 'studio-bianchi', country: 'IT', category: 'tax-vat', created_at: iso(-1),
    message: 'Wir expandieren nach Italien und brauchen eine USt-Registrierung inkl. Fiskalvertretung.',
    structured_answers: { company: 'Acme GmbH' }, ...over,
  });
  return [
    r(1, { status: 'replied', created_at: iso(-3), provider_key: 'schmidt-partner', country: 'DE', category: 'product-packaging' }),
    r(2, { status: 'replied', created_at: iso(0, 7), provider_key: 'dahlmann-cpa', country: 'US', category: 'corporate-structure' }),
    r(3, { status: 'expired', created_at: iso(-2), sla_confirm_deadline: plus(-26 * H) }),
    r(4, { status: 'confirmed', created_at: iso(-4), sla_reply_deadline: plus(-5 * H), provider_key: 'madrid-tax', country: 'ES' }),
    r(5, { status: 'created', created_at: iso(0, 9), sla_confirm_deadline: plus(22 * H), provider_key: 'dahlmann-cpa', country: 'US', category: 'corporate-structure' }),
    r(6, { status: 'delivered', created_at: iso(-1, 20), sla_confirm_deadline: plus(2.5 * H), provider_key: 'schmidt-partner', country: 'DE', category: 'data-privacy' }),
    r(7, { status: 'viewed', created_at: iso(-1, 22), sla_confirm_deadline: plus(-1 * H), provider_key: 'madrid-tax', country: 'ES', category: 'marketing-seo' }),
    r(8, { status: 'confirmed', created_at: iso(-1), sla_reply_deadline: plus(31 * H) }),
    r(9, { status: 'confirmed', created_at: iso(-1, 12), sla_reply_deadline: plus(0.4 * H), provider_key: 'dahlmann-cpa', country: 'US', category: 'logistics-customs' }),
    r(10, { status: 'declined', created_at: iso(-5), provider_key: 'madrid-tax', country: 'ES' }),
    r(11, { status: 'withdrawn', created_at: iso(-9), provider_key: 'madrid-tax', country: 'ES' }),
    r(12, { status: 'declined', created_at: iso(-12), provider_key: 'schmidt-partner', country: 'DE', category: 'legal-advisory' }),
    r(13, { status: 'withdrawn', created_at: iso(-40), provider_key: 'dahlmann-cpa', country: 'US', category: 'product-compliance' }),
  ];
}

// Veraenderlich: Duplikate, Umbenennen und Archivieren wirken fuer die
// Laufzeit des Dev-Servers — sonst sieht man eine angelegte Kopie nie.
const SESSIONS: Array<Record<string, any>> = [
  { id: uuid(1, 1), label: 'EU-Expansion Shop', country: 'DE', markets: ['DE', 'IT', 'ES'], categories: ['tax-vat', 'product-packaging', 'data-privacy'], answers: { country: 'DE', markets: ['DE', 'IT', 'ES'], categories: ['tax-vat', 'product-packaging', 'data-privacy'], businessType: 'ecommerce', businessTypeNote: 'D2C e-commerce', marketScope: 'eu' }, status: 'active', risk_summary: { level: 'high' }, created_at: iso(-20), updated_at: iso(-2), open: 13, total: 14, severity: 'critical' },
  { id: uuid(2, 1), label: 'UK nach Brexit', country: 'UK', markets: ['UK'], categories: ['tax-vat'], status: 'active', risk_summary: { level: 'high' }, created_at: iso(-9), updated_at: iso(-9), open: 6, total: 8, severity: 'high' },
  { id: uuid(3, 1), label: null, country: 'ES', markets: ['ES'], categories: ['marketing-seo', 'legal-advisory'], status: 'active', risk_summary: { level: 'low' }, created_at: iso(-120), updated_at: iso(-100), open: 7, total: 9, severity: 'low' },
  { id: uuid(4, 1), label: 'Archiv: Testlauf 2025', country: 'DE', markets: ['DE'], categories: ['tax-vat'], status: 'archived', risk_summary: { level: 'low' }, created_at: iso(-200), updated_at: iso(-190), open: 0, total: 5, severity: null },
];

// Pflichten der Sitzung "EU-Expansion Shop" — Titel auf Deutsch, weil das
// hier Pruefdaten sind (die echte Engine liefert englische Titel). Die IDs
// tax-vat-registration / prod-epr / data-privacy passen zu obligations().
const LAWS = [
  { id: 'tax-vat-registration', title: 'OSS-Quartalsmeldung', description: '', domain: 'tax-vat', severity: 'critical', markets: ['DE', 'NL'], source: 'UStG §18i (OSS)', penalty: '5.000 € + 1 %/Monat', due: '30. Apr', due_days: 6, state: 'confirmed' },
  { id: 'tax-vat-uk', title: 'USt-Registrierung — UK', description: '', domain: 'tax-vat', severity: 'critical', markets: ['UK'], source: 'UK VATA 1994 §3', penalty: 'bis 20.000 £', due: '15. Mai', due_days: 21, state: 'likely' },
  { id: 'prod-epr', title: 'EPR-Verpackungsregistrierung (LUCID)', description: '', domain: 'product-packaging', severity: 'critical', markets: ['DE'], source: 'VerpackG Art. 9 Abs. 1', penalty: 'bis 50.000 €', due: '02. Mai', due_days: 8, state: 'likely' },
  { id: 'prod-epr-uk', title: 'EPR-Registrierungserneuerung (PackUK)', description: '', domain: 'product-packaging', severity: 'high', markets: ['UK'], source: 'UK Packaging Regs. 2023 §7', penalty: '4 % des UK-Umsatzes', due: '15. Mai', due_days: 21, state: 'likely' },
  { id: 'mktg-consent', title: 'Cookie-Banner + Einwilligungsnachweise', description: '', domain: 'data-privacy', severity: 'high', markets: [], source: 'DSGVO Art. 6/7 · TTDSG §25', celex: '32016R0679', source_url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj', penalty: null, due: 'Ongoing', due_days: null, state: 'confirmed' },
  { id: 'data-privacy', title: 'DSFA für Tracking-Pixel', description: '', domain: 'data-privacy', severity: 'medium', markets: [], source: 'DSGVO Art. 35', celex: '32016R0679', source_url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj', penalty: null, due: null, due_days: null, state: 'likely' },
  { id: 'tax-reverse-charge', title: 'Reverse-Charge-Verfahren', description: '', domain: 'tax-vat', severity: 'medium', markets: ['DE', 'NL'], source: 'UStG §13b', penalty: null, due: null, due_days: null, state: 'likely' },
  { id: 'corp-registration', title: 'Transparenzregister aktualisieren', description: '', domain: 'legal-advisory', severity: 'medium', markets: ['DE'], source: 'GwG §20 Abs. 1', penalty: '1.000–5.000 €', due: '30. Jun', due_days: 67, state: 'confirmed' },
  { id: 'mktg-claims', title: 'Werbeaussagen und Preisangaben prüfen', description: '', domain: 'marketing-seo', severity: 'medium', markets: ['ES'], source: 'Ley 3/1991 (LCD) · PAngV', penalty: 'bis 30.000 €', due: 'laufend', due_days: null, state: 'likely' },
  { id: 'tax-ioss', title: 'IOSS für Importe unter 150 €', description: '', domain: 'tax-vat', severity: 'medium', markets: [], source: 'MwStSystRL Art. 369l', penalty: 'Einfuhr-USt + Säumnis', due: 'laufend', due_days: null, state: 'likely' },
];

// Bereichs-Querschnitt (Canvas "Bereichsseite" 2026-09-13): je aktiver Sitzung
// die Pflichten EINES Bereichs, Stand aus obligations(). Leere Marktliste =
// EU-weit. Die UK-Sitzung traegt ihre UK-Pflichten, die EU-Sitzung die EU.
function domainOverview(slug: string) {
  const RANG: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  const sessions = SESSIONS.filter((s) => s.status === 'active' && (s.categories as string[]).includes(slug)).map((s) => {
    const markets = [s.country, ...(s.markets as string[])].filter(Boolean) as string[];
    const stand = new Map(obligations(s.id).items.map((i) => [i.obligation_id, i.status]));
    const rows = LAWS.filter((l) => l.domain === slug && (l.markets.length === 0 || l.markets.some((m) => markets.includes(m))))
      .map((l) => ({ id: l.id, label: l.title, severity: l.severity, markets: l.markets.filter((m) => markets.includes(m)), source: l.source, sourceUrl: (l as Record<string, unknown>).source_url ?? null, penalty: l.penalty, due: l.due, dueDays: l.due_days, status: stand.get(l.id) ?? 'open' }))
      .sort((a, b) => RANG[b.severity] - RANG[a.severity] || (a.dueDays ?? 9999) - (b.dueDays ?? 9999));
    return { id: s.id, label: s.label, country: s.country, markets: s.markets, categories: s.categories, updated_at: s.updated_at, obligations: rows };
  });
  const offen = sessions.flatMap((s) => s.obligations.filter((o) => o.status === 'open' || o.status === 'in_progress'));
  const faellig = offen.map((o) => o.dueDays).filter((d): d is number => typeof d === 'number');
  return {
    ok: true, slug, sessions,
    archived: SESSIONS.filter((s) => s.status === 'archived' && (s.categories as string[]).includes(slug)).length,
    markets: [...new Set(sessions.flatMap((s) => [s.country, ...(s.markets as string[])].filter(Boolean)))],
    open: offen.length, high: offen.filter((o) => o.severity === 'high' || o.severity === 'critical').length,
    next_due_days: faellig.length ? Math.min(...faellig) : null,
  };
}

// Assistent im Mock: eine feste Antwort mit Bezug auf Bereich und Sitzung,
// damit das Frage-Band prueferbar ist, ohne Gemini und ohne Korpus.
function assistantChat(body: Record<string, unknown>) {
  const domain = typeof body.domain === 'string' ? body.domain : null;
  const frage = String(body.message ?? '');
  const answer = domain
    ? `OSS deckt Fernverkäufe an Verbraucher ab, nicht aber Lagerhaltung oder lokale Lieferungen im Zielland. In Ihrer Sitzung EU-Expansion Shop ist Italien als Markt hinterlegt — dafür bleibt die italienische USt-Registrierung offen (Frist: vor dem ersten Verkauf).\n\n- Fiskalvertreter: für EU-Unternehmen nicht Pflicht, aber üblich\n- OSS-Quartalsmeldung: seit 3 Tagen in Arbeit, Frist in 6 Tagen\n\nIhre Frage war: „${frage.slice(0, 80)}“`
    : `Mock-Antwort ohne Bereichskontext auf: „${frage.slice(0, 80)}“`;
  return { ok: true, answer, sources: [
    ...(domain ? [{ label: `CompliHub area knowledge · ${domain}`, kind: 'area', name: domain }, { label: 'Your session · EU-Expansion Shop', kind: 'session', name: 'EU-Expansion Shop' }] : []),
    { label: 'CompliHub knowledge base · DE facts' },
  ] };
}

// Die drei passenden Anbieter, Score-Aufschluesselung wie im Backend:
// 60 * Marktabdeckung + 40 * (getroffene / angefragte Bereiche).
// Welche Bereiche ein Anbieter wirklich abdeckt. Die Match-Basis wird daraus
// GEGEN DIE ANFRAGE gerechnet — vorher stand in `domains_requested` eine feste
// Dreierliste, egal wonach gesucht wurde. Dadurch behauptete die Partnerseite
// „1 von 3 Bereichen", wo der Nutzer genau einen Bereich offen hatte.
const COVERS: Record<string, string[]> = {
  'studio-bianchi': ['tax-vat', 'product-packaging', 'data-privacy'],
  'schmidt-partner': ['tax-vat', 'product-packaging'],
  'madrid-tax': ['tax-vat'],
};
const DEFAULT_REQUEST = ['tax-vat', 'product-packaging', 'data-privacy'];
const BASIS = (matched: string[]) => ({ country: 'DE', country_covered: true, domains_requested: DEFAULT_REQUEST, domains_matched: matched });
const PROVIDERS = [
  { provider_key: 'studio-bianchi', pseudonym_label: 'Verifizierte Steuerkanzlei · Norditalien', region: 'Norditalien', active_since: 2015, specializations: ['VAT & OSS', 'E-Commerce', 'EU-weit'], languages: ['IT', 'DE', 'EN'], rating: 4.9, completed_count: 210, avg_response_hours: 3, billing_model: 'project', is_verified: true, match: 100, match_tier: 'high', match_basis: BASIS(['tax-vat', 'product-packaging', 'data-privacy']) },
  { provider_key: 'schmidt-partner', pseudonym_label: 'Verifizierte Steuerberatung · Norddeutschland', region: 'Norddeutschland', active_since: 2013, specializations: ['OSS/IOSS', 'Cross-border Tax'], languages: ['DE', 'EN'], rating: 4.7, completed_count: 96, avg_response_hours: 5, billing_model: 'abo', is_verified: true, match: 87, match_tier: 'strong', match_basis: BASIS(['tax-vat', 'product-packaging']) },
  { provider_key: 'madrid-tax', pseudonym_label: 'Verifizierter Tax-Spezialist · Spanien', region: 'Spanien', active_since: 2020, specializations: ['Iberian VAT', 'Marketplace'], languages: ['ES', 'EN'], rating: 4.5, completed_count: 41, avg_response_hours: 8, billing_model: 'hourly', is_verified: true, match: 73, match_tier: 'moderate', match_basis: BASIS(['tax-vat']) },
];

// Stufe-2-Detail je Anbieter (Spec §4.6): dieselben anonymen Felder wie die
// Karte plus Abdeckung und volle Preistabelle. Unbekannter Schluessel → 404,
// damit die Seite ihren Nicht-gefunden-Zustand zeigt statt eines fremden
// Anbieters (Befund 2026-09-13: „Details ansehen" endete auf weisser Seite).
// Die Suche antwortet auf DIE ANFRAGE: die Match-Basis nennt die angefragten
// Bereiche und davon die, die der Anbieter abdeckt. Die Zahl selbst bleibt die
// der Fixture — sie ist die Demo-Rangfolge, nicht die Rechnung des Servers.
function search(body: unknown) {
  // runSearch schickt die Bereiche als `domains` (der Server erwartet das so);
  // `categories` bleibt als zweite Schreibweise stehen.
  const req = (body ?? {}) as { domains?: unknown; categories?: unknown; country?: unknown };
  const asked = Array.isArray(req.domains) && req.domains.length ? req.domains
    : Array.isArray(req.categories) && req.categories.length ? req.categories
    : null;
  const requested = (asked as string[] | null) ?? DEFAULT_REQUEST;
  const country = typeof req.country === 'string' && req.country ? req.country.toUpperCase() : 'DE';
  const providers = PROVIDERS.map((p) => {
    const covers = COVERS[p.provider_key] ?? [];
    return {
      ...p,
      match_basis: {
        country,
        country_covered: (PROVIDER_DETAIL[p.provider_key]?.countries_supported ?? []).includes(country),
        domains_requested: requested,
        domains_matched: requested.filter((d) => covers.includes(d)),
      },
    };
  });
  return { ok: true, providers, laws: LAWS };
}

type MockDetail = {
  countries_supported: string[];
  pricing_table: Array<{ service: string; price: string }> | null;
  confirmation_rate: number | null;
  work_mode: string | null;
  services: Array<{ title: string; includes: string[] }> | null;
  credentials: Array<{ label: string; note: string }> | null;
  excluded_services: string[] | null;
};

// Stufe-2-Detail je Anbieter. „madrid-tax" traegt bewusst fast nichts: so
// sieht man im Mock, wie die Partnerseite mit einem Anbieter umgeht, der sein
// Dossier noch nicht gefuellt hat — leere Karten mit ehrlichem Satz, keine
// erfundenen Leistungen.
const PROVIDER_DETAIL: Record<string, MockDetail> = {
  'studio-bianchi': {
    countries_supported: ['IT', 'DE', 'AT'],
    pricing_table: [
      { service: 'USt-Erstregistrierung Italien (Partita IVA)', price: 'ab 450 € · einmalig' },
      { service: 'Laufende OSS-Betreuung', price: '180 € / Quartal' },
      { service: 'Fachberatung (Stundensatz)', price: '140 € / Std.' },
      { service: 'Komplettpaket E-Commerce-Setup', price: 'auf Anfrage' },
    ],
    confirmation_rate: 0.97,
    work_mode: 'remote · Portal',
    services: [
      { title: 'USt-Registrierung Italien', includes: ['Partita IVA beantragen', 'Vertretung gegenüber Agenzia delle Entrate'] },
      { title: 'OSS-Betreuung', includes: ['Quartalsmeldungen', 'Fristenüberwachung'] },
      { title: 'E-Commerce-Setup EU', includes: ['Lieferschwellen', 'Marktplatz-Anbindung'] },
    ],
    credentials: [
      { label: 'Dottore Commercialista (IT)', note: 'seit 2015 · Kammer geprüft' },
      { label: 'Revisore Legale', note: 'Titel verifiziert' },
    ],
    excluded_services: ['Zoll', 'Markenrecht'],
  },
  'schmidt-partner': {
    countries_supported: ['DE', 'NL', 'AT', 'FR'],
    pricing_table: [
      { service: 'OSS/IOSS-Registrierung', price: 'im Abo enthalten' },
      { service: 'Compliance-Abo (bis 3 Märkte)', price: '290 € / Monat' },
      { service: 'Jeder weitere Markt', price: '60 € / Monat' },
    ],
    confirmation_rate: 0.92,
    work_mode: 'remote · Portal',
    services: [
      { title: 'OSS/IOSS-Registrierung', includes: ['Anmeldung beim BZSt', 'Erste Quartalsmeldung', 'Fristenüberwachung'] },
      { title: 'Laufende USt-Betreuung EU', includes: ['Voranmeldungen DE', 'Reverse Charge', 'Intrastat ab Schwelle'] },
      { title: 'Cross-border Tax', includes: ['Betriebsstättenprüfung', 'Lieferketten-Strukturierung'] },
    ],
    credentials: [
      { label: 'Steuerberater-Zulassung (DE)', note: 'seit 2013 · Kammer geprüft' },
      { label: 'Fachberater Internationales Steuerrecht', note: 'Titel verifiziert' },
      { label: 'Kanzlei mit ISO 27001', note: 'Zertifikat 2025 vorgelegt' },
      { label: 'DATEV · Amazon SPN gelistet', note: 'Plattform-Nachweise' },
    ],
    excluded_services: ['Zoll', 'Datenschutz', 'Markenrecht'],
  },
  // Dossier bewusst leer — der Leerfall der Karten.
  'madrid-tax': {
    countries_supported: ['ES', 'PT'],
    pricing_table: null,
    confirmation_rate: null,
    work_mode: null,
    services: null,
    credentials: null,
    excluded_services: null,
  },
};
function providerDetail(key: string) {
  const p = PROVIDERS.find((x) => x.provider_key === key);
  const d = PROVIDER_DETAIL[key];
  if (!p || !d) return { __status: 404, errorCode: 'NOT_FOUND', message: 'Provider not found' };
  const { match, match_tier, match_basis, ...anon } = p;
  void match; void match_tier; void match_basis;
  return { ok: true, detail: { ...anon, ...d, availability: 'available' }, detail_open_charged: false };
}

// Bewertungen: nur, was an einer Buchung haengt (so wie der Server filtert).
// „madrid-tax" hat keine — die Sektion sagt das dann, statt Sterne zu erfinden.
const PROVIDER_REVIEWS: Record<string, Array<{ rating: number; body: string | null; categories: string[]; daysAgo: number }>> = {
  'studio-bianchi': [
    { rating: 5, body: 'Partita IVA war in drei Wochen da, inklusive der Rückfragen der Agenzia.', categories: ['Fristen', 'Erreichbarkeit'], daysAgo: 40 },
    { rating: 5, body: 'Auf Deutsch beraten, in Italien vertreten — genau das, was wir brauchten.', categories: ['Fachlich'], daysAgo: 95 },
    { rating: 4, body: null, categories: ['Preis'], daysAgo: 160 },
  ],
  'schmidt-partner': [
    { rating: 5, body: 'OSS-Umstellung in zwei Wochen sauber durch, Fristen kamen als Erinnerung vor uns an.', categories: ['Fristen', 'Fachlich'], daysAgo: 88 },
    { rating: 5, body: 'Reverse-Charge-Fragen wurden am selben Tag beantwortet. Preis wie besprochen.', categories: ['Erreichbarkeit', 'Preis'], daysAgo: 150 },
    { rating: 4, body: 'Gut bei Steuern, für Verpackung mussten wir woanders hin — sagt er aber selbst offen.', categories: ['Fachlich'], daysAgo: 190 },
  ],
  'madrid-tax': [],
};
function providerReviews(key: string) {
  const list = PROVIDER_REVIEWS[key];
  if (!list) return { __status: 404, errorCode: 'NOT_FOUND', message: 'Provider not found' };
  const reviews = list.map((r) => ({
    rating: r.rating,
    body: r.body,
    categories: r.categories,
    created_at: plus(-r.daysAgo * 24 * H),
  }));
  const average = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null;
  return { ok: true, reviews, summary: { count: reviews.length, average } };
}
// Klarnamen — Stufe 3. Sie werden NUR nach einer Buchung herausgegeben; bis
// dahin kennt die Oberflaeche den Anbieter ausschliesslich unter seinem
// Pseudonym (spec §5).
const PROVIDER_IDENTITY: Record<string, { name: string; website_url: string | null; contact_email: string | null }> = {
  'studio-bianchi': { name: 'Studio Bianchi & Partner Commercialisti Associati S.r.l.', website_url: 'https://example.org', contact_email: 'kontakt@studiobianchi.example' },
  'schmidt-partner': { name: 'Schmidt & Partner Steuerberatungsgesellschaft mbH', website_url: 'https://example.org', contact_email: 'kanzlei@schmidt-partner.example' },
  'madrid-tax': { name: 'Madrid Tax Advisors', website_url: null, contact_email: 'hola@madridtax.example' },
};

// POST /scheduling — die Buchung ist der bezahlte Lead UND der Moment, in dem
// beide Seiten Namen und Kontakt bekommen.
function createBooking(body: unknown) {
  const d = (body ?? {}) as { provider_key?: unknown; slot_start?: unknown; message?: unknown };
  const key = typeof d.provider_key === 'string' ? d.provider_key : '';
  const slot = typeof d.slot_start === 'string' ? d.slot_start : '';
  const identity = PROVIDER_IDENTITY[key];
  if (!key || !slot || !identity) {
    return { __status: 400, errorCode: 'VALIDATION_ERROR', message: 'provider_key and slot_start required' };
  }
  const end = new Date(new Date(slot).getTime() + 30 * 60 * 1000).toISOString();
  return {
    ok: true,
    booking: { id: `m0ck-new-${key}`, provider_key: key, slot_start: slot, slot_end: end, status: 'confirmed' },
    provider_identity: identity,
  };
}

function providerSlots() {
  const out: string[] = [];
  const d = new Date(); d.setHours(0, 0, 0, 0);
  let days = 0;
  while (days < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    days++;
    for (const [h, m] of [[9, 0], [10, 0], [11, 0], [14, 0], [15, 30]] as const) {
      const t = new Date(d); t.setHours(h, m, 0, 0); out.push(t.toISOString());
    }
  }
  return { ok: true, slots: out };
}

function dashboard() {
  const aktive = SESSIONS.filter((s) => s.status === 'active');
  return {
    ok: true,
    sessions: { total: aktive.length, items: aktive.map(({ id, label, country, categories, open, total, severity, created_at, updated_at }) => ({ id, label, country, categories, open, total, severity, created_at, updated_at })) },
    obligations: {
      open: 26, by_severity: { critical: 4, high: 11, medium: 8, low: 3 },
      by_market: { DE: 13, ES: 7, UK: 6 }, by_market_high: { DE: 9, ES: 3, UK: 3 },
      by_domain: { 'tax-vat': 9, 'product-packaging': 8, 'data-privacy': 4, 'marketing-seo': 3, 'legal-advisory': 2 },
      by_domain_high: { 'tax-vat': 6, 'product-packaging': 5, 'data-privacy': 3, 'marketing-seo': 1, 'legal-advisory': 0 },
    },
  };
}

function notifications() {
  const n = (i: number, type: string, subject: string, subjectId: string, payload: Record<string, unknown>, hoursAgo: number, read: boolean) =>
    ({ id: uuid(i, 4), type, subject, subject_id: subjectId, payload, created_at: plus(-hoursAgo * H), read_at: read ? plus(-(hoursAgo - 1) * H) : null });
  return [
    n(1, 'provider_replied', 'engagement', uuid(1), { providerKey: 'schmidt-partner', providerName: 'Verifizierte Steuerberatung · Norddeutschland' }, 2, false),
    n(2, 'provider_confirmed', 'engagement', uuid(8), { providerKey: 'studio-bianchi', providerName: 'Verifizierte Steuerkanzlei · Norditalien' }, 5, false),
    n(3, 'booking_rescheduled', 'booking', 'm0ck-b02', { providerName: 'Schmidt & Partner Steuerberatungsgesellschaft mbH', from: iso(1, 11), to: iso(1, 9) }, 9, false),
    n(4, 'provider_declined', 'engagement', uuid(10), { providerKey: 'madrid-tax', providerName: 'Verifizierter Tax-Spezialist · Spanien' }, 30, true),
    n(5, 'booking_cancelled', 'booking', 'm0ck-b10', { providerName: 'Dahlmann CPA', from: iso(-17, 16) }, 60, true),
    n(6, 'provider_replied', 'engagement', uuid(2), { providerKey: 'dahlmann-cpa', providerName: 'Verifizierter Steuerexperte · USA' }, 80, true),
  ];
}

function obligations(sessionId: string) {
  if (sessionId !== uuid(1, 1)) return { items: [] };
  return { items: [
    { obligation_id: 'tax-vat-registration', status: 'done', done_at: iso(-3).slice(0, 10), note: null, updated_at: iso(-3) },
    { obligation_id: 'prod-epr', status: 'in_progress', done_at: null, note: null, updated_at: iso(-1) },
    { obligation_id: 'data-privacy', status: 'not_applicable', done_at: null, note: 'Kein Endkundenkontakt', updated_at: iso(-5) },
  ] };
}

function engagement(id: string) {
  const e = requests().find((r) => r.id === id) ?? requests()[0];
  return { ok: true, engagement: e, messages: [
    { id: 'm1', author: 'user', body: e.message, created_at: e.created_at },
    { id: 'm2', author: 'system', body: 'Anfrage zugestellt — der Anbieter hat 24 Stunden zur Bestätigung.', created_at: e.created_at },
    ...(['confirmed', 'replied'].includes(e.status) ? [{ id: 'm3', author: 'system', body: 'Der Anbieter hat bestätigt. Identität und Kontakt sind jetzt freigeschaltet.', created_at: plus(-20 * H) }] : []),
    ...(e.status === 'replied' ? [{ id: 'm4', author: 'provider', body: 'Vielen Dank für Ihre Anfrage. Wir übernehmen die Registrierung inkl. LUCID-Eintrag; Vorschlag anbei.', proposal: { price_range: '900–1.400 €', timeline: '3–4 Wochen', deliverables: ['USt-Registrierung', 'LUCID-Registrierung', 'Erstberatung 60 min'], engagement_model: 'Projektbasiert' }, created_at: plus(-6 * H) }] : []),
  ] };
}

let laufNr = 100;
function duplicateSession(id: string, body: Record<string, unknown>) {
  const src = SESSIONS.find((s) => s.id === id) ?? SESSIONS[0];
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : `Kopie von ${src.label || src.country || 'Sitzung'}`;
  const copy = { ...src, id: uuid(++laufNr, 1), label, status: 'active', created_at: plus(0), updated_at: plus(0) };
  SESSIONS.unshift(copy);
  return { ok: true, id: copy.id };
}
function patchSession(id: string, body: Record<string, unknown>) {
  const s = SESSIONS.find((x) => x.id === id);
  if (s) {
    if (typeof body.label === 'string') s.label = body.label;
    if (body.status === 'active' || body.status === 'archived') s.status = body.status;
    // Antworten aktualisieren (Canvas-Wahl 2B): Markt/Bereiche folgen den Antworten.
    const a = body.answers as Record<string, unknown> | undefined;
    if (a && typeof a === 'object') {
      s.answers = a;
      if (Array.isArray(a.markets)) s.markets = a.markets;
      if (Array.isArray(a.categories)) s.categories = a.categories;
      if (typeof a.country === 'string') s.country = a.country || null;
    }
    s.updated_at = plus(0);
  }
  return { ok: true, id, session: s ?? null };
}

function route(method: string, path: string, body: Record<string, unknown> = {}): unknown {
  const seg = path.split('/').filter(Boolean); // ['api','v1',...]
  const p = seg.slice(2);
  if (method === 'GET') {
    if (p[0] === 'dashboard') return dashboard();
    if (p[0] === 'domain' && p[1]) return domainOverview(p[1]);
    if (p[0] === 'bookings') return { ok: true, bookings: bookings() };
    if (p[0] === 'requests') return { ok: true, requests: requests() };
    if (p[0] === 'notifications') { const rows = notifications(); return { ok: true, notifications: rows, unread: rows.filter((r) => !r.read_at).length }; }
    if (p[0] === 'sessions') return { ok: true, sessions: SESSIONS.map(({ open, total, severity, ...s }) => s) };
    if (p[0] === 'session' && p[2] === 'obligations') return obligations(p[1]);
    if (p[0] === 'engagement' && p.length === 2) return engagement(p[1]);
    if (p[0] === 'provider' && p[2] === 'detail') return providerDetail(p[1]);
    if (p[0] === 'provider' && p[2] === 'slots') return providerSlots();
    if (p[0] === 'provider' && p[2] === 'reviews') return providerReviews(p[1]);
    if (p[0] === 'metrics') return { ok: true, sla: { confirm_rate: 0.86, avg_reply_hours: 5.2 } };
    return { ok: true, items: [], providers: [], laws: [], documents: [], exports: [] };
  }
  if (p[0] === 'search') return search(body);
  if (p[0] === 'scheduling' && p.length === 1 && method === 'POST') return createBooking(body);
  if (p[0] === 'assistant' && p[1] === 'chat') return assistantChat(body);
  if (p[0] === 'session' && p.length === 1) return { ok: true, id: uuid(9, 1) };
  if (p[0] === 'session' && p[2] === 'duplicate') return duplicateSession(p[1], body);
  if (p[0] === 'session' && p.length === 2 && method === 'PATCH') return patchSession(p[1], body);
  if (p[0] === 'notifications' && p[1] === 'read') return { ok: true, marked: 3 };
  return { ok: true };
}

export function mockApiPlugin(): Plugin {
  const enabled = process.env.VITE_MOCK_API === '1';
  return {
    name: 'complihub-mock-api',
    apply: 'serve',
    configureServer(server) {
      if (!enabled) return;
      server.config.logger.info('  ➜  mock-api: /api/v1/* antwortet aus dem eingebauten Worst-Case-Datensatz (VITE_MOCK_API=1)');
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/v1/')) return next();
        const url = new URL(req.url, 'http://mock.local');
        let raw = '';
        req.on('data', (c: Buffer) => { raw += c.toString(); });
        req.on('end', () => {
        let parsed: Record<string, unknown> = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { /* kein JSON */ }
        const body = route(req.method ?? 'GET', url.pathname, parsed);
        res.setHeader('content-type', 'application/json');
        res.setHeader('x-mock-api', '1');
        // Eine Antwort darf ihren Status mitbringen (404 fuer unbekannte Anbieter).
        const { __status, ...payload } = (body ?? {}) as { __status?: number } & Record<string, unknown>;
        res.statusCode = __status ?? 200;
        // Kurze Latenz, damit Lade- und Leerzustaende nicht flackern.
        setTimeout(() => res.end(JSON.stringify(payload)), 120);
        });
      });
    },
  };
}
