#!/usr/bin/env node
// ─── 25 Test-Provider fuer die geschlossene Beta (Beta-Plan, 15.10.2026) ─────
//
// Es gibt noch keine echten Provider. Damit Beta-Tester trotzdem echte Wege
// gehen koennen — Risk Map, Treffer, Termin buchen, Nachricht —, legt dieses
// Skript 25 vollstaendige Provider im BETA-Projekt an. Auf der Provider-Seite
// antwortet ein Mensch (Entscheidung des Nutzers: die Mitgruenderin), keine
// Automatik: Die AI gibt sich nie als Fachperson aus (DNA, KN-BRAND-001).
//
// Je Provider:
//   - Login (Supabase Auth, app_metadata.role='partner'), Adresse
//     <lokal>+pNN@<domain> — alle Mails landen in EINEM Postfach.
//     Ein gemeinsames Passwort aus SEED_PASSWORD (nur Testkonten, hinter der
//     Basic-Auth-Wand der Beta).
//   - Stripe-Kunde im TESTMODUS mit Testkarte pm_card_visa als Standard —
//     ohne sie lehnt die Buchung mit BILLING_NOT_READY ab.
//   - providers (active, billing_ready), provider_members, provider_confidential,
//     Leistungen + Abdeckung (approved), Nachweise (Zulassung je Land fuer
//     die regulierten Bereiche tax-vat und legal-advisory), Vereinbarungen,
//     Abo (essential/growth/global im Wechsel).
//
// Verteilung (Nutzer: gleichmaessig): 9 Bereiche x 8 Maerkte. Jede Zelle
// bekommt mindestens einen Provider; das Skript prueft das, bevor es schreibt.
//
// Kennzeichnung: keine im Produkt (Entscheidung des Nutzers). Der Hinweis steht
// in den Beta-Bedingungen; Tester bekommen Zugang erst, wenn sie die gesehen
// haben. Intern tragen alle Schluessel das Praefix `tp-`, so findet --remove
// sie wieder.
//
// Aufruf (Schluessel nur aus der Umgebung, nie als Argument):
//   TARGET_SUPABASE_URL=… TARGET_SERVICE_ROLE_KEY=… STRIPE_SECRET_KEY=sk_test_… \
//   SEED_EMAIL=demet@complihub360.com SEED_PASSWORD=… \
//   node scripts/beta/seed-test-providers.mjs --ref <projekt-ref>            # Probelauf
//   node scripts/beta/seed-test-providers.mjs --ref <projekt-ref> --apply    # anlegen
//   node scripts/beta/seed-test-providers.mjs --ref <projekt-ref> --remove   # alles wieder weg
//
// --ref muss zur URL passen und darf nie Staging sein. Ein zweiter --apply
// legt nichts doppelt an (vorhandene Schluessel werden uebersprungen).

const STAGING_REF = 'kqylqwogxbiwpnomkzsn';
const PREFIX = 'tp-';
const COUNT = 25;
const AGREEMENT_VERSION = '2026-09';

export const AREAS = ['tax-vat', 'product-packaging', 'data-privacy', 'marketing-seo', 'corporate-structure',
  'product-compliance', 'logistics-customs', 'legal-advisory', 'environment'];
export const MARKETS = ['DE', 'FR', 'US', 'UK', 'IT', 'ES', 'NL', 'TR'];
const REGULATED = new Set(['tax-vat', 'legal-advisory']);
const PLANS = ['essential', 'growth', 'global'];
const AREAS_PER_PLAN = { essential: 1, growth: 2, global: 3 }; // category_allowance 1 / 5 / unbegrenzt
const MARKETS_PER_PROVIDER = 3;

