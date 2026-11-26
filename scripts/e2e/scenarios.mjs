#!/usr/bin/env node
// ─── Stufe A: Nutzer und Anbieter gegen eine echte API ───────────────────────
//
// Die Browser-Ablaeufe (apps/vs1-demo/ui/e2e) laufen gegen eine Attrappe. Der
// Systemcheck vom 24.11.2026 fand: der Buchungsweg war auf Staging seit dem
// 11.10. nicht gelaufen. Dieser Laeufer spielt ihn mit zwei echten Konten
// gegen die echte API durch, ohne Browser: ein Nutzer, ein Anbieter, ein Gast.
//
// Zwei Stufen:
//   smoke  liest nur. Wer darf was, antwortet alles, ist der Gast anonym
//          bedient. Schreibt nichts, bucht nichts. Fuer Beta und nach jedem
//          Staging-Deploy.
//   full   dazu eine echte Buchung und ihre Absage. Loest auf Staging eine
//          Belastung im Stripe-TESTMODUS aus (die Lead-Gebuehr, sie wird bei
//          Absage nicht erstattet) und verschickt die Mails einer Buchung.
//          Nur fuer Staging.
//
// Der Laeufer kennt keine Geheimnisse ausser den Tokens, die er bekommt, und
// schreibt sie nirgends hin. Jede Nachricht, die er hinterlaesst, beginnt mit
// "[E2E-Test]".
//
//   node scripts/e2e/scenarios.mjs            (Umgebung: siehe readConfig)
//
// Als Modul: runScenarios({ apiUrl, level, tokens, ... }) → { ok, results }.

const TAG = '[E2E-Test]';

/** Felder, die vor einer Buchung nie auf dem Draht stehen duerfen (Stufe-1-Anonymitaet). */
const IDENTITY_FIELDS = ['provider_key', 'pseudonym_label', 'contact_email', 'website_url', 'name', 'stripe_customer_id'];

/**
 * @typedef {{ name: string, status: 'pass' | 'fail' | 'skip', detail?: string }} Result
 */

