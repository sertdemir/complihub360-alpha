import { isKnownCountry } from '@complihub/compliance-engine';

// ─── Demo-Datensatz der Mock-API ─────────────────────────────────────────────
// Zwei Abnehmer, ein Datensatz:
//  · lokal `vite-plugin-mock-api.ts` (Vite-Middleware, VITE_MOCK_API=1)
//  · Staging `api/client.ts` fuer den Demo-Login (TEMP-DEMO-DATEN), im Browser
// Deshalb hier nichts, was nur in Node laeuft (kein process, kein Buffer).
//
// Ursprung: die Mock-API für den lokalen Dev-Server
// `VITE_MOCK_API=1 npm run dev` (Repo-Root: `npm run dev:ui:mock`): jede
// Anfrage an /api/v1/* wird hier aus einem eingebauten Datensatz beantwortet
// statt an die compliance-api weitergereicht. Zweck: die gefuellten Screens
// des Arbeitsbereichs ohne Backend, Supabase und Seed durchklicken koennen —
// und zwar im WORST CASE (viele Termine in allen Zustaenden, Anfragen in allen
// acht Formen, ueberlange Namen).
//
// Im Build nur, wenn VITE_DEMO_LOGIN=1 (Staging), als eigener Chunk, der erst
// beim Demo-Login geladen wird. Schreibende Aufrufe antworten mit ok:true,
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
/** Tagesbeginn in UTC, n Tage voraus — so speichert der Server ein "gilt ab"-Datum. */
const dayStart = (n: number) => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n)).toISOString(); };
/** Der naechste Jahreswechsel — der typische Termin fuer neue Konditionen. */
const NEW_YEAR = `${new Date().getUTCFullYear() + 1}-01-01T00:00:00.000Z`;
const uuid = (n: number, block = 2) => `5eed000${block}-0000-4000-8000-${String(n).padStart(12, '0')}`;

const USER_ID = 'fa49d5ab-4dc9-4bb4-a84d-fe624e2eea2e';

// Phase 3 (ADR-0004): auf dem Draht steht der opake public_ref, nie der
// Schluessel. Die Abbildung hier ist die des Mocks; in der API kommt der Ref
// aus `providers.public_ref`.
// Demo-Geschichte (2026-09-27): Acme GmbH, D2C-Shop aus Hamburg, mit drei
// Sitzungen (EU-Expansion DE/IT/ES, UK nach Brexit, Marketing & Recht ES).
// Jeder Anbieter passt zu einem Markt und Bereich dieser Sitzungen — keiner
// steht in einem Land, das der Nutzer gar nicht bearbeitet. Schmidt & Partner
// ist zugleich die Partner-Persona des Partner-Dashboards: dort erscheinen
// dieselben Acme-Anfragen aus Anbietersicht.
const REF: Record<string, string> = { 'studio-bianchi': 'a1b2c3d4e5f6', 'schmidt-partner': 'b2c3d4e5f6a1', 'madrid-tax': 'c3d4e5f6a1b2', 'lucid-reg': 'd4e5f6a1b2c3', 'thames-vat': 'e5f6a1b2c3d4', 'costa-legal': 'f6a1b2c3d4e5', 'datenschutz-nord': '0a1b2c3d4e5f', 'oss-experts': '1b2c3d4e5f60' };
const DESCRIPTOR: Record<string, string> = { 'studio-bianchi': 'Tax and VAT, Product & Packaging · Norditalien', 'schmidt-partner': 'Tax and VAT, Product & Packaging, Data & Privacy · Norddeutschland', 'madrid-tax': 'Tax and VAT · Spanien', 'lucid-reg': 'Product & Packaging · Hamburg', 'thames-vat': 'Tax and VAT · Vereinigtes Königreich', 'costa-legal': 'Legal Support · Spanien', 'datenschutz-nord': 'Data & Privacy · Hamburg', 'oss-experts': 'Tax and VAT · Berlin' };
// 3 V3: Bereiche als Codes und Region getrennt — wie der Server (area_codes,
// descriptor_region); das UI uebersetzt. DESCRIPTOR bleibt als Rueckfall.
const AREAS: Record<string, string[]> = { 'studio-bianchi': ['product-packaging', 'tax-vat'], 'schmidt-partner': ['data-privacy', 'product-packaging', 'tax-vat'], 'madrid-tax': ['tax-vat'], 'lucid-reg': ['product-packaging'], 'thames-vat': ['tax-vat'], 'costa-legal': ['legal-advisory'], 'datenschutz-nord': ['data-privacy'], 'oss-experts': ['tax-vat'] };
const REGION: Record<string, string> = { 'studio-bianchi': 'Norditalien', 'schmidt-partner': 'Norddeutschland', 'madrid-tax': 'Spanien', 'lucid-reg': 'Hamburg', 'thames-vat': 'Vereinigtes Königreich', 'costa-legal': 'Spanien', 'datenschutz-nord': 'Hamburg', 'oss-experts': 'Berlin' };
const keyOfRef = (ref: string) => Object.keys(REF).find((k) => REF[k] === ref) ?? null;

// Phase 5 (ADR-0007): wer fehlte, Widerspruch, Neubuchungsfrist — wie
// `attendanceFields` beim Server. Veraenderlich, damit Melden, Widersprechen
// und Neubuchen im Mock sichtbar greifen.
type Att = { no_show_by: 'user' | 'provider' | 'platform' | null; no_show_reported_at: string | null; dispute_status: 'none' | 'open' | 'upheld' | 'dismissed'; rebook_deadline: string | null; rebooked_from: string | null; reschedule_count: number; credit_decided_at: string | null };
const ATT_NONE: Att = { no_show_by: null, no_show_reported_at: null, dispute_status: 'none', rebook_deadline: null, rebooked_from: null, reschedule_count: 0, credit_decided_at: null };
const ATT: Record<string, Att> = {
  // Nutzer-No-Show, gestern gemeldet: Frist laeuft, Widerspruch noch moeglich.
  'm0ck-b14': { ...ATT_NONE, no_show_by: 'user', no_show_reported_at: iso(-1, 14), rebook_deadline: dayStart(13).slice(0, 10) },
  // Plattformfehler: abgesagt, Neubuchung ohne zweite Gebuehr vorgemerkt.
  'm0ck-b15': { ...ATT_NONE, no_show_by: 'platform', no_show_reported_at: iso(-4, 11), rebook_deadline: dayStart(10).slice(0, 10) },
  // Anbieter-No-Show (vom Nutzer gemeldet): Vorfall vermerkt, Frist offen.
  'm0ck-b11': { ...ATT_NONE, no_show_by: 'provider', no_show_reported_at: iso(-21, 12), rebook_deadline: dayStart(-7).slice(0, 10), credit_decided_at: iso(-7) },
  'pb-4': { ...ATT_NONE, no_show_by: 'user', no_show_reported_at: iso(-17, 16), rebook_deadline: dayStart(-3).slice(0, 10), credit_decided_at: iso(-3, 3) },
  'pb-6': { ...ATT_NONE, no_show_by: 'user', no_show_reported_at: iso(-2, 15), dispute_status: 'open', rebook_deadline: dayStart(12).slice(0, 10) },
};
const DISPUTE_H = 48; const REBOOK_DAYS = 14; const RESCHEDULE_LIMIT = 2;
function attendanceFields(id: string, status: string, slotEnd: string) {
  const a = ATT[id] ?? ATT_NONE;
  const today = new Date().toISOString().slice(0, 10);
  return {
    no_show_by: a.no_show_by, no_show_reported_at: a.no_show_reported_at, dispute_status: a.dispute_status,
    rebook_deadline: a.rebook_deadline, rebooked_from: a.rebooked_from, reschedule_count: a.reschedule_count, reschedule_limit: RESCHEDULE_LIMIT,
    attendance_reportable: status === 'confirmed' && slotEnd < new Date().toISOString(),
    dispute_open_until: a.no_show_by === 'user' && a.no_show_reported_at && a.dispute_status === 'none' ? new Date(Date.parse(a.no_show_reported_at) + DISPUTE_H * H).toISOString() : null,
    rebook_open: !!a.rebook_deadline && !a.credit_decided_at && today <= a.rebook_deadline,
  };
}
// Status-Ueberschreibungen aus Anwesenheits-Meldung und Neubuchung im Mock.
const STATUS_OVERRIDE: Record<string, string> = {};
const REBOOKED: Array<{ id: string; from: string; key: string; slot_start: string }> = [];

function bookings() {
  const b = (id: string, key: string, name: string, region: string, web: string | null, start: string, end: string, status: string) =>
    ({ id, public_ref: REF[key] ?? null, provider_name: name, provider_descriptor: DESCRIPTOR[key] ?? '', provider_area_codes: AREAS[key] ?? [], provider_region: region, provider_website: web, identity_revealed: true, slot_start: start, slot_end: end, status: STATUS_OVERRIDE[id] ?? status, message: null, ...attendanceFields(id, STATUS_OVERRIDE[id] ?? status, end) });
  const rebooked = REBOOKED.map((r) => { const src = bookings0().find((x) => x.id === r.from); return src ? { ...b(r.id, r.key, src.provider_name, src.provider_region ?? '', src.provider_website, r.slot_start, new Date(new Date(r.slot_start).getTime() + 30 * 60_000).toISOString(), 'confirmed'), rebooked_from: r.from } : null; }).filter((x): x is NonNullable<typeof x> => !!x);
  return [...rebooked, ...bookings0()];
  function bookings0() { return [
    b('m0ck-b01', 'studio-bianchi', 'Studio Bianchi & Partner Commercialisti Associati S.r.l.', 'Norditalien', 'https://example.org', iso(0, 16), iso(0, 16, 30), 'confirmed'),
    b('m0ck-b02', 'schmidt-partner', 'Schmidt & Partner Steuerberatungsgesellschaft mbH', 'Norddeutschland', 'https://example.org', iso(1, 9), iso(1, 9, 30), 'confirmed'),
    // Bewusst NICHT 'madrid-tax': von den drei Anbietern, die die Suche zeigt,
    // soll einer ohne Termin bleiben. Sonst trugen im Mock alle drei Karten den
    // Klarnamen und der Normalfall — Pseudonym, „Details ansehen" — war nicht
    // mehr zu sehen.
    b('m0ck-b03', 'lucid-reg', 'LUCID Registrierungsdienst Hamburg', 'Hamburg', null, iso(4, 11), iso(4, 11, 30), 'confirmed'),
    b('m0ck-b04', 'thames-vat', 'Thames VAT Partners LLP', 'London', null, iso(6, 15), iso(6, 15, 30), 'confirmed'),
    b('m0ck-b05', 'costa-legal', 'Bufete Costa Legal S.L.P.', 'Barcelona', null, iso(12, 10), iso(12, 10, 30), 'confirmed'),
    b('m0ck-b06', 'datenschutz-nord', 'Datenschutz Nord GmbH', 'Hamburg', null, iso(19, 13), iso(19, 13, 30), 'confirmed'),
    b('m0ck-b07', 'lucid-reg', 'LUCID Registrierungsdienst Hamburg', 'Hamburg', null, iso(-1, 14), iso(-1, 14, 30), 'confirmed'),
    b('m0ck-b08', 'oss-experts', 'OSS Experts GmbH', 'Berlin', null, iso(-2, 10), iso(-2, 10, 30), 'confirmed'),
    b('m0ck-b09', 'oss-experts', 'OSS Experts GmbH', 'Berlin', null, iso(-8, 9), iso(-8, 9, 30), 'completed'),
    b('m0ck-b10', 'thames-vat', 'Thames VAT Partners LLP', 'London', null, iso(-17, 16), iso(-17, 16, 30), 'cancelled'),
    b('m0ck-b11', 'datenschutz-nord', 'Datenschutz Nord GmbH', 'Hamburg', null, iso(-21, 11), iso(-21, 11, 30), 'no_show'),
    b('m0ck-b12', 'schmidt-partner', 'Schmidt & Partner Steuerberatungsgesellschaft mbH', 'Norddeutschland', null, iso(-30, 15), iso(-30, 15, 30), 'completed'),
    b('m0ck-b13', 'costa-legal', 'Bufete Costa Legal S.L.P.', 'Barcelona', null, iso(-45, 10), iso(-45, 10, 30), 'completed'),
    // Phase 5: der Anbieter hat gemeldet, dass der Nutzer nicht kam (Frist
    // laeuft, Widerspruch offen) — und ein Plattformfehler mit Neubuchung.
    b('m0ck-b14', 'schmidt-partner', 'Schmidt & Partner Steuerberatungsgesellschaft mbH', 'Norddeutschland', 'https://example.org', iso(-2, 12), iso(-2, 12, 30), 'no_show'),
    b('m0ck-b15', 'studio-bianchi', 'Studio Bianchi & Partner Commercialisti Associati S.r.l.', 'Norditalien', 'https://example.org', iso(-4, 11), iso(-4, 11, 30), 'cancelled'),
  // Canvas F V1: Datenschutz Nord hat nach einem wesentlichen Ereignis die
  // Leistung pausiert — der kommende Termin traegt das Flag.
  ].map((x) => ({ ...x, provider_paused: x.id === 'm0ck-b06' })); }
}

