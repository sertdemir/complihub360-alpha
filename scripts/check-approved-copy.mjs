#!/usr/bin/env node
// ─── Waechter: abgenommene Zustands-Copy bleibt wortgleich ──────────────────
//
// Die "Technical and UX Acceptance Checklist v1.0" (19.09.2026) enthaelt im
// Abschnitt "Approved UX State Copy" 17 Zustaende — je Ueberschrift, Text und
// Aktionen — und den Dialog "Review what will be shared". Die Checklist sagt
// dazu: "Use the approved state copy in this document."
//
// Abgenommen heisst: nicht umformulierbar ohne neue Abnahme. Die englischen
// Werte in `common:states.*` muessen deshalb Zeichen fuer Zeichen der Vorlage
// entsprechen, einschliesslich des typografischen Apostrophs (U+2019), den die
// Vorlage verwendet. Wer die Copy aendern will, aendert sie HIER, mit Verweis
// auf die neue Abnahme — dann steht die Aenderung im Review, statt still in
// einer Sprachdatei.
//
// Was dieser Waechter NICHT prueft: ob die Aussage einer Copy heute stimmt.
// Mehrere Zustaende versprechen Verhalten, das es noch nicht gibt ("You can
// request this market", "We have shared only the information shown in your
// booking confirmation"). Solche Copy darf erst auf eine Flaeche, wenn das
// Verhalten existiert. Welche das sind, steht im Ticket TKT-COPY-01 — ein
// Muster kann Wahrheit nicht pruefen.
//
//   node scripts/check-approved-copy.mjs      pruefen (Exit 1 bei Abweichung)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EN = resolve(ROOT, 'apps/vs1-demo/ui/public/locales/en/common.json');

/** Die Vorlage, wortgleich. Quelle: Checklist v1.0, "Approved UX State Copy"
 *  und "Information Sharing Confirmation"; dazu die Canvas-Abnahmen vom
 *  22.09.2026 und 27.09.2026 (Bloecke am Ende). */