const MARKET = {
  DE: { tz: 'Europe/Berlin', lang: ['de', 'en'], stripe: 'DE', region: 'Deutschland' },
  FR: { tz: 'Europe/Paris', lang: ['fr', 'en'], stripe: 'FR', region: 'France' },
  US: { tz: 'America/New_York', lang: ['en'], stripe: 'US', region: 'United States' },
  UK: { tz: 'Europe/London', lang: ['en'], stripe: 'GB', region: 'United Kingdom' },
  IT: { tz: 'Europe/Rome', lang: ['it', 'en'], stripe: 'IT', region: 'Italia' },
  ES: { tz: 'Europe/Madrid', lang: ['es', 'en'], stripe: 'ES', region: 'España' },
  NL: { tz: 'Europe/Amsterdam', lang: ['nl', 'en'], stripe: 'NL', region: 'Nederland' },
  TR: { tz: 'Europe/Istanbul', lang: ['tr', 'en'], stripe: 'TR', region: 'Türkiye' },
};

// Frei erfundene Kunstnamen — bewusst keine Nachnamen-Kombinationen, die nach
// einer echten Kanzlei klingen.
const BRANDS = ['Orvanta', 'Kelvane', 'Tessmark', 'Quillon', 'Selvara', 'Novenna', 'Brevikon', 'Castrel', 'Duvaine',
  'Elmara', 'Fennick', 'Galdora', 'Halvex', 'Isoren', 'Jorvale', 'Korrin', 'Lunaro', 'Mirvane', 'Norrel', 'Ostrava',
  'Pellion', 'Rhovan', 'Sarvent', 'Tolvane', 'Ulvara'];
const AREA_LABEL = { 'tax-vat': 'Tax & VAT', 'product-packaging': 'Packaging & EPR', 'data-privacy': 'Data Privacy',
  'marketing-seo': 'Marketing Compliance', 'corporate-structure': 'Corporate Services', 'product-compliance': 'Product Compliance',
  'logistics-customs': 'Customs & Trade', 'legal-advisory': 'Legal', environment: 'Environmental Compliance' };
const HOURS = [
  { mon: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '17:00' }], tue: [{ from: '09:00', to: '12:00' }], wed: [{ from: '14:00', to: '17:00' }], thu: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '17:00' }], fri: [{ from: '09:00', to: '12:00' }] },
  { mon: [{ from: '10:00', to: '13:00' }], wed: [{ from: '10:00', to: '13:00' }, { from: '15:00', to: '18:00' }], fri: [{ from: '10:00', to: '13:00' }] },
  { tue: [{ from: '08:30', to: '11:30' }, { from: '13:30', to: '16:30' }], thu: [{ from: '08:30', to: '11:30' }, { from: '13:30', to: '16:30' }] },
];

/** Plan der 25 Provider — rein, ohne Netz; testbar. Gierig: jeder Provider
 *  nimmt die bisher am duennsten besetzten Bereiche und Maerkte. */
export function buildPlan(emailBase) {
  const [local, domain] = emailBase.split('@');
  const areaCount = Object.fromEntries(AREAS.map((a) => [a, 0]));
  const cell = new Map(); // `${area}|${market}` -> n
  const key = (a, m) => `${a}|${m}`;
  const out = [];
  for (let i = 0; i < COUNT; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const plan = PLANS[i % PLANS.length];
    const areas = [...AREAS].sort((a, b) => areaCount[a] - areaCount[b] || AREAS.indexOf(a) - AREAS.indexOf(b))
      .slice(0, AREAS_PER_PLAN[plan]);
    const score = (m) => areas.reduce((s, a) => s + (cell.get(key(a, m)) ?? 0), 0);
    const markets = [...MARKETS].sort((a, b) => score(a) - score(b) || ((MARKETS.indexOf(a) + i) % 8) - ((MARKETS.indexOf(b) + i) % 8))
      .slice(0, MARKETS_PER_PROVIDER);
    for (const a of areas) { areaCount[a]++; for (const m of markets) cell.set(key(a, m), (cell.get(key(a, m)) ?? 0) + 1); }
    const brand = BRANDS[i];
    out.push({
      nn, plan, areas, markets,
      provider_key: `${PREFIX}${nn}-${brand.toLowerCase()}`,
      name: `${brand} ${AREA_LABEL[areas[0]]}`,
      email: `${local}+p${nn}@${domain}`,
      home: markets[0],
      hours: HOURS[i % HOURS.length],
    });
  }
  const gaps = [];
  for (const a of AREAS) for (const m of MARKETS) if (!cell.get(key(a, m))) gaps.push(key(a, m));
  return { providers: out, cell, gaps };
}