// Anfrage-IDs: die ersten vier Zeichen sind die sichtbare "RQ-XXXX" —
// vorher begannen alle mit 5eed und hiessen "RQ-5EED".
const RQ_PREFIX = ['a3f1', 'b82c', 'c41d', 'd9e7', 'e2a4', 'f63b', '1c8e', '2d5f', '3e92', '4fa6', '5b17', '6c28'];
const rid = (n: number) => `${RQ_PREFIX[n - 1]}0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// Das Anliegen folgt Markt und Bereich — vorher trug jede Anfrage den Italien-Text.
const ANLIEGEN: Record<string, string> = {
  'IT/tax-vat': 'Wir starten den Verkauf nach Italien und brauchen eine USt-Registrierung (Partita IVA) inkl. Fiskalvertretung.',
  'IT/product-packaging': 'Für Italien brauchen wir die Verpackungsregistrierung (CONAI) und die Kennzeichnung nach D.Lgs. 116/2020.',
  'DE/product-packaging': 'LUCID-Registrierung, Systembeteiligung und Mengenmeldung für unseren Shop in Deutschland.',
  'DE/data-privacy': 'Cookie-Banner, Einwilligungsnachweise und AV-Verträge für den Shop prüfen lassen.',
  'DE/tax-vat': 'Umstellung auf das OSS-Verfahren für Fernverkäufe nach Italien und Spanien.',
  'DE/legal-advisory': 'AGB und Widerrufsbelehrung für den Marktplatz-Start prüfen.',
  'ES/tax-vat': 'Spanische USt-Registrierung und laufende Voranmeldungen für den Marktplatzverkauf.',
  'ES/legal-advisory': 'Rechtliche Prüfung unserer Werbeaussagen und Preisangaben für Spanien.',
  'UK/tax-vat': 'UK-VAT-Registrierung nach dem Brexit, inkl. Postponed VAT Accounting beim Import.',
};
function requests() {
  const r = (n: number, over: Record<string, unknown>) => {
    const row = {
      id: rid(n), user_id: USER_ID, provider_key: 'studio-bianchi', country: 'IT', category: 'tax-vat', created_at: iso(-1),
      structured_answers: { company: 'Acme GmbH' }, ...over,
    } as Record<string, unknown>;
    return { ...row, message: ANLIEGEN[`${row.country}/${row.category}`] ?? '' } as Record<string, any>;
  };
  return [
    r(1, { status: 'replied', created_at: iso(-3), provider_key: 'schmidt-partner', country: 'DE', category: 'product-packaging' }),
    r(2, { status: 'replied', created_at: iso(0, 7), provider_key: 'thames-vat', country: 'UK', category: 'tax-vat' }),
    r(3, { status: 'expired', created_at: iso(-2), sla_confirm_deadline: plus(-26 * H) }),
    r(4, { status: 'confirmed', created_at: iso(-4), sla_reply_deadline: plus(-5 * H), provider_key: 'madrid-tax', country: 'ES' }),
    r(5, { status: 'created', created_at: iso(0, 9), sla_confirm_deadline: plus(22 * H), provider_key: 'datenschutz-nord', country: 'DE', category: 'data-privacy' }),
    r(6, { status: 'delivered', created_at: iso(-1, 20), sla_confirm_deadline: plus(2.5 * H), provider_key: 'schmidt-partner', country: 'DE', category: 'data-privacy' }),
    r(7, { status: 'viewed', created_at: iso(-1, 22), sla_confirm_deadline: plus(-1 * H), provider_key: 'costa-legal', country: 'ES', category: 'legal-advisory' }),
    r(8, { status: 'confirmed', created_at: iso(-1), sla_reply_deadline: plus(31 * H), category: 'product-packaging' }),
    r(9, { status: 'confirmed', created_at: iso(-1, 12), sla_reply_deadline: plus(0.4 * H), provider_key: 'oss-experts', country: 'DE', category: 'tax-vat' }),
    r(10, { status: 'declined', created_at: iso(-5), provider_key: 'madrid-tax', country: 'ES' }),
    r(11, { status: 'withdrawn', created_at: iso(-9), provider_key: 'madrid-tax', country: 'ES' }),
    r(12, { status: 'declined', created_at: iso(-12), provider_key: 'schmidt-partner', country: 'DE', category: 'legal-advisory' }),
  ];
}

// ─── Partnersicht: Schmidt & Partner ─────────────────────────────────────────
// Dieselben Acme-Anfragen an Schmidt & Partner (1, 6, 12) plus Anfragen
// anderer Mandanten. Vor der Bestaetigung bleibt der Mandant anonym — die
// Karte zeigt dann nur Markt und Bereich (Dossier-Regel).
const PARTNER_KEY = 'schmidt-partner';
const PRQ_PREFIX = ['7c41', '7b3e', '7a92', '79d8', '78f1'];
const prid = (n: number) => `${PRQ_PREFIX[n - 1]}0000-0000-4000-8000-${String(90 + n).padStart(12, '0')}`;
function partnerRequests() {
  const eigene = requests().filter((r) => r.provider_key === PARTNER_KEY);
  const q = (n: number, company: string, over: Record<string, unknown>, message: string) =>
    ({ id: prid(n), user_id: null, provider_key: PARTNER_KEY, structured_answers: { company }, message, ...over }) as Record<string, any>;
  return [
    q(1, 'Nordlicht Textil GmbH', { status: 'created', created_at: plus(-0.2 * H), sla_confirm_deadline: plus(23.8 * H), country: 'DE', category: 'product-packaging' },
      'EPR-Setup für den Marktplatz-Start in Deutschland: LUCID, Systembeteiligung, Mengenmeldung.'),
    q(2, 'Kaffeerösterei Elbe GmbH', { status: 'delivered', created_at: plus(-2 * H), sla_confirm_deadline: plus(22 * H), country: 'DE', category: 'tax-vat' },
      'USt-Prüfung für Deutschland und Österreich, Umstieg auf OSS geplant.'),
    q(3, 'Smart-Stage UG', { status: 'viewed', created_at: plus(-9.8 * H), sla_confirm_deadline: plus(14.2 * H), country: 'DE', category: 'data-privacy' },
      'DSFA und AV-Verträge für ein SaaS-Produkt mit Nutzerdaten aus der EU.'),
    q(4, 'Brunnen Living GmbH', { status: 'confirmed', created_at: plus(-26 * H), sla_reply_deadline: plus(30 * H), country: 'AT', category: 'tax-vat' },
      'USt-Registrierung und Fiskalvertretung in Österreich für den Möbelversand.'),
    q(5, 'Möbelwerk Süd GmbH', { status: 'replied', created_at: iso(-14), country: 'DE', category: 'product-packaging' },
      'EPR-Registrierung für Möbelverpackungen, Mengen ab dem dritten Quartal.'),
    ...eigene,
  ];
}
// Phase 4: je Lead, was er gekostet hat (Band, Standard, Rabatt, Endbetrag),
// die 10 % fuer den Nutzer und die Selbstauskunft des Anbieters. Die
// Selbstauskunft ist veraenderlich (PATCH unten), sonst saehe man nie, dass
// ein Umschalter greift.
const PROPOSALS: Record<string, { proposal_issued: boolean; discount_shown: boolean; reported_at: string } | null> = {
  'm0ck-b02': { proposal_issued: true, discount_shown: true, reported_at: iso(0, 8) },
  'pb-3': { proposal_issued: true, discount_shown: false, reported_at: iso(-8, 9) },
  'pb-4': null,
  'pb-5': null,
  'pb-6': null,
  'm0ck-b12': null,
};
// Phase 5: der Anbieter meldet die Anwesenheit (PATCH .../attendance).
function reportAttendance(bookingId: string, body: Record<string, unknown>) {
  const row = partnerBookings().find((b) => b.id === bookingId);
  if (!row) return { __status: 404, errorCode: 'NOT_FOUND', message: 'Booking not found' };
  const outcome = String(body.outcome ?? '');
  if (!['attended', 'user_no_show', 'platform_failure'].includes(outcome)) return { __status: 400, errorCode: 'VALIDATION_ERROR', message: 'outcome must be attended|user_no_show|platform_failure' };
  if (!row.attendance_reportable) return { __status: 409, errorCode: 'NOT_REPORTABLE', message: 'Attendance can be reported for a confirmed appointment after its end', status: row.status };
  if (outcome === 'attended') { STATUS_OVERRIDE[bookingId] = 'completed'; return { ok: true, id: bookingId, status: 'completed' }; }
  const deadline = dayStart(REBOOK_DAYS).slice(0, 10);
  if (outcome === 'user_no_show') { STATUS_OVERRIDE[bookingId] = 'no_show'; ATT[bookingId] = { ...ATT_NONE, no_show_by: 'user', no_show_reported_at: plus(0), rebook_deadline: deadline }; return { ok: true, id: bookingId, status: 'no_show', no_show_by: 'user', rebook_deadline: deadline, dispute_hours: DISPUTE_H }; }
  STATUS_OVERRIDE[bookingId] = 'cancelled'; ATT[bookingId] = { ...ATT_NONE, no_show_by: 'platform', no_show_reported_at: plus(0), rebook_deadline: deadline };
  return { ok: true, id: bookingId, status: 'cancelled', no_show_by: 'platform', rebook_deadline: deadline };
}
// Phase 5: der Nutzer widerspricht, verschiebt, bucht neu oder meldet den Anbieter-No-Show.
let REBOOK_N = 0;
function patchBooking(bookingId: string, body: Record<string, unknown>) {
  const row = bookings().find((b) => b.id === bookingId);
  if (!row) return { __status: 404, errorCode: 'NOT_FOUND', message: 'Booking not found' };
  if (body.action === 'dispute') {
    if (row.no_show_by !== 'user') return { __status: 409, errorCode: 'NOT_DISPUTABLE', message: 'Only a reported user no-show can be disputed' };
    if (row.dispute_status !== 'none') return { __status: 409, errorCode: 'ALREADY_DISPUTED', message: 'Already disputed' };
    if (!row.dispute_open_until || row.dispute_open_until < plus(0)) return { __status: 409, errorCode: 'DISPUTE_WINDOW_CLOSED', message: 'The dispute window has closed' };
    ATT[bookingId] = { ...(ATT[bookingId] ?? ATT_NONE), dispute_status: 'open' };
    return { ok: true, id: bookingId, dispute_status: 'open', dispute_open_until: row.dispute_open_until };
  }
  if (typeof body.slot_start === 'string') {
    const start = body.slot_start;
    if (row.rebook_open && row.status !== 'confirmed') {
      const id = `m0ck-rb${++REBOOK_N}`; const key = keyOfRef(row.public_ref ?? '') ?? 'schmidt-partner';
      REBOOKED.unshift({ id, from: bookingId, key, slot_start: start });
      ATT[bookingId] = { ...(ATT[bookingId] ?? ATT_NONE), credit_decided_at: plus(0) };
      return { __status: 201, ok: true, id, status: 'confirmed', slot_start: start, slot_end: new Date(new Date(start).getTime() + 30 * 60_000).toISOString(), rebooked_from: bookingId };
    }
    if (row.status !== 'confirmed') return { __status: 409, errorCode: 'CONFLICT', message: 'Only confirmed bookings can be rescheduled' };
    const a = ATT[bookingId] ?? ATT_NONE;
    if (a.reschedule_count >= RESCHEDULE_LIMIT) return { __status: 409, errorCode: 'RESCHEDULE_LIMIT', message: 'This appointment has been moved as often as possible', limit: RESCHEDULE_LIMIT };
    ATT[bookingId] = { ...a, reschedule_count: a.reschedule_count + 1 };
    return { ok: true, id: bookingId, slot_start: start, slot_end: new Date(new Date(start).getTime() + 30 * 60_000).toISOString() };
  }
  const status = String(body.status ?? '');
  if (status === 'no_show') { STATUS_OVERRIDE[bookingId] = 'no_show'; ATT[bookingId] = { ...ATT_NONE, no_show_by: 'provider', no_show_reported_at: plus(0), rebook_deadline: dayStart(REBOOK_DAYS).slice(0, 10) }; return { ok: true, id: bookingId, status: 'no_show', no_show_by: 'provider' }; }
  if (status === 'completed' || status === 'cancelled') { STATUS_OVERRIDE[bookingId] = status; return { ok: true, id: bookingId, status }; }
  return { __status: 400, errorCode: 'VALIDATION_ERROR', message: 'status must be cancelled|completed|no_show, or slot_start' };
}
function partnerBookings() {
  const lead = (band: number, standard: number, pct: number, seq: number | null) =>
    ({ band, standard_fee_cents: standard, discount_pct: pct, discount_sequence: seq, final_fee_cents: Math.round(standard * (100 - pct) / 100), currency: 'USD', payment_status: 'captured', fee_enabled: true });
  // 2 V1: Firma, Bereich und Markt kommen wie beim Server aus der Anfrage;
  // Hafenkontor hat keine Firma angegeben -> das UI zeigt "nicht angegeben".
  const k = (id: string, start: string, status: string, email: string, company: string | null, category: string, country: string, message: string, l: ReturnType<typeof lead> | null) => {
    const end = new Date(new Date(start).getTime() + 30 * 60_000).toISOString(); const st = STATUS_OVERRIDE[id] ?? status;
    return { id, slot_start: start, slot_end: end, status: st, lead_charged: true, user_email: email, user_company: company, category, country, message,
       lead: l, user_discount_pct: l ? 10 : null, proposal: PROPOSALS[id] ?? null, acknowledgement_version: l ? 'booking-ack-v1' : null, price_snapshot: null, ...attendanceFields(id, st, end) };
  };
  return [
    k('m0ck-b02', iso(1, 9), 'confirmed', 'a.weber@acme-gmbh.example', 'Acme GmbH', 'product-packaging', 'DE', 'LUCID-Registrierung und Mengenmeldung für den Marktplatz-Start.', lead(2, 14900, 10, 3)),
    // Phase 5: Termin vorbei, Rueckmeldung offen (1B) — und ein No-Show, dem
    // der Nutzer widersprochen hat.
    k('pb-5', iso(-1, 12), 'confirmed', 'jana.weber@weber-logistik.example', 'Weber Logistik GmbH', 'tax-vat', 'DE', 'Umstellung auf das OSS-Verfahren für Fernverkäufe nach Italien.', lead(2, 14900, 10, 2)),
    k('pb-6', iso(-3, 15), 'no_show', 'buchhaltung@nordlicht-moebel.example', 'Nordlicht Möbel GmbH', 'tax-vat', 'DE', 'USt-Voranmeldungen und OSS für den Shop.', lead(1, 9900, 0, null)),
    k('pb-3', iso(-9, 10), 'completed', 'einkauf@moebelwerk-sued.example', 'Möbelwerk Süd GmbH', 'product-packaging', 'DE', 'EPR-Registrierung für Möbelverpackungen.', lead(4, 49900, 10, 2)),
    k('pb-4', iso(-18, 15), 'no_show', 'info@hafenkontor.example', null, 'tax-vat', 'DE', 'Umstellung auf OSS.', lead(2, 14900, 10, 1)),
    // Aus der Zeit vor Phase 4: kein Ledger, nur das Wort „Lead berechnet".
    k('m0ck-b12', iso(-30, 15), 'completed', 'a.weber@acme-gmbh.example', 'Acme GmbH', 'tax-vat', 'DE', 'OSS-Erstgespräch.', null),
  ];
}
function reportProposal(bookingId: string, body: Record<string, unknown>) {
  if (!(bookingId in PROPOSALS)) return { __status: 404, errorCode: 'NOT_FOUND', message: 'Booking not found' };
  const issued = body.proposal_issued === true; const shown = body.discount_shown === true;
  if (shown && !issued) return { __status: 400, errorCode: 'VALIDATION_ERROR', message: 'A discount cannot be shown without a proposal' };
  PROPOSALS[bookingId] = { proposal_issued: issued, discount_shown: shown, reported_at: plus(0) };
  return { ok: true, proposal: PROPOSALS[bookingId] };
}
// Zahlungsbereitschaft: gesperrt, bis „Jetzt pruefen" einmal gelaufen ist —
// so zeigt die Demo beide Zustaende des Kastens (Canvas 4A).
let READINESS = { ready: false, reasons: ['payment_failed', 'overdue_invoice'] as string[], synced_at: plus(-3 * H), payment_method: 'Visa ····4242' };
function syncReadiness() {
  READINESS = { ready: true, reasons: [], synced_at: plus(0), payment_method: 'Visa ····1881' };
  return { ok: true, readiness: { ...READINESS, changed: true } };
}
// ADR-0008 A2: „Karte erneut pruefen" — der erste Versuch wird abgelehnt, der
// zweite bestaetigt die Karte. So zeigt die Demo beide Ausgaenge.
let RECHECKS = 0;
function recheckReadiness() {
  RECHECKS += 1;
  if (!READINESS.reasons.includes('payment_failed')) return { ok: true, result: 'not_blocked', readiness: { ...READINESS } };
  if (RECHECKS === 1) return { ok: true, result: 'declined', reason: 'card_declined' };
  const reasons = READINESS.reasons.filter((r) => r !== 'payment_failed');
  READINESS = { ...READINESS, reasons, ready: reasons.length === 0, synced_at: plus(0) };
  return { ok: true, result: 'cleared', readiness: { ...READINESS } };
}
// Pausieren (Canvas C2): Kopfzeile und Einstellungen schalten denselben Wert.
let MOCK_AVAILABILITY: 'available' | 'ooo' = 'available';
function partnerCoverage() {
  return { ok: true, coverage: { provider_key: PARTNER_KEY, name: 'Schmidt & Partner Steuerberatungsgesellschaft mbH', countries_supported: ['DE', 'AT'], languages: ['DE', 'EN'], sla_target_confirm_hours: 24, availability: MOCK_AVAILABILITY, ooo_until: null, partner_status: 'active', contact_email: 'kanzlei@schmidt-partner.example', billing_model: 'mixed', region: 'Norddeutschland', active_since: 2009, pricing_table: [{ service: 'USt-Voranmeldung (monatlich)', price: 'ab 180 € / Monat' }, { service: 'OSS-Registrierung', price: 'ab 450 € einmalig' }] } };
}
const monat = (offset: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d.toISOString().slice(0, 7); };
// Pricing v2 (ADR-0003): Tarif + Leads nach Band, Rabatt auf die ersten Leads
// des Zyklus. Keine Gebuehr fuer Profilaufrufe. Alles in USD wie die Baender.
function partnerInvoices() {
  const inv = (n: number, offset: number, leads: number) => {
    const rabattLeads = Math.min(3, leads);
    const lines = [
      { label: `Growth · monthly · ${monat(offset)}`, qty: 1, unit_cents: 9900, amount_cents: 9900 },
      { label: 'Leads · Core', qty: leads, unit_cents: 14900, amount_cents: leads * 14900 },
      { label: 'Tarif-Rabatt 10 %', qty: rabattLeads, unit_cents: -1490, amount_cents: -1490 * rabattLeads },
    ];
    const total = lines.reduce((sum, l) => sum + l.amount_cents, 0);
    const issued = `${monat(offset + 1)}-01`;
    return { id: `inv-${n}`, invoice_number: `INV-2026-${String(n).padStart(3, '0')}`, period: monat(offset), amount_cents: total, currency: 'USD', status: 'paid', line_items: lines, issued_at: issued, due_at: `${monat(offset + 1)}-15`, paid_at: `${monat(offset + 1)}-03`, hosted_invoice_url: null, invoice_pdf: null };
  };
  return { ok: true, invoices: [inv(8, -1, 4), inv(7, -2, 3), inv(6, -3, 5), inv(5, -4, 2)] };
}
function partnerSubscription() {
  const pre = partnerBillingPreview();
  return {
    ok: true,
    subscription: { plan_code: 'growth', cadence: 'monthly', status: 'active', current_period_start: `${monat(0)}-01`, current_period_end: `${monat(1)}-01`, started_at: `${monat(-3)}-01`, renewal_date: `${monat(1)}-01` },
    plans: pre.pricing.plans,
    released_categories: [{ code: 'tax-vat', label: 'Tax & VAT' }, { code: 'product-packaging', label: 'EPR & Packaging' }],
    eligibility: { can_start: true, reason: null },
  };
}
function partnerBillingPreview() {
  const leads = 3; const standard = leads * 14900; const discount = Math.round(standard * 0.1);
  return {
    ok: true, period: monat(0), currency: 'USD',
    subscription: { plan_code: 'growth', label: 'Growth', cadence: 'monthly', status: 'active', current_period_start: `${monat(0)}-01`, current_period_end: `${monat(1)}-01`, monthly_cents: 9900, annual_cents: 99000, category_allowance: 5, analytics_level: 'enhanced', api_eligible: false },
    discount: { pct: 10, count: 3, used: 3, remaining: 0, cycle_start: `${monat(0)}-01` },
    leads: { count: leads, standard_cents: standard, discount_cents: discount, final_cents: standard - discount },
    readiness: { ...READINESS },
    // Phase 5: ein Guthaben aus pb-4 (Nutzer kam nicht, keine Neubuchung in
    // der Frist): 30 % von 134,10 $ = 40,23 $, verrechnet bis zur Abo-Summe.
    credit_balance_cents: 4023,
    credit_applied_cents: 4023,
    credits: [{ id: uuid(51, 7), amount_cents: 4023, currency: 'USD', reason: 'user_no_rebook_30pct', booking_id: 'pb-4', created_at: iso(-3, 3) }],
    lines: [{ label: `Growth · monthly · ${monat(0)}`, qty: 1, unit_cents: 9900, amount_cents: 9900 }],
    total_cents: 9900 + standard - discount,
    total_after_credit_cents: 9900 + standard - discount - 4023,
    pricing: {
      plans: [
        { code: 'essential', label: 'Essential', monthly_cents: 5900, annual_cents: 59000, currency: 'USD', category_allowance: 1, lead_discount_pct: 0, lead_discount_count: 0 },
        { code: 'growth', label: 'Growth', monthly_cents: 9900, annual_cents: 99000, currency: 'USD', category_allowance: 5, lead_discount_pct: 10, lead_discount_count: 3 },
        { code: 'global', label: 'Global', monthly_cents: 18900, annual_cents: 189000, currency: 'USD', category_allowance: null, lead_discount_pct: 15, lead_discount_count: 6 },
      ],
      bands: [
        { band: 1, label: 'Focused', fee_cents: 9900, currency: 'USD' },
        { band: 2, label: 'Core', fee_cents: 14900, currency: 'USD' },
        { band: 3, label: 'Advanced', fee_cents: 29900, currency: 'USD' },
        { band: 4, label: 'Strategic', fee_cents: 49900, currency: 'USD' },
      ],
    },
  };
}

// Veraenderlich: Duplikate, Umbenennen und Archivieren wirken fuer die
// Laufzeit des Dev-Servers — sonst sieht man eine angelegte Kopie nie.
const SESSIONS: Array<Record<string, any>> = [
  { id: uuid(1, 1), label: 'EU-Expansion Shop', country: 'DE', markets: ['DE', 'IT', 'ES'], categories: ['tax-vat', 'product-packaging', 'data-privacy'], answers: { country: 'DE', markets: ['DE', 'IT', 'ES'], categories: ['tax-vat', 'product-packaging', 'data-privacy'], businessType: 'ecommerce', businessTypeNote: 'D2C e-commerce', marketScope: 'eu' }, status: 'active', risk_summary: { level: 'high' }, created_at: iso(-20), updated_at: iso(-2), open: 13, total: 14, severity: 'critical', by_severity: { critical: 2, high: 7, medium: 3, low: 1 } },
  { id: uuid(2, 1), label: 'UK nach Brexit', country: 'UK', markets: ['UK'], categories: ['tax-vat'], status: 'active', risk_summary: { level: 'high' }, created_at: iso(-9), updated_at: iso(-9), open: 6, total: 8, severity: 'high', by_severity: { critical: 0, high: 3, medium: 2, low: 1 } },
  { id: uuid(3, 1), label: null, country: 'ES', markets: ['ES'], categories: ['marketing-seo', 'legal-advisory'], status: 'active', risk_summary: { level: 'low' }, created_at: iso(-120), updated_at: iso(-100), open: 7, total: 9, severity: 'low', by_severity: { critical: 0, high: 0, medium: 0, low: 7 } },
  { id: uuid(4, 1), label: 'Archiv: Testlauf 2025', country: 'DE', markets: ['DE'], categories: ['tax-vat'], status: 'archived', risk_summary: { level: 'low' }, created_at: iso(-200), updated_at: iso(-190), open: 0, total: 5, severity: null, by_severity: { critical: 0, high: 0, medium: 0, low: 0 } },
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
  'schmidt-partner': ['tax-vat', 'product-packaging', 'data-privacy'],
  'madrid-tax': ['tax-vat'],
};
const DEFAULT_REQUEST = ['tax-vat', 'product-packaging', 'data-privacy'];
const BASIS = (matched: string[]) => ({ country: 'DE', country_covered: true, domains_requested: DEFAULT_REQUEST, domains_matched: matched });
// Die drei Anbieter der Suche. Titel und Beschreibung entstehen wie im
// Backend: der Buchstabe ist die Position in der Liste, die Beschreibung
// kommt aus freigegebenen Bereichen und Region (anonymity.ts).
const RANK = (verification: 'independent' | 'reviewed' | 'partial' | 'none', verified: number, required: number, hours: number | null, conf: number | null, rating: number | null, reviews: number | null) =>
  ({ verification, verified_count: verified, required_count: required, response_hours: hours, confirmation_rate: conf, rating, reviews_count: reviews });
// Preisspannen der Mock-Anbieter (Klasse anonymous, Spec A §27). madrid-tax
// hat keine — so ist "Pricing on request." lokal zu sehen.
const PRICE_RANGE: Record<string, { min: number | null; max: number | null; currency: string }> = {
  'studio-bianchi': { min: 180, max: 450, currency: 'EUR' },
  'schmidt-partner': { min: 290, max: 1600, currency: 'EUR' },
  'thames-vat': { min: 250, max: 900, currency: 'GBP' },
  'dahlmann-cpa': { min: 400, max: 2500, currency: 'USD' },
  'datenschutz-nord': { min: 1200, max: 2400, currency: 'EUR' },
  'costa-legal': { min: 600, max: 1800, currency: 'EUR' },
  'oss-experts': { min: 350, max: 900, currency: 'EUR' },
  'lucid-reg': { min: 600, max: 900, currency: 'EUR' },
};

const PROVIDERS = [
  { _key: 'studio-bianchi', public_ref: REF['studio-bianchi'], region: 'Norditalien', active_since: 2015, specializations: ['VAT & OSS', 'E-Commerce', 'EU-weit'], languages: ['IT', 'DE', 'EN'], rating: 4.7, completed_count: 210, avg_response_hours: 3, billing_model: 'project', is_verified: true, match: 100, match_tier: 'high', match_basis: BASIS(['tax-vat', 'product-packaging', 'data-privacy']), rank_basis: RANK('independent', 5, 5, 3, 0.97, 4.7, 3) },
  { _key: 'schmidt-partner', public_ref: REF['schmidt-partner'], region: 'Norddeutschland', active_since: 2013, specializations: ['OSS/IOSS', 'Cross-border Tax'], languages: ['DE', 'EN'], rating: 4.7, completed_count: 96, avg_response_hours: 5, billing_model: 'abo', is_verified: true, match: 87, match_tier: 'strong', match_basis: BASIS(['tax-vat', 'product-packaging']), rank_basis: RANK('independent', 4, 4, 5, 0.92, 4.7, 3) },
  { _key: 'madrid-tax', public_ref: REF['madrid-tax'], region: 'Spanien', active_since: 2020, specializations: ['Iberian VAT', 'Marketplace'], languages: ['ES', 'EN'], rating: 4.5, completed_count: 41, avg_response_hours: 8, billing_model: 'hourly', is_verified: true, match: 73, match_tier: 'moderate', match_basis: BASIS(['tax-vat']), rank_basis: RANK('partial', 3, 4, 8, 0.91, null, 0) },
];
const LETTER = (i: number) => String.fromCharCode(65 + i);
const titled = (p: (typeof PROVIDERS)[number], i: number) => {
  const { _key, ...pub } = p;
  return { ...pub, title: `Verified Provider ${LETTER(i)}`, letter: LETTER(i), descriptor: DESCRIPTOR[_key], area_codes: AREAS[_key] ?? [], descriptor_region: REGION[_key] ?? null };
};

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
  const req = (body ?? {}) as { domains?: unknown; categories?: unknown; country?: unknown; structured_answers?: { markets?: unknown } };
  const asked = Array.isArray(req.domains) && req.domains.length ? req.domains
    : Array.isArray(req.categories) && req.categories.length ? req.categories
    : null;
  const requested = (asked as string[] | null) ?? DEFAULT_REQUEST;
  const country = typeof req.country === 'string' && req.country ? req.country.toUpperCase() : 'DE';
  const marketsAsked = Array.isArray(req.structured_answers?.markets) ? (req.structured_answers.markets as string[]).map((m) => String(m).toUpperCase()) : [];
  const knownMarkets = [...new Set([country, ...marketsAsked])].filter((c) => isKnownCountry(c));
  const providers = PROVIDERS.map((p, i) => {
    const covers = COVERS[p._key] ?? [];
    return {
      ...titled(p, i),
      // Wie der Server (searchCoverage.ts): Spanne ueber die angefragten
      // Bereiche, Maerkte aus der Freigabe.
      price_range: PRICE_RANGE[p._key] ?? null,
      markets_covered: knownMarkets.filter((m) => (PROVIDER_DETAIL[p._key]?.markets ?? []).includes(m)),
      match_basis: {
        country,
        country_covered: (PROVIDER_DETAIL[p._key]?.markets ?? []).includes(country),
        domains_requested: requested,
        domains_matched: requested.filter((d) => covers.includes(d)),
      },
    };
  });
  // Wie der Server (index.ts, /search): ohne einen einzigen Markt mit
  // Laenderprofil keine Pflichten, statt still deutsche Gesetze zu zeigen. So
  // ist der Zustand marketUnavailable lokal erreichbar (Wizard: nur Brasilien).
  const markets = Array.isArray(req.structured_answers?.markets) ? (req.structured_answers.markets as string[]) : [];
  const anyKnown = [country, ...markets].some((c) => isKnownCountry(String(c).toUpperCase()));
  const covered: Record<string, string[]> = {};
  for (const m of knownMarkets) covered[m] = requested.filter((a) => PROVIDERS.some((p) => (COVERS[p._key] ?? []).includes(a) && (PROVIDER_DETAIL[p._key]?.markets ?? []).includes(m)));
  return { ok: true, providers, laws: anyKnown ? LAWS : [], coverage: { markets: knownMarkets, areas: requested, covered } };
}

type MockDetail = {
  markets: string[];
  pricing_table: Array<{ service: string; price: string }> | null;
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
    markets: ['IT', 'DE', 'AT'],
    pricing_table: [
      { service: 'USt-Erstregistrierung Italien (Partita IVA)', price: 'ab 450 € · einmalig' },
      { service: 'Laufende OSS-Betreuung', price: '180 € / Quartal' },
      { service: 'Fachberatung (Stundensatz)', price: '140 € / Std.' },
      { service: 'Komplettpaket E-Commerce-Setup', price: 'auf Anfrage' },
    ],
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
    markets: ['DE', 'AT'],
    pricing_table: [
      { service: 'OSS/IOSS-Registrierung', price: 'im Abo enthalten' },
      { service: 'Compliance-Abo (bis 3 Märkte)', price: '290 € / Monat' },
      { service: 'Jeder weitere Markt', price: '60 € / Monat' },
    ],
    work_mode: 'remote · Portal',
    services: [
      { title: 'OSS/IOSS-Registrierung', includes: ['Anmeldung beim BZSt', 'Erste Quartalsmeldung', 'Fristenüberwachung'] },
      { title: 'Laufende USt-Betreuung EU', includes: ['Voranmeldungen DE', 'Reverse Charge', 'Intrastat ab Schwelle'] },
      { title: 'EPR & Verpackung', includes: ['LUCID-Registrierung', 'Systembeteiligung', 'Mengenmeldung'] },
      { title: 'Datenschutz für Shops', includes: ['Cookie-Banner & Einwilligung', 'AV-Verträge', 'DSFA'] },
    ],
    credentials: [
      { label: 'Steuerberater-Zulassung (DE)', note: 'seit 2013 · Kammer geprüft' },
      { label: 'Fachberater Internationales Steuerrecht', note: 'Titel verifiziert' },
      { label: 'Kanzlei mit ISO 27001', note: 'Zertifikat 2025 vorgelegt' },
      { label: 'DATEV · Amazon SPN gelistet', note: 'Plattform-Nachweise' },
    ],
    excluded_services: ['Zoll', 'Markenrecht'],
  },
  // Dossier bewusst leer — der Leerfall der Karten.
  'madrid-tax': {
    markets: ['ES', 'PT'],
    pricing_table: null,
    work_mode: null,
    services: null,
    credentials: null,
    excluded_services: null,
  },
};
// /p/:ref/detail — ohne Buchstaben (den kennt nur die Liste), mit
// Beschreibung, Maerkten und rank_basis; unbekannter Ref → 404.
function providerDetail(ref: string) {
  const key = keyOfRef(ref);
  const p = PROVIDERS.find((x) => x._key === key);
  const d = key ? PROVIDER_DETAIL[key] : undefined;
  if (!p || !d || !key) return { __status: 404, errorCode: 'NOT_FOUND', message: 'Provider not found' };
  const { match, match_tier, match_basis, _key, ...anon } = p;
  void match; void match_tier; void match_basis; void _key;
  // bookable_chargeable: der Server berechnet es aus dem laufenden Tarif
  // (TKT-PROV-06). Im Mock sind ALLE drei buchbar, und das mit Absicht: von den
  // Anbietern mit Detailseite ist 'madrid-tax' der einzige ohne Termin, also
  // genau der, den man anklickt, um die Buchung zu sehen (siehe Kommentar an
  // den Mock-Buchungen). Ihn zu sperren nimmt dem Datensatz seinen Zweck.
  // Wer den Fall "kein Buchen-Knopf" lokal sehen will, setzt hier einmal
  // `false` — abgesichert ist er durch die Waechter in
  // ProviderDetailPage.guard.test.ts.
  // D V2: nur Freigegebenes wird angekuendigt — die EPR-Anpassung zum Jahreswechsel.
  const planned_prices = key === PARTNER_KEY ? [{ service_name: 'EPR & Verpackung', effective_at: NEW_YEAR, currency: 'EUR', price_min: 600, price_max: 950 }] : [];
  // A1 (Schritt 4): wer gebucht hat, sieht den Anbieter offen — wie der Server.
  const revealed = bookings().some((b) => b.public_ref === ref && b.identity_revealed);
  const id = revealed ? PROVIDER_IDENTITY[key] : undefined;
  const open = id ? { revealed: true, name: id.name, website_url: id.website_url, contact_email: id.contact_email } : { revealed: false };
  return { ok: true, detail: { ...anon, descriptor: DESCRIPTOR[key], area_codes: AREAS[key] ?? [], descriptor_region: REGION[key] ?? null, ...d, planned_prices, availability: 'available', bookable_chargeable: true, ...open }, detail_open_charged: false };
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
    { rating: 4, body: 'Stark bei USt und Verpackung, für den Zoll mussten wir woanders hin — sagen sie aber selbst offen.', categories: ['Fachlich'], daysAgo: 190 },
  ],
  'madrid-tax': [],
};
function providerReviews(ref: string) {
  const key = keyOfRef(ref);
  const list = key ? PROVIDER_REVIEWS[key] : undefined;
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

// Phase 4: der Text, den der Nutzer vor der Buchung bestaetigt — eine Fassung,
// vier Sprachen, dieselben Absaetze wie die Migration booking_charge.
const ACK_VERSION = 'booking-ack-v1';
const ACK_BODY: Record<string, string> = {
  en: 'With this booking, the provider\'s name and contact details become visible to you, and the provider receives your company name, your e-mail address and your message.\n\nThe provider may contact you about this request — including scheduling, a proposal and reasonable follow-up — even if you cancel, do not attend or stop responding. Marketing on other topics requires your separate permission.\n\nYou receive a 10 % discount on the provider\'s professional fees for this request because you booked through CompliHub360. The booking itself costs you nothing.',
  de: 'Mit dieser Buchung werden Name und Kontakt des Anbieters für Sie sichtbar; der Anbieter erhält Ihren Firmennamen, Ihre E-Mail-Adresse und Ihre Nachricht.\n\nDer Anbieter darf Sie zu diesem Anliegen kontaktieren — zu Terminen, einem Angebot und angemessenen Rückfragen — auch wenn Sie absagen, nicht erscheinen oder nicht mehr antworten. Werbung zu anderen Themen braucht Ihre gesonderte Erlaubnis.\n\nSie erhalten 10 % Rabatt auf das Honorar des Anbieters für dieses Anliegen, weil Sie über CompliHub360 buchen. Die Buchung selbst kostet Sie nichts.',
  es: 'Con esta reserva, el nombre y los datos de contacto del proveedor pasan a ser visibles para usted, y el proveedor recibe el nombre de su empresa, su dirección de correo electrónico y su mensaje.\n\nEl proveedor puede contactarle sobre esta solicitud — citas, una propuesta y consultas razonables — aunque usted cancele, no asista o deje de responder. La publicidad sobre otros temas requiere su permiso por separado.\n\nUsted recibe un 10 % de descuento sobre los honorarios del proveedor para esta solicitud porque reserva a través de CompliHub360. La reserva en sí no le cuesta nada.',
  tr: 'Bu rezervasyonla sağlayıcının adı ve iletişim bilgileri sizin için görünür olur; sağlayıcı şirket adınızı, e-posta adresinizi ve mesajınızı alır.\n\nSağlayıcı bu talep hakkında sizinle iletişime geçebilir — randevular, bir teklif ve makul takip soruları dahil — iptal etseniz, katılmasanız veya yanıt vermeyi kesseniz bile. Başka konulardaki reklamlar için ayrı izniniz gerekir.\n\nCompliHub360 üzerinden rezervasyon yaptığınız için bu talep için sağlayıcının ücretlerinde % 10 indirim alırsınız. Rezervasyonun kendisi size hiçbir şey maliyet getirmez.',
};
/** Die Demo-Firma wie in der Shell; die Adresse ist eine Beispieladresse. */
const DEMO_SHARED_PREVIEW = { email: 'alex.weber@acme.example', company_name: 'Acme GmbH' };

function acknowledgement(lang: string) {
  const l = ACK_BODY[lang] ? lang : 'en';
  return { ok: true, version: ACK_VERSION, language: l, body: ACK_BODY[l], shared_fields: ['email', 'company_name', 'message'], user_discount: { pct: 10, policy_version: 1, recurring_treatment: 'undecided' },
    // B1 (Schritt 4): wie der Server mit Login — die Werte, die die Buchung festhaelt.
    shared_preview: DEMO_SHARED_PREVIEW };
}

// POST /scheduling — die Buchung ist der bezahlte Lead UND der Moment, in dem
// beide Seiten Namen und Kontakt bekommen. Seit Phase 4 nur mit der Fassung
// der Bestaetigung; die 15:30-Termine spielen den Fall durch, dass die Karte
// des Anbieters nicht belastet werden kann (409 ohne Buchung, Canvas 2A).
function createBooking(body: unknown) {
  const d = (body ?? {}) as { public_ref?: unknown; slot_start?: unknown; message?: unknown; acknowledgement_version?: unknown; area_code?: unknown; countries?: unknown };
  const ref = typeof d.public_ref === 'string' ? d.public_ref : '';
  const key = keyOfRef(ref);
  const slot = typeof d.slot_start === 'string' ? d.slot_start : '';
  const identity = key ? PROVIDER_IDENTITY[key] : undefined;
  if (!ref || !slot || !identity) {
    return { __status: 400, errorCode: 'VALIDATION_ERROR', message: 'public_ref and slot_start required' };
  }
  if (typeof d.acknowledgement_version !== 'string' || !d.acknowledgement_version) {
    return { __status: 400, errorCode: 'VALIDATION_ERROR', message: 'acknowledgement_version required' };
  }
  if (d.acknowledgement_version !== ACK_VERSION) {
    return { __status: 409, errorCode: 'ACKNOWLEDGEMENT_OUTDATED', message: 'The booking acknowledgement has changed — please read it again', current_version: ACK_VERSION };
  }
  const at = new Date(slot);
  if (at.getHours() === 15 && at.getMinutes() === 30) {
    return { __status: 409, errorCode: 'BOOKING_NOT_COMPLETED', message: 'The booking could not be completed. This is not on your side — the provider has been informed.', reason: 'provider_billing' };
  }
  const end = new Date(at.getTime() + 30 * 60 * 1000).toISOString();
  const mockTopic = { area_code: typeof d.area_code === 'string' && d.area_code ? d.area_code : 'tax-vat', countries: Array.isArray(d.countries) && d.countries.length ? (d.countries as string[]) : ['DE'] };
  return {
    ok: true,
    booking: { id: `m0ck-new-${ref}`, public_ref: ref, slot_start: slot, slot_end: end, status: 'confirmed', acknowledgement_version: ACK_VERSION, shared_fields: ['email', 'company_name', 'message'], user_discount: { pct: 10, policy_version: 1 },
      // Wie der Server: das Thema des Leads (deriveOpportunity, vereinfacht).
      topic: mockTopic,
      // B1: was geteilt wurde, Wert fuer Wert.
      shared_snapshot: { ...DEMO_SHARED_PREVIEW, message: typeof d.message === 'string' && d.message.trim() ? d.message.trim() : null, topic: mockTopic } },
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
    sessions: { total: aktive.length, items: aktive.map(({ id, label, country, markets, categories, open, total, severity, by_severity, created_at, updated_at }) => ({ id, label, country, markets: [...new Set([country, ...(markets ?? [])].filter(Boolean))], categories, open, total, severity, by_severity, created_at, updated_at })) },
    obligations: {
      // Summe der Sitzungen: EU-Expansion 13 (2 krit., 7 hoch, 3 mittel, 1 niedr.),
      // UK 6 (3/2/1), ES 7 (alle niedrig). Maerkte ueberlappen (eine EU-Pflicht
      // zaehlt in DE, IT und ES), Bereiche nicht.
      open: 26, by_severity: { critical: 2, high: 10, medium: 5, low: 9 },
      by_market: { DE: 9, IT: 5, ES: 11, UK: 6 }, by_market_high: { DE: 6, IT: 4, ES: 2, UK: 3 },
      by_domain: { 'tax-vat': 11, 'product-packaging': 5, 'data-privacy': 3, 'marketing-seo': 4, 'legal-advisory': 3 },
      by_domain_high: { 'tax-vat': 7, 'product-packaging': 4, 'data-privacy': 1, 'marketing-seo': 0, 'legal-advisory': 0 },
    },
  };
}

function notifications() {
  const n = (i: number, type: string, subject: string, subjectId: string, payload: Record<string, unknown>, hoursAgo: number, read: boolean) =>
    ({ id: uuid(i, 4), type, subject, subject_id: subjectId, payload, created_at: plus(-hoursAgo * H), read_at: read ? plus(-(hoursAgo - 1) * H) : null });
  return [
    n(1, 'provider_replied', 'engagement', rid(2), { providerRef: REF['thames-vat'], providerName: 'Verified VAT specialist · United Kingdom' }, 2, false),
    n(2, 'provider_confirmed', 'engagement', rid(8), { providerRef: REF['studio-bianchi'], providerName: 'Verified tax firm · Northern Italy' }, 5, false),
    n(3, 'booking_rescheduled', 'booking', 'm0ck-b02', { providerName: 'Schmidt & Partner Steuerberatungsgesellschaft mbH', from: iso(1, 11), to: iso(1, 9) }, 9, false),
    n(4, 'provider_declined', 'engagement', rid(10), { providerRef: REF['madrid-tax'], providerName: 'Verified tax specialist · Spain' }, 30, true),
    n(5, 'booking_cancelled', 'booking', 'm0ck-b10', { providerName: 'Thames VAT Partners LLP', from: iso(-17, 16) }, 60, true),
    n(6, 'provider_replied', 'engagement', rid(1), { providerRef: REF['schmidt-partner'], providerName: 'Verified tax advisory · Northern Germany' }, 70, true),
  ];
}

// Partner-Post (Canvas A V2 · B V1): was der Server an `provider_members`
// schreibt. `needs_action` folgt der Demo-Lage — die Lead-Belastung ist
// gescheitert (READINESS), die Rechnung offen.
function partnerNotifications() {
  const n = (i: number, type: string, payload: Record<string, unknown>, hoursAgo: number, read: boolean, needs = false) =>
    ({ id: uuid(i, 5), type, subject: type.startsWith('booking') || type === 'appointment_reminder' ? 'booking' : 'provider', subject_id: PARTNER_KEY, payload, created_at: plus(-hoursAgo * H), read_at: read ? plus(-(hoursAgo - 1) * H) : null, needs_action: needs });
  return [
    n(1, 'booking_created', { providerKey: PARTNER_KEY, slot: iso(2, 11) }, 0.05, false),
    n(2, 'payment_failed', { providerKey: PARTNER_KEY }, 1, false, READINESS.reasons.includes('payment_failed')),
    n(3, 'invoice_retry_scheduled', { providerKey: PARTNER_KEY, label: 'INV-2026-009', deadline: iso(7).slice(0, 10) }, 2, false, true),
    n(4, 'appointment_reminder', { providerKey: PARTNER_KEY, slot: iso(1, 12), offset: '1440' }, 26, true),
    n(5, 'evidence_expiring', { providerKey: PARTNER_KEY, label: 'insurance', to: iso(23).slice(0, 10) }, 30, true),
    n(6, 'subscription_scheduled', { providerKey: PARTNER_KEY, effectiveOn: iso(25).slice(0, 10) }, 31, true),
    n(7, 'credit_issued', { providerKey: PARTNER_KEY, amount: '4470' }, 75, true),
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
  const e = [...requests(), ...partnerRequests()].find((r) => r.id === id) ?? requests()[0];
  return { ok: true, engagement: e, messages: [
    { id: 'm1', author: 'user', body: e.message, created_at: e.created_at },
    { id: 'm2', author: 'system', body: 'Anfrage zugestellt — der Anbieter hat 24 Stunden zur Bestätigung.', created_at: e.created_at },
    ...(['confirmed', 'replied'].includes(e.status) ? [{ id: 'm3', author: 'system', body: 'Der Anbieter hat bestätigt. Identität und Kontakt sind jetzt freigeschaltet.', created_at: plus(-20 * H) }] : []),
    ...(e.status === 'replied' ? [{ id: 'm4', author: 'provider', ...(e.category === 'product-packaging'
      ? { body: 'Vielen Dank für Ihre Anfrage. Wir übernehmen die LUCID-Registrierung und die Mengenmeldung; Vorschlag anbei.', proposal: { price_range: '600–900 €', timeline: '2–3 Wochen', deliverables: ['LUCID-Registrierung', 'Systembeteiligung', 'Erstberatung 60 min'], engagement_model: 'Projektbasiert' } }
      : { body: 'Vielen Dank für Ihre Anfrage. Wir übernehmen die Registrierung und die ersten Meldungen; Vorschlag anbei.', proposal: { price_range: '900–1.400 €', timeline: '3–4 Wochen', deliverables: ['USt-Registrierung', 'Erste Voranmeldung', 'Erstberatung 60 min'], engagement_model: 'Projektbasiert' } }), created_at: plus(-6 * H) }] : []),
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


// ─── Phase 2 · Onboarding und Verifikation ───────────────────────────────────
// Ein Anbieter mitten in der Pruefung (Rueckfrage offen), damit Dossier,
// Verification Center, Queue und Reviewer-Pruefung alle Zustaende zeigen.
const SVC_PRIVACY = uuid(1, 7); const SVC_VAT = uuid(2, 7);
const COV = { privDe: uuid(11, 7), privAt: uuid(12, 7), vatDe: uuid(13, 7), vatAt: uuid(14, 7) };
const EV = { incorporation: uuid(21, 7), vat: uuid(22, 7), insurance: uuid(23, 7), licenceDe: uuid(24, 7) };
const REQ_AT = uuid(31, 7);

function p2Services() {
  return [
    { id: SVC_PRIVACY, service_code: 'data-privacy.notices', service_name: 'Datenschutz-Paket', description: 'Datenschutzerklärung, Cookie-Banner, AV-Verträge für Online-Shops.', pricing_model: 'project', price_min: 1200, price_max: 2400, currency: 'EUR', pricing_basis: 'je Paket', response_time_hours: 48, completion_days_estimate: 10, capacity_status: 'open', status: 'limited',
      coverage: [
        { id: COV.privDe, service_id: SVC_PRIVACY, country_code: 'DE', jurisdiction_code: null, status: 'approved', limitations: null, approved_at: iso(-1, 14, 5), expires_at: null },
        { id: COV.privAt, service_id: SVC_PRIVACY, country_code: 'AT', jurisdiction_code: null, status: 'pending', limitations: null, approved_at: null, expires_at: null },
      ] },
    { id: SVC_VAT, service_code: 'tax-vat.returns', service_name: 'USt-Voranmeldungen', description: null, pricing_model: 'project', price_min: 350, price_max: 900, currency: 'EUR', pricing_basis: 'je Quartal', response_time_hours: 24, completion_days_estimate: 5, capacity_status: 'open', status: 'pending_verification',
      coverage: [
        { id: COV.vatDe, service_id: SVC_VAT, country_code: 'DE', jurisdiction_code: null, status: 'rejected', limitations: 'Die vorgelegte Zulassung gilt für Wirtschaftsprüfung, nicht Steuerberatung.', approved_at: null, expires_at: null },
        { id: COV.vatAt, service_id: SVC_VAT, country_code: 'AT', jurisdiction_code: null, status: 'pending', limitations: null, approved_at: null, expires_at: null },
      ] },
  ];
}
function p2Checklist() {
  return [
    { type: 'incorporation', source: 'document', service_code: null, country_code: null, required_for_submit: true, state: 'reviewed', evidence_id: EV.incorporation },
    { type: 'vat_id', source: 'registry_check', service_code: null, country_code: null, required_for_submit: true, state: 'reviewed', evidence_id: EV.vat },
    { type: 'insurance', source: 'document', service_code: null, country_code: null, required_for_submit: true, state: 'received', evidence_id: EV.insurance },
    { type: 'representative_identity', source: 'registry_check', service_code: null, country_code: null, required_for_submit: false, state: 'missing', evidence_id: null },
    { type: 'professional_licence', source: 'document', service_code: 'tax-vat', country_code: 'DE', required_for_submit: false, state: 'rejected', evidence_id: EV.licenceDe },
    { type: 'professional_licence', source: 'document', service_code: 'tax-vat', country_code: 'AT', required_for_submit: false, state: 'missing', evidence_id: null },
  ];
}
function p2Evidence(admin = false) {
  const rows = [
    { id: EV.incorporation, evidence_type: 'incorporation', source: 'document', result: 'reviewed', original_name: 'HR-Auszug-2026.pdf', size_bytes: 1_240_000, upload_confirmed: true, uploaded_at: iso(-2, 16, 10), identifier: 'HRB 4711', expires_at: null, supports_countries: [], supports_service_codes: [], reviewer_notes: 'Auszug aktuell, Firma stimmt.', reviewed_at: iso(-1, 14, 0) },
    { id: EV.vat, evidence_type: 'vat_id', source: 'registry_check', result: 'independently_verified', original_name: null, size_bytes: null, upload_confirmed: true, uploaded_at: null, identifier: 'DE123456789', expires_at: null, supports_countries: [], supports_service_codes: [], reviewer_notes: 'VIES valid', reviewed_at: iso(-2, 16, 20) },
    { id: EV.insurance, evidence_type: 'insurance', source: 'document', result: 'received', original_name: 'Police-2027.pdf', size_bytes: 640_000, upload_confirmed: true, uploaded_at: iso(-2, 16, 30), identifier: null, expires_at: '2027-03-31', supports_countries: [], supports_service_codes: [], reviewer_notes: null, reviewed_at: null },
    { id: EV.licenceDe, evidence_type: 'professional_licence', source: 'document', result: 'rejected', original_name: 'Zulassung-WP.pdf', size_bytes: 210_000, upload_confirmed: true, uploaded_at: iso(-2, 17, 0), identifier: null, expires_at: null, supports_countries: ['DE'], supports_service_codes: ['tax-vat'], reviewer_notes: 'Die Zulassung gilt für Wirtschaftsprüfung, nicht Steuerberatung.', reviewed_at: iso(-1, 14, 2) },
  ];
  return rows.map((r) => admin
    ? { ...r, issuing_authority: null, covered_entity: 'Neue Kanzlei GmbH', registry_reference: r.source === 'registry_check' ? 'vies:DE:2026-09-21' : null, download_url: r.source === 'document' ? `https://storage.mock/signed/${r.original_name}?token=mock` : null, download_expires_in_sec: r.source === 'document' ? 600 : null }
    : (({ reviewer_notes: _n, reviewed_at: _r, ...rest }) => rest)(r));
}
function p2Requests() {
  return [{ id: REQ_AT, evidence_type: 'professional_licence', service_id: SVC_VAT, country_code: 'AT', message: 'Bitte die Zulassung zur Steuerberatung für Österreich nachreichen (Kammerbescheid oder Registerauszug).', status: 'open', requested_at: iso(-1, 14, 12) }];
}
function p2Agreements() {
  return [
    { agreement_type: 'provider_agreement', version: '2026-09', language: 'de', accepted_at: iso(-2, 15, 0), accepted_by_name: 'Anna Beispiel' },
    { agreement_type: 'privacy_notice', version: '2026-09', language: 'de', accepted_at: iso(-2, 15, 1), accepted_by_name: 'Anna Beispiel' },
    { agreement_type: 'billing_authorization', version: '2026-09', language: 'de', accepted_at: iso(-2, 15, 2), accepted_by_name: 'Anna Beispiel' },
  ];
}
function p2History() {
  const h = (n: number, subject: string, action: string, from: string | null, to: string | null, reason: string | null, actor: string, when: string) => ({ id: uuid(40 + n, 7), subject, subject_id: null, action, from, to, reason, actor_kind: actor, created_at: when });
  return [
    h(1, 'request', 'requested', null, 'professional_licence:AT', 'Bitte die Zulassung zur Steuerberatung für Österreich nachreichen.', 'reviewer', iso(-1, 14, 12)),
    h(2, 'lifecycle', 'request_info', 'under_verification', 'more_info_required', 'Zulassung AT fehlt', 'reviewer', iso(-1, 14, 12)),
    h(3, 'coverage', 'approve', 'pending', 'approved', null, 'reviewer', iso(-1, 14, 5)),
    h(4, 'coverage', 'reject', 'pending', 'rejected', 'Die vorgelegte Zulassung gilt für Wirtschaftsprüfung, nicht Steuerberatung.', 'reviewer', iso(-1, 14, 2)),
    h(5, 'lifecycle', 'transition', 'submitted', 'under_verification', null, 'reviewer', iso(-1, 13, 40)),
    h(6, 'lifecycle', 'submitted', 'draft', 'submitted', null, 'provider', iso(-1, 9, 40)),
    h(7, 'evidence', 'registry_check', null, 'independently_verified', 'VIES valid', 'provider', iso(-2, 16, 20)),
  ];
}
function p2Provider() {
  return { provider_key: 'dahlmann-cpa', name: 'Neue Kanzlei GmbH', website_url: 'https://neue-kanzlei.de', contact_email: 'verifizierung@neue-kanzlei.de', languages: ['de', 'en'], region: 'Hamburg', active_since: 2015, vat_id: 'DE123456789', vat_id_status: 'valid', vat_id_checked_at: iso(-2, 16, 20), billing_country: 'DE', work_mode: null, lifecycle_status: 'more_info_required', lifecycle_status_since: iso(-1, 14, 12), lifecycle_status_reason: 'Zulassung AT fehlt', billing_ready: false, billing_block_reasons: ['no_payment_method'] };
}
function p2Confidential() {
  return { entity_type: 'GmbH', registration_number: 'HRB 4711 · Amtsgericht Hamburg', registered_address: 'Beispielweg 1, 20095 Hamburg', operating_address: null, tax_number: null, representative_name: 'Anna Beispiel', representative_title: 'Geschäftsführerin', insurance_provider: 'HDI', insurance_type: 'Berufshaftpflicht', insurance_valid_until: '2027-03-31' };
}
// Schmidt & Partner ist AKTIV: Dossier vollstaendig, alle Nachweise geprueft,
// Abdeckung genehmigt (Oesterreich-EPR noch in Pruefung). Die jaehrliche
// Re-Verifizierung steht in zehn Tagen an — dieselbe Zeile, die die
// Admin-Queue als "reverification_due" fuehrt.
const SP = { vat: uuid(61, 8), epr: uuid(62, 8), priv: uuid(63, 8), ev1: uuid(71, 8), ev2: uuid(72, 8), ev3: uuid(73, 8), ev4: uuid(74, 8), ev5: uuid(75, 8) };
function spProvider() {
  return { provider_key: PARTNER_KEY, name: 'Schmidt & Partner Steuerberatungsgesellschaft mbH', website_url: 'https://schmidt-partner.example', contact_email: 'kanzlei@schmidt-partner.example', languages: ['de', 'en'], region: 'Hamburg', active_since: 2013, vat_id: 'DE287654321', vat_id_status: 'valid', vat_id_checked_at: iso(-60, 9, 0), billing_country: 'DE', work_mode: 'remote · Portal', lifecycle_status: 'active', lifecycle_status_since: iso(-355, 10, 0), lifecycle_status_reason: null,
    // Dieselbe Zahlungsbereitschaft wie die Abrechnungsvorschau — sonst meldet
    // die Bereitschafts-Liste (B3) ein Zahlungsmittel, das /billing sperrt.
    billing_ready: READINESS.ready, billing_block_reasons: [...READINESS.reasons] };
}
function spServices() {
  const cov = (id: string, svc: string, cc: string, status: string, days: number | null) => ({ id, service_id: svc, country_code: cc, jurisdiction_code: null, status, limitations: null, approved_at: days === null ? null : iso(days, 11, 0), expires_at: null });
  return [
    { id: SP.vat, service_code: 'tax-vat.returns', service_name: 'USt & OSS-Betreuung', description: 'Registrierung, Voranmeldungen und OSS-Quartalsmeldungen für Online-Händler.', pricing_model: 'subscription', price_min: 290, price_max: 290, currency: 'EUR', pricing_basis: 'je Monat (bis 3 Märkte)', response_time_hours: 24, completion_days_estimate: 5, capacity_status: 'open', status: 'approved',
      coverage: [cov(uuid(81, 8), SP.vat, 'DE', 'approved', -355), cov(uuid(82, 8), SP.vat, 'AT', 'approved', -200)] },
    { id: SP.epr, service_code: 'product-packaging.registration', service_name: 'EPR & Verpackung', description: 'LUCID-Registrierung, Systembeteiligung und Mengenmeldung.', pricing_model: 'project', price_min: 600, price_max: 900, currency: 'EUR', pricing_basis: 'je Projekt', response_time_hours: 24, completion_days_estimate: 14, capacity_status: 'open', status: 'approved',
      coverage: [cov(uuid(83, 8), SP.epr, 'DE', 'approved', -300), cov(uuid(84, 8), SP.epr, 'AT', 'pending', null)] },
    { id: SP.priv, service_code: 'data-privacy.notices', service_name: 'Datenschutz für Shops', description: 'Cookie-Banner, Einwilligungsnachweise, AV-Verträge und DSFA.', pricing_model: 'project', price_min: 1200, price_max: 2400, currency: 'EUR', pricing_basis: 'je Paket', response_time_hours: 48, completion_days_estimate: 10, capacity_status: 'open', status: 'approved',
      coverage: [cov(uuid(85, 8), SP.priv, 'DE', 'approved', -120)] },
  ];
}
function spChecklist() {
  return [
    { type: 'incorporation', source: 'document', service_code: null, country_code: null, required_for_submit: true, state: 'reviewed', evidence_id: SP.ev1 },
    { type: 'vat_id', source: 'registry_check', service_code: null, country_code: null, required_for_submit: true, state: 'reviewed', evidence_id: SP.ev2 },
    { type: 'insurance', source: 'document', service_code: null, country_code: null, required_for_submit: true, state: 'reviewed', evidence_id: SP.ev3 },
    { type: 'representative_identity', source: 'registry_check', service_code: null, country_code: null, required_for_submit: false, state: 'reviewed', evidence_id: SP.ev4 },
    { type: 'professional_licence', source: 'document', service_code: 'tax-vat', country_code: 'DE', required_for_submit: false, state: 'reviewed', evidence_id: SP.ev5 },
  ];
}
function spEvidence() {
  const e = (id: string, type: string, source: string, result: string, name: string | null, identifier: string | null, days: number, expires: string | null, countries: string[] = [], services: string[] = []) =>
    ({ id, evidence_type: type, source, result, original_name: name, size_bytes: name ? 480_000 : null, upload_confirmed: true, uploaded_at: iso(days, 10, 0), identifier, expires_at: expires, supports_countries: countries, supports_service_codes: services });
  return [
    e(SP.ev1, 'incorporation', 'document', 'reviewed', 'Handelsregister-Auszug.pdf', 'HRB 128844', -360, null),
    e(SP.ev2, 'vat_id', 'registry_check', 'independently_verified', null, 'DE287654321', -60, null),
    e(SP.ev3, 'insurance', 'document', 'reviewed', 'Berufshaftpflicht-2027.pdf', null, -40, '2027-06-30'),
    e(SP.ev4, 'representative_identity', 'registry_check', 'independently_verified', null, null, -360, null),
    e(SP.ev5, 'professional_licence', 'document', 'reviewed', 'Bestellungsurkunde-StB.pdf', null, -360, null, ['DE'], ['tax-vat']),
  ];
}
function spAgreements() {
  return ['provider_agreement', 'privacy_notice', 'billing_authorization'].map((t, i) => ({ agreement_type: t, version: '2026-09', language: 'de', accepted_at: iso(-20, 9, i), accepted_by_name: 'Katrin Schmidt' }));
}
function spHistory() {
  const h = (n: number, subject: string, action: string, from: string | null, to: string | null, reason: string | null, actor: string, when: string) => ({ id: uuid(90 + n, 8), subject, subject_id: null, action, from, to, reason, actor_kind: actor, created_at: when });
  return [
    h(1, 'coverage', 'submitted', null, 'pending', 'EPR & Verpackung · AT', 'provider', iso(-3, 10, 0)),
    h(2, 'coverage', 'approve', 'pending', 'approved', null, 'reviewer', iso(-120, 11, 0)),
    h(3, 'lifecycle', 'transition', 'under_verification', 'active', null, 'reviewer', iso(-355, 10, 0)),
    h(4, 'lifecycle', 'transition', 'submitted', 'under_verification', null, 'reviewer', iso(-358, 9, 0)),
    h(5, 'lifecycle', 'submitted', 'draft', 'submitted', null, 'provider', iso(-360, 16, 0)),
  ];
}
function spMatrix() {
  return spServices().map((sv) => ({ service_id: sv.id, service_code: sv.service_code, service_name: sv.service_name, status: sv.status, cells: sv.coverage.map((c) => ({ coverage_id: c.id, country_code: c.country_code, jurisdiction_code: c.jurisdiction_code, status: c.status, limitations: c.limitations, approved_at: c.approved_at, expires_at: c.expires_at })) }));
}
function spConfidential() {
  return { entity_type: 'GmbH', registration_number: 'HRB 128844 · Amtsgericht Hamburg', registered_address: 'Große Elbstraße 14, 22767 Hamburg', operating_address: null, tax_number: null, representative_name: 'Katrin Schmidt', representative_title: 'Geschäftsführende Partnerin', insurance_provider: 'HDI', insurance_type: 'Berufshaftpflicht', insurance_valid_until: '2027-06-30' };
}
function p2Application(key?: string) {
  if (key === PARTNER_KEY) {
    const done = { complete: true, missing: [] as string[] };
    return { ok: true, provider: spProvider(), confidential: spConfidential(),
      chapters: { account: done, legal: done, services: done, evidence: done, agreements: done, submit: { ready: false, missing: [] } },
      services: spServices(), checklist: spChecklist(), evidence: spEvidence(), agreements: spAgreements(), open_requests: [] };
  }
  const missing = ['evidence.insurance'];
  return { ok: true, provider: p2Provider(), confidential: p2Confidential(),
    chapters: { account: { complete: true, missing: [] }, legal: { complete: true, missing: [] }, services: { complete: true, missing: [] }, evidence: { complete: false, missing }, agreements: { complete: true, missing: [] }, submit: { ready: false, missing } },
    services: p2Services(), checklist: p2Checklist(), evidence: p2Evidence(), agreements: p2Agreements(), open_requests: p2Requests() };
}
function p2Matrix() {
  return p2Services().map((s) => ({ service_id: s.id, service_code: s.service_code, service_name: s.service_name, status: s.status, cells: s.coverage.map((c) => ({ coverage_id: c.id, country_code: c.country_code, jurisdiction_code: c.jurisdiction_code, status: c.status, limitations: c.limitations, approved_at: c.approved_at, expires_at: c.expires_at })) }));
}
function p2Verification(key?: string) {
  if (key === PARTNER_KEY) {
    const sp = spProvider();
    return { ok: true, lifecycle: { status: sp.lifecycle_status, since: sp.lifecycle_status_since, reason: null, reverification_due_at: iso(10, 6, 0), grace_until: null }, matrix: spMatrix(), checklist: spChecklist(), open_requests: [], history: spHistory() };
  }
  const p = p2Provider();
  return { ok: true, lifecycle: { status: p.lifecycle_status, since: p.lifecycle_status_since, reason: p.lifecycle_status_reason, reverification_due_at: null, grace_until: null }, matrix: p2Matrix(), checklist: p2Checklist(), open_requests: p2Requests(), history: p2History() };
}
function p2Gate() {
  // Kein billing.* in `missing`: die Zahlungsbereitschaft sperrt die
  // gebuehrenpflichtige Buchung, nicht die Aktivierung (Spec A §21.1). Sie wird
  // gemeldet — und muss hier stehen, sonst greift die Gate-Leiste ins Leere.
  return { ok: false, missing: ['evidence.insurance', 'evidence.representative_identity'], target: 'limited', approved_cells: 1, total_cells: 4, allowance: null,
    billing: { ready: false, blocks_chargeable_booking: ['not_ready', 'no_payment_method'] } };
}
// ─── Change-Control (TKT-PROV-08, Canvas-Wahl 01.10.2026) ────────────────────
// Schmidt & Partner hat eine Preiserhoehung beim Datenschutz-Paket in Pruefung
// (C V1) und eine abgelehnte Aenderung der Ausschluesse bei EPR. Studio
// Bianchi hat eine eingeschraenkte Zulassung gemeldet (Pause, E V1).
//
// Gilt ab (Canvas 04.10.2026): die Preiserhoehung beim Datenschutz-Paket soll
// in zwei Tagen gelten — das Pruefteam sieht die Warnung (E V2). Bei EPR ist
// zum Jahreswechsel eine freigegebene Preisanpassung eingeplant und eine
// kuerzere Lieferzeit ohne Pruefung geplant (C V1); Nutzer sehen den
// geplanten Preis neutral auf der Detailseite (D V2).
const CC = { held: uuid(53, 7), rejected: uuid(54, 7), event: uuid(51, 7), planned: uuid(55, 7), plannedFree: uuid(56, 7) };
function spChanges() {
  return [
    { id: CC.held, service_id: SP.priv, change_type: 'pricing', field_path: 'price_max', old_value: { price_max: 2400 }, new_value: { price_max: 2600 }, effect: 'held', status: 'submitted', deadline_class: 'before_effective_date', submitted_at: iso(-1, 9, 12), reviewed_at: null, reviewer_note: null, provider_note: null, effective_at: dayStart(2), applied_at: null },
    { id: CC.planned, service_id: SP.epr, change_type: 'pricing', field_path: 'price_max', old_value: { price_max: 900 }, new_value: { price_max: 950 }, effect: 'held', status: 'approved', deadline_class: 'before_effective_date', submitted_at: iso(-4, 14, 0), reviewed_at: iso(-3, 10, 30), reviewer_note: null, provider_note: null, effective_at: NEW_YEAR, applied_at: null },
    { id: CC.plannedFree, service_id: SP.epr, change_type: 'timeline', field_path: 'completion_days_estimate', old_value: { completion_days_estimate: 14 }, new_value: { completion_days_estimate: 10 }, effect: 'held', status: 'approved', deadline_class: 'before_effective_date', submitted_at: iso(-4, 14, 0), reviewed_at: null, reviewer_note: null, provider_note: null, effective_at: NEW_YEAR, applied_at: null },
    { id: CC.rejected, service_id: SP.epr, change_type: 'scope', field_path: 'exclusions', old_value: { exclusions: [] }, new_value: { exclusions: ['Buchhaltung'] }, effect: 'held', status: 'rejected', deadline_class: 'before_effective_date', submitted_at: iso(-6, 10, 0), reviewed_at: iso(-5, 15, 0), reviewer_note: 'Bitte nennen Sie, welche Buchhaltungsleistungen genau entfallen.', provider_note: null },
  ];
}
// Dieselbe Regel wie changeControl.ts (direction), verkuerzt auf die vier
// Felder, die "Konditionen ändern" anbietet.
function serviceChange(serviceId: string, body: Record<string, unknown>) {
  const svc = spServices().find((x) => x.id === serviceId) as Record<string, unknown> | undefined;
  const instant: string[] = []; const review: unknown[] = []; const held: unknown[] = []; const scheduled: unknown[] = [];
  const at = typeof body.effective_at === 'string' && body.effective_at ? `${body.effective_at}T00:00:00.000Z` : null;
  for (const k of ['price_min', 'price_max', 'completion_days_estimate', 'response_time_hours']) {
    if (!(k in body)) continue;
    const old = svc?.[k] ?? null; const nw = body[k] ?? null;
    if (old === nw) continue;
    const f = { field: k, old, new: nw, change_type: k.startsWith('price') ? 'pricing' : k === 'response_time_hours' ? 'support' : 'timeline' };
    const lower = typeof old === 'number' && typeof nw === 'number' && nw <= old;
    // Mit Datum wird eine guenstigere Kondition eingeplant statt geschrieben;
    // die Antwortzeit ist keine Kondition im Sinne von §18 und gilt sofort.
    if (lower) (at && k !== 'response_time_hours' ? scheduled : review).push(f);
    else held.push(f);
  }
  const names = (xs: unknown[]) => (xs as Array<{ field: string }>).map((f) => f.field);
  if (body.dry_run === true) return { ok: true, dry_run: true, instant, review, held, scheduled, effective_at: at };
  return { ok: true, updated: names(review), held: names(held), scheduled: names(scheduled), effective_at: at, change_request_ids: [] };
}
function changeDetail(id: string) {
  if (id === CC.event) return { ok: true, change: { id, service_id: null, change_type: 'material_event', field_path: null, old_value: { services: [] }, new_value: { services: [] }, effect: 'pause', status: 'submitted', deadline_class: 'immediate_24h', event_type: 'licence_restricted', occurred_on: iso(-1, 0, 0).slice(0, 10), affected_service_ids: [uuid(91, 7)], submitted_at: iso(0, 8, 0), reviewed_at: null, reviewer_note: null, provider_note: 'Die Kammer hat die Zulassung für Steuerberatung in Italien bis zur Klärung eingeschränkt.' }, live: null, stale: false, service: null, upcoming_bookings: 1 };
  if (id === CC.held) return { ok: true, change: { ...spChanges()[0] }, live: { price_max: 2400 }, stale: false, service: { id: SP.priv, service_code: 'data-privacy.notices', service_name: 'Datenschutz für Shops', status: 'approved' }, upcoming_bookings: 2 };
  return { __status: 404, errorCode: 'NOT_FOUND', message: 'Change not found' };
}