const VORLAGE = {
  "riskMapLoading": {
    "heading": "Creating your Risk Map",
    "message": "We’re reviewing your answers and organizing the requirements that may apply."
  },
  "riskMapDelayed": {
    "heading": "This is taking a little longer than expected",
    "message": "Your answers are saved. You can wait here or return and try again."
  },
  "riskMapFailed": {
    "heading": "We couldn’t create your Risk Map",
    "message": "Please try again. If the problem continues, contact support."
  },
  "noRequirements": {
    "heading": "No immediate requirements identified",
    "message": "Based on the information provided, we did not identify an immediate requirement. This does not mean that no obligations apply. Review your answers or update your Risk Map when your business changes."
  },
  "moreInfoNeeded": {
    "heading": "We need a little more information",
    "message": "Answer the remaining questions so we can assess this area more accurately."
  },
  "noProviderMatch": {
    "heading": "No verified provider is available for this request yet",
    "message": "We do not currently have a verified provider covering this combination of market and service. You can request this market and choose to be notified when coverage becomes available."
  },
  "oneProviderMatch": {
    "heading": "We found one provider that matches your current needs",
    "message": "Review the provider’s expertise, coverage, expected price range, and availability before deciding whether to book a consultation."
  },
  "multipleProviderMatches": {
    "heading": "Compare your best matches",
    "message": "Review anonymous provider matches based on relevant expertise, coverage, service quality, availability, and fit."
  },
  "limitedCoverage": {
    "heading": "Provider coverage is currently limited",
    "message": "We found limited coverage for this market or service. You can review the available match or request additional coverage."
  },
  "providerResponseOverdue": {
    "heading": "The provider has not responded yet",
    "message": "The expected response time has passed. You can continue waiting or ask CompliHub360 to show you another match. Your information will not be shared with another provider unless you approve it."
  },
  "alternativeAvailable": {
    "heading": "Another provider may be available",
    "message": "Review the alternative match before deciding. We will not share your information unless you choose and book the provider."
  },
  "bookingProcessing": {
    "heading": "Booking your consultation",
    "message": "Please keep this page open while we confirm your request."
  },
  "bookingConfirmed": {
    "heading": "Your consultation is booked",
    "message": "The provider’s identity and full profile are now available. We have shared only the information shown in your booking confirmation."
  },
  "bookingFailed": {
    "heading": "We couldn’t complete your booking",
    "message": "No booking was created and your information was not shared. Please try again or contact support."
  },
  "marketUnavailable": {
    "heading": "Coverage is not available for this market yet",
    "message": "Request this market and choose whether you would like to receive an availability update."
  },
  "sessionExpired": {
    "heading": "Your session has expired",
    "message": "For your security, please sign in again to continue. Your saved information remains in your account."
  },
  "formErrorSummary": {
    "heading": "Please review the highlighted information",
    "message": "Some information is missing or needs to be corrected before you can continue."
  },
  "actions": {
    "tryAgain": "Try Again",
    "returnToAssessment": "Return to Assessment",
    "contactSupport": "Contact Support",
    "reviewMyAnswers": "Review My Answers",
    "answerQuestions": "Answer Questions",
    "doThisLater": "Do This Later",
    "requestThisMarket": "Request This Market",
    "returnToMyRiskMap": "Return to My Risk Map",
    "reviewMatch": "Review Match",
    "viewMyMatches": "View My Matches",
    "reviewAvailableMatch": "Review Available Match",
    "requestMoreCoverage": "Request More Coverage",
    "keepWaiting": "Keep Waiting",
    "seeAnotherMatch": "See Another Match",
    "reviewAlternative": "Review Alternative",
    "keepCurrentRequest": "Keep Current Request",
    "viewProviderProfile": "View Provider Profile",
    "viewBooking": "View Booking",
    "exploreOtherMarkets": "Explore Other Markets",
    "signIn": "Sign In"
  },
  "sharingReview": {
    "heading": "Review what will be shared",
    "body": "To process your consultation request, CompliHub360 will share the information listed below with the provider you selected. Your information will not be shared with other providers unless you make another selection and approve it.",
    "confirmation": "I understand and want to continue with this booking.",
    "confirmAndBook": "Confirm and Book",
    "goBack": "Go Back"
  },
  // ── Zweite Abnahme: Canvas "Risk Map · leere Zustaende", Wahl A3/B3/C3 ──
  // Vom Nutzer am 22.09.2026 abgenommen ("Copy ist abgenommen"). Nicht aus
  // der Checklist, aber mit demselben Status: umformulieren nur mit Abnahme.
  // B3 (Risk Map failed) nennt, was geprueft werden SOLLTE; C3 (keine
  // Pflichten) nennt, was geprueft WURDE — derselbe Kasten, andere Aussage.
  "scope": {
    "triedToAssess": "What we tried to assess",
    "checked": "What we checked",
    "markets": "Markets",
    "areas": "Areas"
  },
  // Aufklappbar unter "Risk Map failed": Referenz-ID und Zeitpunkt (UTC) des
  // gescheiterten Aufrufs, damit der Support ihn im Log findet.
  "technicalDetails": "Technical details",
  // ── Dritte Abnahme: Canvas "Risk Map · Markt ohne Abdeckung", Wahl
  // D3/E3/F3 (Figma 3470:2011/2129/2221). Vom Nutzer am 27.09.2026
  // abgenommen ("Copy abgenommen, Abschalten weglassen"): "You can switch it
  // off any time" steht bewusst NICHT in notifyHelp — ein Abschalten gibt es
  // nicht, und Copy fuer fehlendes Verhalten kommt nicht auf die Flaeche.
  "marketRequest": {
    "notCovered": "Not covered yet",
    "alsoNotCovered": "Also not covered yet",
    "sent": "Request sent for {{markets}}",
    "sentBody": "We count requests per market to decide where coverage comes next. We can’t promise a date.",
    "notifyLabel": "Email me when {{market}} is covered",
    "notifyHelp": "We’ll email you at {{email}}. Only for this market.",
    "failed": "We couldn’t send your request. Please try again.",
    // Canvas-Wahl G2 (01.10.2026, "ok übernehme deine Empfehlung"): der Satz
    // unter der Überschrift für Gäste — ohne die Update-Wahl, die nur ein
    // Konto hat. Eingeloggt bleibt marketUnavailable.message.
    "guestMessage": "Request this market. We count requests per market to decide where coverage comes next."
  },
  // ── Vierte Abnahme: gemischte Märkte (DE + BR), Canvas-Wahl I1 · J1 · K3,
  // Figma 3546:2497 / 2657 / 20736, abgenommen 01.10.2026. Mindestens ein
  // Markt geprüft, mindestens ein angefragter nicht — die Map darf dann nicht
  // so tun, als sei sie vollständig.
  "marketPartial": {
    "heading": "{{market}} was not checked",
    "message": "We don’t cover {{market}} yet, so these obligations don’t include it.",
    "notChecked": "Not checked",
    "notIncluded": "Not covered yet · not included in this map"
  },
  // ── Fünfte Abnahme: Partner-Dashboard ohne Fixtures, Canvas-Wahl
  // A2 · B3 · C3 · D1 · E2 (09.10.2026, „deine Canvas-Empfehlung"), Copy
  // abgenommen 09.10.2026 („copy ok"). Laden fehlgeschlagen, noch nichts da,
  // Leistung unter der Schwelle (5 Anfragen), Abdeckung als Spiegel der
  // Freigabe, Profil nicht geladen. Aktionen: tryAgain + contactSupport.
  "partner": {
    "loadFailed": {
      "requests": "Your requests couldn’t be loaded",
      "appointments": "Your appointments couldn’t be loaded",
      "invoices": "Your invoices couldn’t be loaded",
      "currentPeriod": "This month’s billing couldn’t be loaded",
      "plan": "Your plan couldn’t be loaded",
      "performance": "Your performance data couldn’t be loaded",
      "notifications": "Your notifications couldn’t be loaded",
      "coverage": "Your coverage couldn’t be loaded",
      "message": "Nothing in your account has changed. We just can’t show it right now. Please try again. If this keeps happening, contact support."
    },
    "empty": {
      "appointments": "No appointments yet",
      "requests": "No requests yet",
      "howBookingWorks": "An appointment is created when a business selects you in the results and books one of your available times. For that to be possible:",
      "closing": "How often you’re booked depends on demand in your areas. Your plan doesn’t change that.",
      "invoicesHeading": "No invoices yet",
      "invoicesMessage": "Your invoices appear here once a plan has been billed."
    },
    "readiness": {
      "verified": "Verification completed",
      "verifiedSub": "Approved for {{areas}} in {{markets}}",
      "verifying": "Verification in progress",
      "verifyingSub": "Our review team is checking your documents.",
      "plan": "Plan active",
      "planSub": "{{plan}} · {{cycle}}",
      "noPlan": "No plan yet",
      "noPlanAction": "Choose a plan",
      "payment": "Payment method on file",
      "paymentSub": "{{method}}",
      "noPayment": "No payment method yet",
      "noPaymentSub": "Without one, you appear in the results but can’t be booked.",
      "noPaymentAction": "Add payment method"
    },
    "performance": {
      "requestsSoFar": "Requests so far",
      "sinceApproval": "since approval on {{date}}",
      "belowThreshold": "from 5 requests",
      "thresholdNote": "A rate based on one or two requests says little about you. That’s why we show it from five requests."
    },
    "coverage": {
      "heading": "Where you appear",
      "message": "As approved by our review team. To change it, submit the change under Services. It applies after review.",
      "approved": "approved",
      "underReview": "under review",
      "notRequested": "not requested",
      "languages": "Languages",
      "responseTime": "Response time",
      "hours": "{{hours}} hours",
      "submitChange": "Submit a change"
    },
    "profileUnavailable": "Your saved profile can’t be reached right now. Saving works again once it has loaded."
  }
};