export async function runScenarios(opts) {
  const {
    apiUrl, level = 'smoke', tokens, apiKey = null, providerRef = null,
    area = 'tax-vat', market = 'DE', lang = 'de', fetchImpl = fetch,
    runId = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    log = () => {},
  } = opts;
  if (!['smoke', 'full'].includes(level)) throw new Error(`unknown level: ${level}`);
  const base = String(apiUrl).replace(/\/+$/, '');
  /** @type {Result[]} */
  const results = [];
  const state = { providerKey: null, bookingId: null, slot: null, sessionId: null, ackVersion: null };
  /** Jede Buchung, die die API diesem Lauf je zurueckgegeben hat: Kennung → abgesagt? */
  const created = new Map();

  const call = async (method, path, { as = 'guest', body } = {}) => {
    const headers = { 'content-type': 'application/json' };
    if (as === 'user') headers.authorization = `Bearer ${tokens.user}`;
    if (as === 'provider') headers.authorization = `Bearer ${tokens.provider}`;
    if (as === 'server') headers['x-api-key'] = apiKey ?? '';
    const res = await fetchImpl(`${base}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000) });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  };

  /** Ein Schritt: wirft er, ist er gescheitert; gibt er einen Text zurueck, steht der als Hinweis da. */
  const step = async (name, run, { needs = true, skipNote = 'Voraussetzung fehlt' } = {}) => {
    if (!needs) { results.push({ name, status: 'skip', detail: skipNote }); log(`  –  ${name}: ${skipNote}`); return false; }
    try {
      const detail = await run();
      results.push({ name, status: 'pass', ...(detail ? { detail } : {}) });
      log(`  ✓  ${name}${detail ? `: ${detail}` : ''}`);
      return true;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ name, status: 'fail', detail });
      log(`  ✗  ${name}: ${detail}`);
      return false;
    }
  };
  const expectStatus = (r, want, what) => {
    const ok = Array.isArray(want) ? want.includes(r.status) : r.status === want;
    if (!ok) throw new Error(`${what}: Status ${r.status}${r.body?.errorCode ? ` (${r.body.errorCode})` : ''}, erwartet ${Array.isArray(want) ? want.join('/') : want}`);
  };

  // ── Lesend: wer darf was ────────────────────────────────────────────────────

  await step('Anbindungen: der Bericht der API ist gruen', async () => {
    const r = await call('GET', '/api/v1/admin/readiness', { as: 'server' });
    expectStatus(r, 200, 'readiness');
    if (r.body?.ok !== true) throw new Error('der Bericht sagt ok=false');
  }, { needs: !!apiKey, skipNote: 'kein Server-Schluessel uebergeben' });

  await step('Gast: Suche antwortet, Anbieter bleiben anonym', async () => {
    const r = await call('POST', '/api/v1/search', { body: { country: market, structured_answers: { domains: [area] } } });
    expectStatus(r, 200, 'search');
    if (!Array.isArray(r.body?.providers)) throw new Error('die Antwort hat keine Anbieterliste');
    for (const p of r.body.providers) {
      const leaked = IDENTITY_FIELDS.filter((f) => p[f] !== undefined && p[f] !== null);
      if (leaked.length) throw new Error(`Identitaet vor der Buchung auf dem Draht: ${leaked.join(', ')}`);
      if (typeof p.public_ref !== 'string') throw new Error('ein Anbieter ohne public_ref');
    }
    return `${r.body.providers.length} Anbieter`;
  });

  await step('Gast: Buchungen und Buchen sind ohne Anmeldung zu', async () => {
    expectStatus(await call('GET', '/api/v1/bookings'), 401, 'GET /bookings als Gast');
    expectStatus(await call('POST', '/api/v1/scheduling', { body: {} }), 401, 'POST /scheduling als Gast');
    expectStatus(await call('GET', '/api/v1/admin/readiness'), 401, 'GET /admin/readiness als Gast');
  });

  let betaRequired = null;
  let betaVersion = null;
  await step('Nutzer: angemeldet, Stand der Vereinbarungen lesbar', async () => {
    const r = await call('GET', '/api/v1/me/agreements', { as: 'user' });
    expectStatus(r, 200, 'me/agreements');
    if (!r.body?.agreements || typeof r.body.agreements !== 'object') throw new Error('die Antwort hat keinen Stand der Vereinbarungen');
    const beta = r.body.agreements.beta ?? null;
    betaRequired = beta ? beta.required === true : false;
    betaVersion = beta?.current_version ?? null;
    return beta ? `Beta-Vereinbarung ${betaVersion ?? 'ohne Fassung'}, ${betaRequired ? 'noch nicht angenommen' : 'angenommen oder nicht noetig'}` : 'keine Beta-Vereinbarung hinterlegt';
  });

  await step('Nutzer: ist kein Anbieter und kein Admin', async () => {
    expectStatus(await call('GET', '/api/v1/me/provider', { as: 'user' }), 404, 'me/provider als Nutzer');
    expectStatus(await call('GET', '/api/v1/admin/readiness', { as: 'user' }), 403, 'admin/readiness als Nutzer');
  });

  const providerKnown = await step('Anbieter: angemeldet und mit seinem Anbieterkonto verbunden', async () => {
    const r = await call('GET', '/api/v1/me/provider', { as: 'provider' });
    expectStatus(r, 200, 'me/provider als Anbieter');
    if (typeof r.body?.provider_key !== 'string') throw new Error('die Antwort nennt keinen Anbieter');
    state.providerKey = r.body.provider_key;
    return `Status ${r.body.lifecycle_status ?? 'unbekannt'}`;
  });

  await step('Rechte: der Nutzer kommt nicht an die Leads des Anbieters', async () => {
    const r = await call('GET', `/api/v1/provider/${state.providerKey}/bookings`, { as: 'user' });
    // 404 statt 403 ist Absicht der API: ein Fremder erfaehrt nicht, welche
    // Anbieter-Schluessel es gibt. Der Versuch steht danach im Zugriffsprotokoll.
    expectStatus(r, 404, 'Leads des Anbieters als Nutzer');
    if (r.body?.bookings !== undefined) throw new Error('die Absage traegt trotzdem Leads');
  }, { needs: providerKnown });

  await step('Rechte: der Gast kommt nicht an die Leads des Anbieters', async () => {
    expectStatus(await call('GET', `/api/v1/provider/${state.providerKey}/bookings`), 401, 'Leads des Anbieters als Gast');
  }, { needs: providerKnown });

  await step('Anbieter: liest seine eigenen Leads', async () => {
    const r = await call('GET', `/api/v1/provider/${state.providerKey}/bookings`, { as: 'provider' });
    expectStatus(r, 200, 'eigene Leads');
    if (!Array.isArray(r.body?.bookings)) throw new Error('die Antwort hat keine Liste');
    return `${r.body.bookings.length} Leads`;
  }, { needs: providerKnown });

  const slotsKnown = await step('Termine: der Anbieter hat freie Zeitfenster', async () => {
    const r = await call('GET', `/api/v1/p/${providerRef}/slots`, { as: 'user' });
    expectStatus(r, 200, 'slots');
    const slots = Array.isArray(r.body?.slots) ? r.body.slots.filter((s) => typeof s === 'string' && Date.parse(s) > Date.now() + 3600_000) : [];
    if (r.body?.booking_open !== true) throw new Error(`Buchung nicht offen (${r.body?.reason ?? 'ohne Grund'})`);
    if (!slots.length) throw new Error('kein freies Zeitfenster');
    // Das spaeteste: am weitesten weg von dem, was ein Mensch gerade bucht.
    state.slot = slots[slots.length - 1];
    return `${slots.length} frei`;
  }, { needs: !!providerRef, skipNote: 'kein public_ref des Test-Anbieters uebergeben' });

  if (level === 'smoke') return finish(results);

  // ── Schreibend: eine Buchung und ihre Absage (nur Staging) ─────────────────

  const agreed = await step('Nutzer: nimmt die Beta-Vereinbarung an, wenn sie fehlt', async () => {
    if (!betaRequired) return 'nicht noetig';
    const r = await call('POST', '/api/v1/me/agreements/beta', { as: 'user', body: { version: betaVersion, language: lang } });
    expectStatus(r, [200, 201], 'Annahme');
    return `Fassung ${betaVersion}`;
  }, { needs: betaRequired !== null });

  const prepared = await step('Nutzer: legt eine Sitzung an und liest den Buchungstext', async () => {
    const s = await call('POST', '/api/v1/session', { as: 'user', body: { country: market, markets: [market], categories: [area], answers: { e2e: runId } } });
    expectStatus(s, [200, 201], 'session');
    if (typeof s.body?.id !== 'string') throw new Error('die Sitzung hat keine Kennung');
    state.sessionId = s.body.id;
    const a = await call('GET', `/api/v1/acknowledgement?lang=${lang}`, { as: 'user' });
    expectStatus(a, 200, 'acknowledgement');
    if (typeof a.body?.version !== 'string') throw new Error('der Buchungstext hat keine Fassung');
    state.ackVersion = a.body.version;
    return `Text ${state.ackVersion}`;
  }, { needs: agreed });

  /** Bucht und merkt sich JEDE Kennung, die zurueckkommt, auch eine unerwartete. */
  const postBooking = async (requestId) => {
    const r = await call('POST', '/api/v1/scheduling', { as: 'user', body: bookingBody(requestId) });
    const id = r.body?.booking?.id;
    if (typeof id === 'string' && !created.has(id)) created.set(id, false);
    return r;
  };
  const cancel = async (id) => {
    const r = await call('PATCH', `/api/v1/scheduling/${id}`, { as: 'user', body: { status: 'cancelled' } });
    if (r.status === 200) created.set(id, true);
    return r;
  };

  const bookingBody = (requestId) => ({
    public_ref: providerRef, slot_start: state.slot, session_id: state.sessionId,
    acknowledgement_version: state.ackVersion, request_id: requestId,
    message: `${TAG} automatischer Lauf ${runId}. Bitte nicht beantworten.`,
  });

  try {
    const booked = await step('Buchung: der Nutzer bucht, der Anbieter wird erst danach genannt', async () => {
      const r = await postBooking(runId);
      expectStatus(r, 201, 'Buchung');
      if (r.body?.booking?.status !== 'confirmed' || typeof r.body.booking.id !== 'string') throw new Error('die Buchung ist nicht bestaetigt');
      state.bookingId = r.body.booking.id;
      if (!r.body.provider_identity?.name) throw new Error('nach der Buchung fehlt die Identitaet des Anbieters');
      const text = JSON.stringify(r.body);
      const leaked = ['fee_cents', 'ledger', 'stripe', 'payment_intent'].filter((w) => text.toLowerCase().includes(w));
      if (leaked.length) throw new Error(`Gebuehr oder Zahlungsweg auf dem Draht des Nutzers: ${leaked.join(', ')}`);
    }, { needs: prepared && slotsKnown });

    await step('Buchung: dieselbe Anfrage noch einmal legt nichts Zweites an', async () => {
      const r = await postBooking(runId);
      expectStatus(r, [200, 201], 'Wiederholung');
      if (r.body?.booking?.id !== state.bookingId) throw new Error('die Wiederholung hat eine andere Buchung geliefert');
    }, { needs: booked });

    await step('Buchung: derselbe Termin ist fuer eine zweite Anfrage vergeben', async () => {
      const r = await postBooking(`${runId}-zwei`);
      expectStatus(r, 409, 'zweite Anfrage auf denselben Termin');
      if (r.body?.errorCode !== 'SLOT_TAKEN') throw new Error(`erwartet SLOT_TAKEN, bekommen ${r.body?.errorCode}`);
    }, { needs: booked });

    await step('Nutzer: sieht die Buchung unter seinen Terminen', async () => {
      const r = await call('GET', '/api/v1/bookings', { as: 'user' });
      expectStatus(r, 200, 'Termine');
      if (!(r.body?.bookings ?? []).some((b) => b.id === state.bookingId)) throw new Error('die Buchung fehlt in der Liste');
    }, { needs: booked });

    await step('Anbieter: sieht den Lead mit der Nachricht des Nutzers', async () => {
      const r = await call('GET', `/api/v1/provider/${state.providerKey}/bookings`, { as: 'provider' });
      expectStatus(r, 200, 'Leads');
      const lead = (r.body?.bookings ?? []).find((b) => b.id === state.bookingId);
      if (!lead) throw new Error('der Lead fehlt beim Anbieter');
      if (!JSON.stringify(lead).includes(runId)) throw new Error('die Nachricht des Nutzers fehlt am Lead');
    }, { needs: booked && providerKnown });

    await step('Rechte: der Gast kann die Buchung nicht absagen', async () => {
      expectStatus(await call('PATCH', `/api/v1/scheduling/${state.bookingId}`, { body: { status: 'cancelled' } }), 401, 'Absage als Gast');
    }, { needs: booked });

    await step('Absage: der Nutzer sagt ab, die Buchung steht als abgesagt da', async () => {
      expectStatus(await cancel(state.bookingId), 200, 'Absage');
      const list = await call('GET', '/api/v1/bookings', { as: 'user' });
      expectStatus(list, 200, 'Termine nach der Absage');
      const b = (list.body?.bookings ?? []).find((x) => x.id === state.bookingId);
      if (b?.status !== 'cancelled') throw new Error(`Status nach der Absage: ${b?.status ?? 'nicht gefunden'}`);
    }, { needs: booked });
  } finally {
    // Aufraeumen, was immer oben passiert ist: keine bestaetigte Testbuchung
    // bleibt stehen, auch keine, die die API unerwartet zusaetzlich angelegt
    // hat. Scheitert auch das, steht es als eigener Befund da.
    const open = [...created].filter(([, done]) => !done).map(([id]) => id);
    if (open.length) {
      await step('Aufraeumen: die Testbuchung absagen', async () => {
        const stuck = [];
        for (const id of open) { if ((await cancel(id)).status !== 200) stuck.push(id); }
        if (stuck.length) throw new Error(`${stuck.length} von ${open.length} Testbuchungen liessen sich nicht absagen`);
        return open.length > 1 ? `${open.length} Buchungen` : undefined;
      });
    }
  }

  return finish(results);
}

function finish(results) {
  const failed = results.filter((r) => r.status === 'fail').length;
  const passed = results.filter((r) => r.status === 'pass').length;
  // Ein Lauf, in dem nichts geprueft wurde, ist kein bestandener Lauf.
  return { ok: failed === 0 && passed > 0, passed, failed, skipped: results.length - passed - failed, results };
}

// ─── Anmeldung ueber Supabase (Passwort) ─────────────────────────────────────

export async function signIn({ supabaseUrl, anonKey, email, password, fetchImpl = fetch }) {
  const res = await fetchImpl(`${String(supabaseUrl).replace(/\/+$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json().catch(() => null);
  // Kein Antwortkoerper in der Meldung: er kann die Adresse enthalten.
  if (!res.ok || typeof body?.access_token !== 'string') throw new Error(`Anmeldung gescheitert (Status ${res.status})`);
  return body.access_token;
}

export function readConfig(env = process.env) {
  const need = ['API_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD', 'E2E_PROVIDER_EMAIL', 'E2E_PROVIDER_PASSWORD'];
  const missing = need.filter((k) => !env[k]?.trim());
  const level = (env.E2E_LEVEL || 'smoke').trim();
  return {
    missing, level,
    apiUrl: env.API_URL?.trim(), supabaseUrl: env.SUPABASE_URL?.trim(), anonKey: env.SUPABASE_ANON_KEY?.trim(),
    user: { email: env.E2E_USER_EMAIL?.trim(), password: env.E2E_USER_PASSWORD },
    provider: { email: env.E2E_PROVIDER_EMAIL?.trim(), password: env.E2E_PROVIDER_PASSWORD },
    apiKey: env.API_KEY?.trim() || null, providerRef: env.E2E_PROVIDER_REF?.trim() || null,
    area: env.E2E_AREA?.trim() || 'tax-vat', market: env.E2E_MARKET?.trim() || 'DE', lang: env.E2E_LANG?.trim() || 'de',
    allowFull: (env.E2E_ALLOW_FULL || '').trim() === 'true',
  };
}

async function main() {
  const cfg = readConfig();
  if (cfg.missing.length) { console.error(`Es fehlt: ${cfg.missing.join(', ')}. Es wurde nichts geprueft.`); process.exit(2); }
  // Eine Buchung loest eine Belastung aus. Das muss die Umgebung ausdruecklich erlauben.
  if (cfg.level === 'full' && !cfg.allowFull) { console.error('E2E_LEVEL=full braucht E2E_ALLOW_FULL=true (nur fuer Staging). Es wurde nichts geprueft.'); process.exit(2); }
  console.log(`Stufe A, ${cfg.level}:`);
  let tokens;
  try {
    tokens = {
      user: await signIn({ supabaseUrl: cfg.supabaseUrl, anonKey: cfg.anonKey, ...cfg.user }),
      provider: await signIn({ supabaseUrl: cfg.supabaseUrl, anonKey: cfg.anonKey, ...cfg.provider }),
    };
  } catch (err) {
    console.error(`  ✗  Anmeldung der Testkonten: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
  const out = await runScenarios({ ...cfg, tokens, log: (l) => console.log(l) });
  console.log(`\n${out.passed} bestanden, ${out.failed} gescheitert, ${out.skipped} uebersprungen.`);
  process.exit(out.ok ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(`Der Lauf ist abgebrochen: ${err instanceof Error ? err.message : err}`); process.exit(1); });
}
