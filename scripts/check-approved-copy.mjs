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
 *  und "Information Sharing Confirmation". */
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

if (fehler.length === 0) {
  const n = Object.keys(AKTIONEN_JE_ZUSTAND).length;
  console.log(`Abgenommene Zustands-Copy wortgleich (${n} Zustaende, ${Object.keys(VORLAGE.actions).length} Aktionen, Sharing-Dialog).`);
  process.exit(0);
}

console.error(`\n${fehler.length} Abweichung(en) von der abgenommenen Copy:\n`);
for (const f of fehler) console.error(`  ${f}`);
console.error(`\nQuelle: Technical and UX Acceptance Checklist v1.0, "Approved UX State Copy".`);
console.error(`Eine Aenderung braucht eine neue Abnahme und gehoert dann in VORLAGE oben.\n`);
process.exit(1);