/** Welche Aktionen zu welchem Zustand gehoeren, in der Reihenfolge der
 *  Vorlage. Eine Flaeche, die einen Zustand zeigt, zeigt genau diese. */
export const AKTIONEN_JE_ZUSTAND = {
  "riskMapLoading": [],
  "riskMapDelayed": [
    "tryAgain",
    "returnToAssessment"
  ],
  "riskMapFailed": [
    "tryAgain",
    "contactSupport"
  ],
  "noRequirements": [
    "reviewMyAnswers"
  ],
  "moreInfoNeeded": [
    "answerQuestions",
    "doThisLater"
  ],
  "noProviderMatch": [
    "requestThisMarket",
    "returnToMyRiskMap"
  ],
  "oneProviderMatch": [
    "reviewMatch",
    "returnToMyRiskMap"
  ],
  "multipleProviderMatches": [
    "viewMyMatches"
  ],
  "limitedCoverage": [
    "reviewAvailableMatch",
    "requestMoreCoverage"
  ],
  "providerResponseOverdue": [
    "keepWaiting",
    "seeAnotherMatch"
  ],
  "alternativeAvailable": [
    "reviewAlternative",
    "keepCurrentRequest"
  ],
  "bookingProcessing": [],
  "bookingConfirmed": [
    "viewProviderProfile",
    "viewBooking"
  ],
  "bookingFailed": [
    "tryAgain",
    "contactSupport"
  ],
  "marketUnavailable": [
    "requestThisMarket",
    "exploreOtherMarkets"
  ],
  "sessionExpired": [
    "signIn"
  ],
  "formErrorSummary": []
};