function p2Queue() {
  const rows = [
    { kind: 'application', provider_key: 'dahlmann-cpa', provider_name: 'Neue Kanzlei GmbH', lifecycle_status: 'more_info_required', since: iso(-3, 9, 40), due_at: null, risk: 'high', detail: 'tax-vat, data-privacy', ref_id: null },
    { kind: 'application', provider_key: 'lex-iberia', provider_name: 'Lex Iberia Abogados', lifecycle_status: 'submitted', since: iso(-1, 11, 0), due_at: null, risk: 'high', detail: 'legal-advisory', ref_id: null },
    { kind: 'change_request', provider_key: 'studio-bianchi', provider_name: 'Studio Bianchi', lifecycle_status: 'active', since: iso(0, 8, 0), due_at: plus(9 * H), risk: 'high', detail: 'licence_restricted', ref_id: CC.event },
    { kind: 'change_request', provider_key: 'schmidt-partner', provider_name: 'Schmidt & Partner', lifecycle_status: 'active', since: iso(-1, 9, 12), due_at: dayStart(2), risk: 'medium', detail: 'pricing', ref_id: CC.held },
    { kind: 'application', provider_key: 'packwise', provider_name: 'Packwise Compliance', lifecycle_status: 'under_verification', since: iso(-2, 10, 0), due_at: null, risk: 'medium', detail: 'product-packaging', ref_id: null },
    { kind: 'application', provider_key: 'nordic-privacy', provider_name: 'Nordic Privacy Partners', lifecycle_status: 'submitted', since: plus(-5 * H), due_at: null, risk: 'medium', detail: 'data-privacy', ref_id: null },
    { kind: 'reverification', provider_key: 'schmidt-partner', provider_name: 'Schmidt & Partner', lifecycle_status: 'reverification_due', since: iso(-4, 6, 0), due_at: iso(10, 6, 0), risk: 'low', detail: 'tax-vat', ref_id: null },
    { kind: 'expiring_evidence', provider_key: 'madrid-tax', provider_name: 'Madrid Tax Advisors', lifecycle_status: 'active', since: iso(-30, 9, 0), due_at: iso(23, 0, 0).slice(0, 10), risk: 'low', detail: 'insurance', ref_id: uuid(52, 7) },
  ];
  return { ok: true, rows, counts: { total: rows.length, high: rows.filter((r) => r.risk === 'high').length, applications: rows.filter((r) => r.kind === 'application').length } };
}
function p2ReviewDossier(key: string) {
  if (key !== 'dahlmann-cpa') return { __status: 404, errorCode: 'NOT_FOUND', message: 'Provider not found' };
  const p = p2Provider();
  return { ok: true, provider: p, confidential: p2Confidential(), has_dashboard_user: true, services: p2Services(), matrix: p2Matrix(), checklist: p2Checklist(), evidence: p2Evidence(true),
    registry: { vat: { vat_id: p.vat_id, status: p.vat_id_status, checked_at: p.vat_id_checked_at } }, agreements: p2Agreements(), required_agreements: ['provider_agreement', 'privacy_notice', 'billing_authorization'],
    open_requests: p2Requests(), gate: p2Gate(), history: p2History() };
}