// ─── Netz ───────────────────────────────────────────────────────────────────
function env(k) {
  const v = (process.env[k] || '').trim();
  if (!v) { console.error(`✗ ${k} fehlt`); process.exit(2); }
  return v;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const remove = args.includes('--remove');
  const ref = args[args.indexOf('--ref') + 1];
  const url = env('TARGET_SUPABASE_URL').replace(/\/$/, '');
  const sr = env('TARGET_SERVICE_ROLE_KEY');
  if (!args.includes('--ref') || !ref || ref.startsWith('--')) { console.error('✗ --ref <projekt-ref> fehlt'); process.exit(2); }
  if (ref === STAGING_REF || url.includes(STAGING_REF)) { console.error('✗ Staging ist kein Ziel fuer Test-Provider.'); process.exit(2); }
  if (!url.includes(`//${ref}.`)) { console.error(`✗ --ref ${ref} passt nicht zu ${url}`); process.exit(2); }
  const stripeKey = (apply || remove) ? env('STRIPE_SECRET_KEY') : (process.env.STRIPE_SECRET_KEY || '');
  if (stripeKey && !stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('rk_test_')) {
    console.error('✗ STRIPE_SECRET_KEY ist kein Testschluessel — Test-Provider nur im Stripe-Testmodus.'); process.exit(2);
  }

  const H = (extra = {}) => ({ apikey: sr, Authorization: `Bearer ${sr}`, 'Content-Type': 'application/json', ...extra });
  async function rest(method, path, body, prefer) {
    const res = await fetch(`${url}${path}`, { method, headers: H(prefer ? { Prefer: prefer } : {}), body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  }
  async function stripe(method, path, form) {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      method, headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`Stripe ${method} ${path} → ${res.status} ${j?.error?.message}`);
    return j;
  }
  async function findUser(email) {
    for (let page = 1; page < 50; page++) {
      const j = await rest('GET', `/auth/v1/admin/users?page=${page}&per_page=200`);
      const hit = (j.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
      if (hit) return hit;
      if ((j.users || []).length < 200) return null;
    }
    return null;
  }

  if (remove) return removeAll({ rest, stripe });

  const emailBase = env('SEED_EMAIL');
  if (!/^[^@+\s]+@[^@\s]+$/.test(emailBase)) { console.error('✗ SEED_EMAIL ohne +, z. B. demet@complihub360.com'); process.exit(2); }
  const { providers, cell, gaps } = buildPlan(emailBase);
  if (gaps.length) { console.error(`✗ Luecken in der Verteilung: ${gaps.join(', ')}`); process.exit(1); }

  console.log(`${apply ? 'SCHREIBT' : 'Probelauf'} · ${url} · ${providers.length} Test-Provider\n`);
  console.log('Abdeckung (Provider je Bereich und Markt):');
  console.log(`  ${''.padEnd(20)}${MARKETS.map((m) => m.padStart(4)).join('')}`);
  for (const a of AREAS) console.log(`  ${a.padEnd(20)}${MARKETS.map((m) => String(cell.get(`${a}|${m}`) ?? 0).padStart(4)).join('')}`);
  console.log('');
  for (const p of providers) console.log(`  p${p.nn}  ${p.plan.padEnd(9)} ${p.name.padEnd(34)} ${p.areas.join(',').padEnd(52)} ${p.markets.join(' ')}`);

  const cats = await rest('GET', '/rest/v1/service_categories?select=code,parent_code,label_en&active=is.true&order=sort_order');
  const subs = (area) => cats.filter((c) => c.parent_code === area);
  const existing = new Set((await rest('GET', `/rest/v1/providers?select=provider_key&provider_key=like.${PREFIX}*`)).map((r) => r.provider_key));
  if (!apply) {
    console.log(`\nIm Ziel schon vorhanden: ${existing.size}. Nichts geschrieben. Mit --apply ausfuehren.`);
    return;
  }
  const password = env('SEED_PASSWORD');
  if (password.length < 16) { console.error('✗ SEED_PASSWORD: mindestens 16 Zeichen'); process.exit(2); }

  const now = new Date();
  const iso = (d) => d.toISOString();
  const plusDays = (n) => new Date(now.getTime() + n * 86400000);
  let created = 0;
  for (const [i, p] of providers.entries()) {
    if (existing.has(p.provider_key)) { console.log(`  = p${p.nn} vorhanden, uebersprungen`); continue; }
    const m = MARKET[p.home];

    // 1. Login
    let user = await findUser(p.email);
    if (!user) {
      user = await rest('POST', '/auth/v1/admin/users', {
        email: p.email, password, email_confirm: true,
        app_metadata: { role: 'partner' }, user_metadata: { role: 'partner', seed: 'beta-test-provider' },
      });
    }

    // 2. Stripe-Testkunde mit Testkarte
    const cus = await stripe('POST', '/customers', {
      name: p.name, email: p.email, 'address[country]': m.stripe,
      'metadata[seed]': 'beta-test-provider', 'metadata[provider_key]': p.provider_key,
    });
    const pm = await stripe('POST', '/payment_methods/pm_card_visa/attach', { customer: cus.id });
    await stripe('POST', `/customers/${cus.id}`, { 'invoice_settings[default_payment_method]': pm.id });

    // 3. Provider
    await rest('POST', '/rest/v1/providers', {
      provider_key: p.provider_key, name: p.name, contact_email: p.email,
      partner_status: 'active', lifecycle_status: 'active', lifecycle_status_since: iso(now),
      lifecycle_status_reason: 'Beta-Testprovider (Seed)', availability: 'available',
      billing_ready: true, billing_block_reasons: [], stripe_customer_id: cus.id,
      billing_country: m.stripe, billing_model: 'mixed', region: m.region,
      languages: [...new Set(p.markets.flatMap((k) => MARKET[k].lang))],
      countries_supported: p.markets, categories: p.areas,
      timezone: m.tz, availability_hours: p.hours,
      active_since: 2012 + (i % 10), sla_target_confirm_hours: 24, sla_target_reply_hours: 48,
    }, 'return=minimal');
    await rest('POST', '/rest/v1/provider_confidential', {
      provider_key: p.provider_key, representative_name: 'CompliHub360 Beta-Team', entity_type: 'test',
    }, 'return=minimal');
    await rest('POST', '/rest/v1/provider_members', { provider_key: p.provider_key, user_id: user.id, role: 'owner' }, 'return=minimal');

    // 4. Leistungen, Abdeckung, Nachweise
    for (const [k, area] of p.areas.entries()) {
      const list = subs(area);
      const sub = list[(i + k) % Math.max(list.length, 1)] ?? { code: area, label_en: AREA_LABEL[area] };
      const base = 400 + ((i * 7 + k * 3) % 9) * 150;
      const [svc] = await rest('POST', '/rest/v1/provider_services', {
        provider_key: p.provider_key, service_code: sub.code, service_name: sub.label_en,
        description: `${sub.label_en} — Beta-Testleistung.`,
        status: 'approved', capacity_status: 'open', pricing_model: 'project',
        price_min: base, price_max: base * 2, currency: 'EUR', pricing_basis: 'per project',
        response_time_hours: [24, 48, 24][i % 3], completion_days_estimate: 5 + (i % 4) * 5,
      }, 'return=representation');
      await rest('POST', '/rest/v1/provider_service_coverage', p.markets.map((c) => ({
        service_id: svc.id, country_code: c, status: 'approved', approved_at: iso(now),
      })), 'return=minimal');
      if (REGULATED.has(area)) {
        await rest('POST', '/rest/v1/provider_evidence', {
          provider_key: p.provider_key, evidence_type: 'professional_licence', source: 'registry_check',
          issuing_authority: 'Beta-Test (kein echtes Register)', identifier: `TEST-${p.nn}-${area}`,
          covered_entity: p.name, result: 'reviewed', reviewed_at: iso(now),
          supports_service_codes: [sub.code], supports_countries: p.markets,
          issue_date: '2024-01-01', expires_at: iso(plusDays(365)).slice(0, 10),
          reviewer_notes: 'Seed: Beta-Testprovider',
        }, 'return=minimal');
      }
    }
    for (const t of ['incorporation', 'insurance']) {
      await rest('POST', '/rest/v1/provider_evidence', {
        provider_key: p.provider_key, evidence_type: t, source: 'registry_check',
        issuing_authority: 'Beta-Test (kein echtes Register)', identifier: `TEST-${p.nn}-${t}`,
        covered_entity: p.name, result: 'reviewed', reviewed_at: iso(now), reviewer_notes: 'Seed: Beta-Testprovider',
      }, 'return=minimal');
    }

    // 5. Vereinbarungen und Abo
    await rest('POST', '/rest/v1/provider_agreement_acceptance',
      ['provider_agreement', 'privacy_notice', 'billing_authorization', 'commercial_terms'].map((t) => ({
        provider_key: p.provider_key, agreement_type: t, version: AGREEMENT_VERSION, language: 'en',
        accepted_at: iso(now), accepted_by_name: 'CompliHub360 Beta-Team',
      })), 'return=minimal');
    await rest('POST', '/rest/v1/provider_subscriptions', {
      provider_key: p.provider_key, plan_code: p.plan, plan_version: 1, cadence: 'monthly', status: 'active',
      current_period_start: iso(now), current_period_end: iso(plusDays(30)), renewal_date: iso(plusDays(30)),
      started_at: iso(now), source: 'admin',
    }, 'return=minimal');

    created++;
    console.log(`  + p${p.nn} ${p.provider_key} angelegt (${p.email})`);
  }

  // 6. Gegenprobe: was das Matching sieht
  const view = await rest('GET', `/rest/v1/matchable_provider_services?select=provider_key,area_code,country_code&provider_key=like.${PREFIX}*`);
  const seen = new Set(view.map((r) => `${r.area_code}|${r.country_code}`));
  const missing = [];
  for (const a of AREAS) for (const mk of MARKETS) if (!seen.has(`${a}|${mk}`)) missing.push(`${a}|${mk}`);
  console.log(`\n${created} angelegt. Matching sieht ${new Set(view.map((r) => r.provider_key)).size} Test-Provider, ${seen.size}/${AREAS.length * MARKETS.length} Zellen.`);
  if (missing.length) { console.error(`✗ Im Matching fehlen: ${missing.join(', ')}`); process.exit(1); }
  console.log('✓ Jede Zelle hat mindestens einen buchbaren Test-Provider.');
}

async function removeAll({ rest, stripe }) {
  const rows = await rest('GET', `/rest/v1/providers?select=provider_key,stripe_customer_id&provider_key=like.${PREFIX}*`);
  console.log(`Entferne ${rows.length} Test-Provider …`);
  for (const r of rows) {
    const k = encodeURIComponent(r.provider_key);
    const booked = await rest('GET', `/rest/v1/scheduling?select=id&provider_key=eq.${k}&limit=1`).catch(() => []);
    if (booked.length) { console.log(`  ! ${r.provider_key} hat Termine — bleibt stehen (erst Termine klaeren).`); continue; }
    const members = await rest('GET', `/rest/v1/provider_members?select=user_id&provider_key=eq.${k}`);
    const svcs = await rest('GET', `/rest/v1/provider_services?select=id&provider_key=eq.${k}`);
    for (const s of svcs) await rest('DELETE', `/rest/v1/provider_service_coverage?service_id=eq.${s.id}`);
    for (const t of ['provider_services', 'provider_evidence', 'provider_agreement_acceptance', 'provider_subscriptions',
      'provider_confidential', 'provider_members']) {
      await rest('DELETE', `/rest/v1/${t}?provider_key=eq.${k}`);
    }
    await rest('DELETE', `/rest/v1/providers?provider_key=eq.${k}`);
    for (const m of members) await rest('DELETE', `/auth/v1/admin/users/${m.user_id}`).catch((e) => console.log(`  ! Login ${m.user_id}: ${e.message}`));
    if (r.stripe_customer_id) await stripe('DELETE', `/customers/${r.stripe_customer_id}`).catch((e) => console.log(`  ! Stripe: ${e.message}`));
    console.log(`  - ${r.provider_key}`);
  }
  console.log('Fertig.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
}