function* blaetter(o, pfad = '') {
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) yield* blaetter(v, pfad ? `${pfad}.${k}` : k);
  } else {
    yield [pfad, o];
  }
}

const ist = JSON.parse(readFileSync(EN, 'utf8')).states ?? {};
const fehler = [];

// 1. Jeder Wert der Vorlage steht wortgleich in der Sprachdatei.
for (const [pfad, soll] of blaetter(VORLAGE)) {
  const wert = pfad.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ist);
  if (wert === undefined) fehler.push(`fehlt      states.${pfad}`);
  else if (wert !== soll) fehler.push(`weicht ab  states.${pfad}\n      Vorlage: ${soll}\n      Datei:   ${wert}`);
}

// 2. Nichts in `states`, das die Vorlage nicht kennt — sonst waere es
//    ungepruefte Copy unter einem Namen, der Abnahme verspricht.
for (const [pfad] of blaetter(ist)) {
  const inVorlage = pfad.split('.').reduce((o, k) => (o == null ? undefined : o[k]), VORLAGE);
  if (inVorlage === undefined) fehler.push(`unbekannt  states.${pfad} (nicht Teil der Abnahme)`);
}

// 3. Jede Aktion, die ein Zustand braucht, ist definiert.
for (const [zustand, aktionen] of Object.entries(AKTIONEN_JE_ZUSTAND)) {
  if (!VORLAGE[zustand]) fehler.push(`Zustand ohne Copy: ${zustand}`);
  for (const a of aktionen) if (!VORLAGE.actions[a]) fehler.push(`${zustand}: Aktion ${a} fehlt`);
}

// 4. Reserviertes Wort (ADR-0008, Wahl D2): Auf /billing (`providerws.billing.*`)
//    bezeichnet „Kulanzfrist" ausschliesslich die beschlossene Frist fuer
//    offene Rechnungen (ADR-0006 A2) — also nur Schluessel `grace*`. Vorher
//    nannte dieselbe Seite eine Kulanzfrist nach gescheiterter Zahlung, die es
//    nie gab, und drohte mit einer Workspace-Sperre, die nicht eintritt.
const RESERVIERT = {
  de: [/kulanz/i, /workspace-sperre/i],
  en: [/\bgrace\b/i, /workspace lock/i],
  es: [/gracia/i, /bloqueo del workspace/i],
  tr: [/ek süre/i, /çalışma alanı kilidi/i],
};
for (const [sprache, muster] of Object.entries(RESERVIERT)) {
  const datei = resolve(ROOT, `apps/vs1-demo/ui/public/locales/${sprache}/providerws.json`);
  const billing = JSON.parse(readFileSync(datei, 'utf8')).billing ?? {};
  for (const [pfad, wert] of blaetter(billing)) {
    if (pfad.startsWith('grace') || typeof wert !== 'string') continue;
    for (const m of muster) {
      if (m.test(wert)) fehler.push(`reserviert ${sprache}/providerws billing.${pfad}: „${wert}" — ${m} steht auf /billing nur in grace*-Schluesseln (ADR-0008 D2)`);
    }
  }
}

// 5. Auth-Mails (Canvas „Auth-Mails ehrlich", Wahl 10.10.2026: A1 · B1 · C1 ·
//    D1 · E1). Die Supabase-Vorlagen unter docs/email-templates/ tragen die
//    abgenommenen Saetze; Betreff und Ablaufzeit stehen in supabase-auth.json.
//    Verboten, was die Abnahme ersetzt hat: das Versprechen „partner matches
//    are waiting" (galt nicht fuer jede Registrierung), die vage Laufzeit,
//    die Positionierungszeile im Fuss und „securely" als Behauptung.
const MAIL_DIR = resolve(ROOT, 'docs/email-templates');
const ENTITIES = { '&rsquo;': '’', '&mdash;': '—', '&nbsp;': ' ', '&rarr;': '→', '&amp;': '&' };
const klartext = (html) => html
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&[a-z]+;/g, (e) => ENTITIES[e] ?? e)
  .replace(/\s+/g, ' ')
  .trim();