// Kalender-Zustand des Mocks (siehe Route weiter unten).
const mockCalendar = { connected: false };
const calendarStatus = () => ({ configured: true, connected: mockCalendar.connected, email: mockCalendar.connected ? 'kalender@schmidt-partner.example' : null });

export function route(method: string, path: string, body: Record<string, unknown> = {}, role = '', query: URLSearchParams = new URLSearchParams()): unknown {
  const seg = path.split('/').filter(Boolean); // ['api','v1',...]
  const p = seg.slice(2);
  if (method === 'GET') {
    // Kalender-Status (nylasAuth.ts) — vor dem allgemeinen GET-Rueckfall unten.
    if (p[0] === 'provider' && p[2] === 'calendar' && p.length === 3) return calendarStatus();
    if (p[0] === 'dashboard') return dashboard();
    if (p[0] === 'acknowledgement') return acknowledgement((query.get('lang') ?? 'en').slice(0, 2).toLowerCase());
    // Mock-Login = der Demo-Anbieter (echte API: provider_members, 20260922000000)
    if (p[0] === 'me' && p[1] === 'provider') return { ok: true, provider_key: PARTNER_KEY, role: 'owner', name: 'Schmidt & Partner', lifecycle_status: 'active' };
    if (p[0] === 'domain' && p[1]) return domainOverview(p[1]);
    if (p[0] === 'bookings') return { ok: true, bookings: bookings() };
    // Dieselbe Route wie beim echten Server; dort trennt der Login die Sicht,
    // hier die Demo-Rolle aus dem Header x-demo-role.
    if (p[0] === 'requests') return { ok: true, requests: role === 'partner' ? partnerRequests() : requests() };
    if (p[0] === 'provider' && p[2] === 'bookings') return { ok: true, bookings: partnerBookings() };
    if (p[0] === 'provider' && p[2] === 'coverage') return partnerCoverage();
    if (p[0] === 'provider' && p[2] === 'invoices') return partnerInvoices();
    if (p[0] === 'provider' && p[2] === 'billing' && p[3] === 'preview') return partnerBillingPreview();
    // Tarif wie der Server (GET /provider/:key/subscription): laufendes Growth,
    // dieselben Werte wie die Abrechnungsvorschau. Bis TKT-PROV-12 fiel die
    // Seite im Mock auf ihre Fixture zurueck.
    if (p[0] === 'provider' && p[2] === 'subscription') return partnerSubscription();
    if (p[0] === 'reads') return { ok: true, last_seen_at: plus(-30 * H) };
    // Das Betriebsprotokoll ist admin-pflichtig (echter Server: 403) — der
    // Partner-Feed faellt dann wie in echt auf seine eigene Darstellung zurueck.
    if (p[0] === 'admin' && p[1] === 'events' && role !== 'admin') return { __status: 403, errorCode: 'FORBIDDEN', message: 'Admin only' };
    if (p[0] === 'notifications') { const rows = role === 'partner' ? partnerNotifications() : notifications(); return { ok: true, notifications: rows, unread: rows.filter((r) => !r.read_at).length }; }
    if (p[0] === 'sessions') return { ok: true, sessions: SESSIONS.map(({ open: _open, total: _total, severity: _severity, by_severity: _bySeverity, ...s }) => s) };
    if (p[0] === 'session' && p[2] === 'obligations') return obligations(p[1]);
    if (p[0] === 'engagement' && p.length === 2) return engagement(p[1]);
    // Phase 2 · Onboarding: der Demo-Anbieter steckt in der Pruefung (Rueckfrage offen).
    if (p[0] === 'provider' && p[2] === 'application') return p2Application(p[1]);
    if (p[0] === 'provider' && p[2] === 'verification') return p2Verification(p[1]);
    if (p[0] === 'admin' && p[1] === 'review' && p[2] === 'queue') return p2Queue();
    if (p[0] === 'admin' && p[1] === 'review' && p[2] && p[3] === 'gate') return { ok: true, gate: p2Gate() };
    if (p[0] === 'admin' && p[1] === 'review' && p[2] && p[3] === 'change' && p[4]) return changeDetail(p[4]);
    if (p[0] === 'provider' && p[2] === 'changes') return { ok: true, changes: p[1] === PARTNER_KEY ? spChanges() : [] };
    if (p[0] === 'admin' && p[1] === 'review' && p[2] && !p[3]) return p2ReviewDossier(p[2]);
    // Phase 3: Nutzer-Routen ueber den opaken Ref; die alten Pfade mit dem
    // Schluessel gibt es nicht mehr (die API antwortet dort 404).
    if (p[0] === 'p' && p[2] === 'detail') return providerDetail(p[1]);
    if (p[0] === 'p' && p[2] === 'slots') return keyOfRef(p[1]) ? providerSlots() : { __status: 404, errorCode: 'NOT_FOUND', message: 'Provider not found' };
    if (p[0] === 'p' && p[2] === 'reviews') return providerReviews(p[1]);
    // Form wie der Server (api/metrics.ts) — vorher kam { sla } und die Seite
    // fiel stumm auf ihre Fixture zurueck. Werte passen zu den Partner-Anfragen.
    if (p[0] === 'metrics') return { ok: true, metrics: { total: 42, confirm_rate: 0.88, reply_rate: 0.81, sla_breach_rate: 0.03, avg_confirm_ms: 4.2 * H, avg_reply_ms: 17 * H } };
    return { ok: true, items: [], providers: [], laws: [], documents: [], exports: [] };
  }
  if (p[0] === 'search') return search(body);
  // Marktanfrage: der Server prueft und schreibt (marketRequests.ts); hier
  // nur die Antwortform. Ein abgedeckter Markt bekaeme dort 409.
  // Kalender (nylasAuth.ts): lokal ohne Google/Microsoft. „Verbinden" fuehrt
  // direkt auf den Rueckweg mit ?calendar=connected, damit der Ablauf im Mock
  // durchspielbar ist; der Zustand lebt bis zum Neustart des Dev-Servers.
  if (p[0] === 'provider' && p[2] === 'calendar' && p.length === 3 && method === 'DELETE') {
    mockCalendar.connected = false;
    return calendarStatus();
  }
  if (p[0] === 'provider' && p[2] === 'calendar' && p[3] === 'connect' && method === 'POST') {
    mockCalendar.connected = true;
    const loc = typeof body.locale === 'string' ? body.locale : 'de';
    return { url: `/${loc}/partner-dashboard/settings?calendar=connected` };
  }
  // Kontakt und Bewerbung: der Server prueft und schickt (contact.ts); der
  // lokale Mock antwortet nur in der Form eines Erfolgs. Auf Staging erreicht
  // der Demo-Login diesen Zweig nicht — api/contact.ts geht am Demo-Datensatz
  // vorbei, damit dort kein Versand vorgetaeuscht wird.
  if (p[0] === 'contact' && method === 'POST') return { ok: true, acknowledged: true };
  if (p[0] === 'provider' && p[2] === 'availability' && method === 'PATCH') {
    MOCK_AVAILABILITY = body.status === 'ooo' ? 'ooo' : 'available';
    return { ok: true, providerKey: p[1], availability: MOCK_AVAILABILITY, ooo_until: null };
  }
  if (p[0] === 'market-requests' && method === 'POST') {
    const market = String(body.market ?? '').toUpperCase();
    // Wie der Server (marketRequests.ts): ein bekannter Markt nur als Anfrage
    // nach Anbieter-Abdeckung (C2), mit Bereichen und ohne Update.
    const coverage = body.reason === 'provider_coverage' && Array.isArray(body.domains) && body.domains.length > 0;
    if (isKnownCountry(market) && !coverage) return { __status: 409, errorCode: 'MARKET_COVERED', message: 'This market is already covered' };
    return { ok: true, market, notify: body.notify === true && !isKnownCountry(market) };
  }
  if (p[0] === 'scheduling' && p.length === 1 && method === 'POST') return createBooking(body);
  if (p[0] === 'provider' && p[2] === 'bookings' && p[4] === 'proposal' && method === 'PATCH') return reportProposal(p[3], body);
  if (p[0] === 'provider' && p[2] === 'bookings' && p[4] === 'attendance' && method === 'PATCH') return reportAttendance(p[3], body);
  if (p[0] === 'scheduling' && p.length === 2 && method === 'PATCH') return patchBooking(p[1], body);
  if (p[0] === 'provider' && p[2] === 'billing' && p[3] === 'sync' && method === 'POST') return syncReadiness();
  if (p[0] === 'provider' && p[2] === 'billing' && p[3] === 'recheck' && method === 'POST') return recheckReadiness();
  if (p[0] === 'assistant' && p[1] === 'chat') return assistantChat(body);
  if (p[0] === 'session' && p.length === 1) return { ok: true, id: uuid(9, 1) };
  if (p[0] === 'session' && p[2] === 'duplicate') return duplicateSession(p[1], body);
  if (p[0] === 'session' && p.length === 2 && method === 'PATCH') return patchSession(p[1], body);
  if (p[0] === 'notifications' && p[1] === 'read') return { ok: true, marked: 3 };
  // Phase 2 · schreibende Aufrufe: plausible Antworten, keine Aenderung am Datensatz.
  if (p[0] === 'provider' && p[2] === 'services' && p[3] && !p[4] && method === 'PATCH') return serviceChange(p[3], body);
  if (p[0] === 'provider' && p[2] === 'changes' && p[3] && method === 'DELETE') return { ok: true, status: 'withdrawn' };
  if (p[0] === 'provider' && p[2] === 'material-event') return { ok: true, change_request_id: uuid(97, 7), paused_service_ids: Array.isArray(body.service_ids) ? body.service_ids : spServices().map((x) => x.id), users_notified: 1 };
  if (p[0] === 'admin' && p[1] === 'review' && p[3] === 'change' && p[4]) return { ok: true, decision: body.decision };
  if (p[0] === 'provider' && p[2] === 'services' && !p[3] && method === 'POST') return { ok: true, service: { id: uuid(99, 7), service_code: String(body.service_code ?? 'tax-vat'), service_name: String(body.service_name ?? 'Neue Leistung'), description: null, pricing_model: null, price_min: null, price_max: null, currency: null, pricing_basis: null, response_time_hours: null, completion_days_estimate: null, capacity_status: 'open', status: 'pending_verification', coverage: [] } };
  if (p[0] === 'provider' && p[2] === 'services' && p[4] === 'coverage') return { ok: true, coverage: (Array.isArray(body.countries) ? body.countries : []).map((c, i) => ({ id: uuid(60 + i, 7), service_id: p[3], country_code: typeof c === 'string' ? c : (c as { country_code: string }).country_code, jurisdiction_code: null, status: 'pending', limitations: null, approved_at: null, expires_at: null })), added: [], removed: [], withdrawn: [] };
  if (p[0] === 'provider' && p[2] === 'evidence' && p[3] === 'upload-url') return { ok: true, evidence_id: uuid(98, 7), file_ref: `dahlmann-cpa/${uuid(98, 7)}/${String(body.original_name ?? 'file.pdf')}`, upload: { url: '/api/v1/mock-upload', token: 'mock', method: 'PUT', headers: { 'Content-Type': String(body.mime_type ?? 'application/pdf') }, expiresAt: plus(2 * H) } };
  if (p[0] === 'mock-upload') return { ok: true };
  if (p[0] === 'provider' && p[2] === 'evidence' && p[4] === 'confirm') return { ok: true, evidence: { id: p[3], evidence_type: 'insurance', source: 'document', result: 'received', original_name: 'upload.pdf', size_bytes: 4321, upload_confirmed: true, uploaded_at: plus(0), identifier: null, expires_at: null, supports_countries: [], supports_service_codes: [] }, fulfilled_requests: [], lifecycle_status: 'more_info_required' };
  if (p[0] === 'provider' && p[2] === 'evidence' && p[3] === 'registry') { const v = String(body.vat_id ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''); const valid = /^DE\d{9}$/.test(v); return { ok: true, evidence: { id: uuid(97, 7), evidence_type: 'vat_id', source: 'registry_check', result: valid ? 'independently_verified' : 'rejected', original_name: null, size_bytes: null, upload_confirmed: true, uploaded_at: null, identifier: v, expires_at: null, supports_countries: [], supports_service_codes: [] }, vat: { status: valid ? 'valid' : 'invalid', vat_id: v, country_code: v.slice(0, 2), name: valid ? 'Neue Kanzlei GmbH' : null, checked_at: plus(0) } }; }
  if (p[0] === 'provider' && p[2] === 'submit') return { ok: false, __status: 422, errorCode: 'INCOMPLETE', message: 'A few things are still missing before we can review your application', missing: ['evidence.insurance'] };
  if (p[0] === 'admin' && p[1] === 'review' && p[3] === 'lifecycle') return String(body.to) === 'active' || String(body.to) === 'limited' ? { __status: 422, errorCode: 'GATE_NOT_MET', message: 'Activation is not possible yet', gate: p2Gate() } : { ok: true, from: 'more_info_required', to: body.to, gate: null };
  if (p[0] === 'admin' && p[1] === 'review' && p[3] === 'coverage') return String(body.action) === 'request_info' ? { ok: true, request: { ...p2Requests()[0], id: uuid(96, 7), country_code: 'AT' }, lifecycle_status: 'more_info_required' } : { ok: true, coverage: { id: p[4], status: body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : body.action === 'limit' ? 'limited' : body.action === 'pause' ? 'suspended' : 'pending' }, service_status: 'limited' };
  if (p[0] === 'admin' && p[1] === 'review' && p[3] === 'request') return { ok: true, request: { ...p2Requests()[0], id: uuid(95, 7) }, lifecycle_status: 'more_info_required' };
  return { ok: true };
}