const MAIL_FUSS = 'CompliHub360 — Always on your side.';
const MAIL_HINWEIS = 'This link works once and expires after 30 minutes.';
const MAILS = {
  confirmation: {
    subject: 'Confirm your email for CompliHub360',
    saetze: ['Confirm your email.', 'Welcome to CompliHub360. Confirm your email address to activate your account. If you started a Risk Map before signing up, you’ll find it in your workspace.', 'Confirm email →', MAIL_HINWEIS, 'Open it in the same browser you signed up in.', 'Didn’t sign up? Ignore this email. No account will be activated.', MAIL_FUSS, 'You received this email because an account was created with this address on complihub360.com.'],
  },
  magic_link: {
    subject: 'Your CompliHub360 sign-in link',
    saetze: ['Your sign-in link.', 'Use the button below to sign in to CompliHub360. No password needed. This link is your key, so please don’t forward it.', 'Sign in to CompliHub360 →', MAIL_HINWEIS, 'Open it in the same browser you requested it from.', 'Didn’t request this? Ignore this email. Nobody can sign in without the link.', MAIL_FUSS, 'You received this email because a sign-in link was requested for this address on complihub360.com.'],
  },
  recovery: {
    subject: 'Reset your CompliHub360 password',
    saetze: ['Reset your password.', 'We received a request to reset the password for your CompliHub360 account. Choose a new one with the button below.', 'Set a new password →', MAIL_HINWEIS, 'Open it in the same browser you requested it from.', 'Didn’t request this? Ignore this email. Your password stays as it is.', MAIL_FUSS, 'You received this email because a password reset was requested for this address on complihub360.com.'],
  },
};
const MAIL_VERBOTEN = [/partner matches are waiting/i, /orchestration layer/i, /e-mail/i, /short time/i, /securely/i];
const authCfg = JSON.parse(readFileSync(resolve(MAIL_DIR, 'supabase-auth.json'), 'utf8'));
if (authCfg.otp_expiry_seconds !== 1800) fehler.push(`Auth-Mails: otp_expiry_seconds ist ${authCfg.otp_expiry_seconds}, die Mails sagen „30 minutes" (Wahl D1)`);
for (const [art, soll] of Object.entries(MAILS)) {
  const eintrag = authCfg.templates?.[art];
  if (!eintrag) { fehler.push(`Auth-Mails: ${art} fehlt in supabase-auth.json`); continue; }
  if (eintrag.subject !== soll.subject) fehler.push(`Auth-Mails: Betreff ${art}\n      Vorlage: ${soll.subject}\n      Datei:   ${eintrag.subject}`);
  let text;
  try { text = klartext(readFileSync(resolve(MAIL_DIR, eintrag.file), 'utf8')); } catch { fehler.push(`Auth-Mails: ${eintrag.file} fehlt`); continue; }
  for (const satz of soll.saetze) if (!text.includes(satz)) fehler.push(`Auth-Mails: ${eintrag.file} — fehlt wortgleich: „${satz}"`);
  for (const m of MAIL_VERBOTEN) if (m.test(text)) fehler.push(`Auth-Mails: ${eintrag.file} — ersetzt und nicht mehr erlaubt: ${m}`);
  if (!/\{\{ \.ConfirmationURL \}\}/.test(readFileSync(resolve(MAIL_DIR, eintrag.file), 'utf8'))) fehler.push(`Auth-Mails: ${eintrag.file} — {{ .ConfirmationURL }} fehlt`);
}

if (fehler.length === 0) {
  const n = Object.keys(AKTIONEN_JE_ZUSTAND).length;
  console.log(`Abgenommene Zustands-Copy wortgleich (${n} Zustaende, ${Object.keys(VORLAGE.actions).length} Aktionen, Sharing-Dialog, Umfang und Technical details; reserviertes Wort auf /billing; drei Auth-Mails mit Betreff und Ablaufzeit).`);
  process.exit(0);
}

console.error(`\n${fehler.length} Abweichung(en) von der abgenommenen Copy:\n`);
for (const f of fehler) console.error(`  ${f}`);
console.error(`\nQuelle: Technical and UX Acceptance Checklist v1.0, "Approved UX State Copy".`);
console.error(`Eine Aenderung braucht eine neue Abnahme und gehoert dann in VORLAGE oben.\n`);
process.exit(1);
