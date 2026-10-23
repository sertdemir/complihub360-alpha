# DNA-Copy-Durchgang — 2026-10-18

**Gegenstand:** jeder Text, den ein Nutzer oder Anbieter liest — die englischen Quell-Locales (`apps/vs1-demo/ui/public/locales/en/*.json`, ~305 KB; de/es/tr sind Übersetzungen und folgen), die Mails und Prompts der API (`mailer.ts`, `assistant.ts`, `domain.ts`), der Acknowledgement-Seed (`20261001000000_booking_charge.sql`) und die Fehlertexte der Routen.
**Maßstab:** [`KN-BRAND-001`](../../.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md) §2, §4, §5, §6 und das [Addendum V2](../brand/developer-dna-website-audit-addendum-v2.txt) (§7 AI-Standard, §10 KEEP/CHANGE/ADD/AVOID, §11 Acceptance Test).
**Methode:** fünf unabhängige Lesedurchgänge je Datei-Gruppe mit ausdrücklich mitgegebenen harten Grenzen, danach Gegenprüfung der Blocker im Code (gerendert oder tot?). Heuristische Vorsortierung (Hype-, Angst-, Gewissheits-, Beratungs-Wörter) nur als Einstieg; der Filter prüft Absicht und Wirkung, nicht Wortwahl (ADR-0002).

**Ergebnis:** 7 Blocker · 36 Änderungen · 31 Nits. Keine Stelle setzt Angst gezielt zur Conversion ein, keine konstruiert einen Bedarf, keine gibt die AI als Fachperson aus, keine variiert den Ton nach Unternehmensgröße. Die Blocker sind sachliche Falschaussagen (Gewissheit, die wir nicht haben), veraltete Demo-Texte und Bußgeldbeträge als Blickfang. Der große Rest trägt die DNA bereits gut — siehe „Was schon stimmt".

**Status:** Befunde; Umsetzung nach Wahl des Nutzers je Stelle (DNA-Konflikte entscheidet der Mensch, CLAUDE.md „Bei Konflikt").
**Umgesetzt:** alle 7 Blocker (PR #351, 2026-10-18) · die zehn Änderungen mit der größten Wirkung (PR #353, 2026-10-18): Hero-Titel und -Lead, Proofs 1 und 4, Gast-Countdown, „Founding-member", Brand-Code-Haftungssatz, Absage-Dialog, „Book bindingly", Status-Punkt im Auth-Footer, Risk → Priority im Nutzer-Workspace und Dashboard-Mock, Assistant-Intro und Prompt-Regeln 1/6/Bußgeld sowie die 402-Zeile. Website- und Nutzer-Änderungen aus Abschnitt 2 komplett (PR A, 2026-10-19): Solutions-Texte, Knowledge-Hub-Versprechen, Risk-Panel, Matrix-Spalte, Edge-Case-Satz, howItWorks, SEO-Titel, „zero downtime", Zeitangaben vereinheitlicht („about five minutes"), Matching-Schritt 3, Urgency-Feld aus der Registrierung entfernt, tote Hero-Schlüssel und `founders.stat4Label` gelöscht. Anbieter- und API-Änderungen aus Abschnitt 2 komplett (PR B, 2026-10-20): Help-Scope mit Weg für Gebührenfragen, payment_failed-Grund ohne Widerspruch zum Recheck, Enforcement-Body ohne Sichtbarkeitsversprechen, Notifications- und Requests-Untertitel in Klartext, pricingNoteV2 ohne Gebühr je Profilaufruf, Review-Mail an Nutzer ohne 2-Tage-Frist. Damit sind alle 36 Änderungen umgesetzt. Nits (PR C, 2026-10-20): alle umgesetzt bis auf eine Korrektur — `billing.subtitle` nennt die Band-Spanne zu Recht in USD, die Preiskonfiguration (`lead_band_config`) ist USD; der Befund war falsch und bleibt stehen. Acknowledgement v2 (`20261020000000_booking_ack_v2.sql`, pgTAP 21) mit Diakritika, v1 bleibt für Bestandsbuchungen. Hero-Fragefeld trägt eine Hinweiszeile zur Beta (`heroWorld.ask.note`).

---

## 1 · Blocker — harte Grenze verletzt

| # | Stelle | Text (gekürzt) | Verstoß | Vorschlag |
|---|---|---|---|---|
| C1 | `common.solutions.counsel.benefit1Title` + `benefit1Desc` (gerendert, `/solutions`) | „Zero Hallucinations" / „…No invented claims." | Falsche Gewissheit. Ein Versprechen, das kein Sprachmodell halten kann; der eigene Trust-Center-Text (`aiGov.featPrivacyDesc`) gibt Grenzen zu. | „Source-bound output" / „Every summary, risk label and tip links to the official source it rests on. Where we hold no source, we say so instead of filling the gap." |
| C2 | `common.solutions.counsel.body` | „…demand strict data privacy and zero AI hallucinations. CompliHub360 is a secure, EU-AI-Act ready infrastructure layer…" | Falsche Gewissheit, Overclaim („EU-AI-Act ready"). | „Legal professionals need strict data privacy and output they can trace. CompliHub360 is a privacy-first layer built with the EU AI Act in view: it structures research and external mandates, and every statement carries its source." |
| C3 | `common.solutions.counsel.stat1Label` (gerendert mit festem Wert „100 %") | „PII masked before AI" | Falsche Gewissheit. Die Redaction ist deterministisch per Regex und fängt nicht jeden Namen — der Trust Center sagt das selbst. | „Inputs pass the redaction gate" (das ist zu 100 % wahr) — oder die Kachel streichen. |
| H1 | `home.riskMap.rows[0,1,2,3,7].detail` + `home.riskMapPreview.rows[0–3].detail` (Startseite, direkt über „Create free account") | „Last filed: Q1 2025 · Penalty: €5,000 + 1%/month · UStG §18i" u. a. | Angst als Blickfang. Bußgeldbeträge als Zeilen-Untertitel — genau das, was #56 im Produkt abgeschafft hat und `brandCode.cards[0]` auf derselben Seite verneint („Penalties sit in an obligation's detail, never in its headline"). | Zeile führt mit Handlung und Norm: „Last filed: Q1 2025 · Next return due · UStG §18i (OSS)" · „Producer status to confirm before first shipment · VerpackG §9" · „Renewal due · UK Packaging Regs. 2023 §7". Beträge bleiben im Detail/Quellenkontext. |
| P1 | `providerws.invoiceDetail.failedNote` (gerendert, `InvoiceDetailDrawer`) | „Payment failed — retry or update your payment method in Billing to avoid a workspace lock." | Angst + Falschaussage. Es gibt keinen „workspace lock"; nach Mandat §5 pausieren nur Buchungen, Sichtbarkeit bleibt (so steht es in `billing.paymentFailedBody`). | „Payment did not go through. You can pay the invoice or change your payment method in Billing. Your profile stays visible; bookings pause only if the invoice is still open 7 days after the due date." |
| P2 | `providerws.invoiceDetail.pricingNote` (gerendert) | „Pricing model: €92 per confirmed engagement · €2 per affiliate click · €0 subscription." | Falsche Gebühreninformation auf dem Rechnungsbeleg — Demo-Ära; widerspricht Plan-Abo + Lead-Gebühr je Band (ADR-0003, Mandat). | „Pricing model: your plan subscription plus one lead fee per booking at its opportunity band — plan discounts already deducted. Details under Billing." |
| A1 | `services/compliance-api/src/assistant.ts` Systemprompts (Z. 108–117, 130–140) | kein „du bist eine AI"; keine Trennung klar/auslegungsbedürftig; keine Regel für Unsicherheit; keine Ruhe-Regel bei belasteten Nutzern | §5 MUSS-Punkte fehlen. Kein Verstoß im Wortlaut, aber die AI erfüllt den Standard nur zufällig. Als Blocker geführt, weil es die eine Stelle ist, an der ein Verstoß zur Laufzeit entsteht. | Beide Prompts ergänzen: „You are an AI assistant, not a lawyer, tax adviser or customs specialist — say so when asked or when the user treats you as one." · „Separate what the rules clearly require from what depends on interpretation or the user's facts; for the second kind, say that it depends and on what." · „When the context is incomplete, give the closest reliable answer and name the gap in one sentence." · „If the user is worried or mentions an enforcement letter, penalty or missed deadline, stay calm and factual." |

## 2 · Änderungen — verfehlt Voice oder Filterpunkt

### Website (`home.json`, `common.json`)

| Stelle | Text | Punkt | Vorschlag |
|---|---|---|---|
| `home.heroWorld.title.line1/line2` | „Cross-border compliance. Simplified." | Expansion als Master-Positionierung (Addendum AVOID) | „Understand what applies to your business." / „Know what to do next." |
| `home.heroWorld.lead` | „…Find the right specialists. Stay compliant." | Ergebnisversprechen, das wir nicht halten können | „Understand what applies to your business in {{markets}} markets. Find the right specialist. Know what to do next." |
| `home.heroWorld.proofs[1].desc` | „Verified specialists you can trust." | „trust us" statt Beleg | „Specialists checked against evidence for each service and market." |
| `home.heroWorld.proofs[4].desc` | „Enterprise-grade security and privacy." | Hype-Qualifier ohne Inhalt | „Anonymous assessment. Identifiers masked before any AI sees your text." |
| `home.riskMapPreview.guestNote` · `results.topbar.guestBadge` | „Guest map · expires in 30 min" | Countdown am Registrierungs-Gate | „Guest map · kept for 30 min — save it to keep it" |
| `home.riskMap.save.subtitle` · `results.cta.body` | „…Founding-member access through Beta launch." | Exklusivitäts-/Knappheitshaken am CTA | „Free account. No credit card. Your map and your matches stay saved." |
| `home.brandCode.cards[2].desc` | „…accept shared responsibility for your matter." | Impliziert geteilte Berufshaftung; widerspricht Footer-Disclaimer | „…answer for your matter under their own professional responsibility. The gold mark is restraint, not promotion." |
| `home.hero.*` / `hero.dual.trust` / `matchmaking.steps[0]` / `common.howItWorks.cta.lead` u. a. | „Six minutes" vs „under 3 minutes" vs „Under 2 minutes" vs „under five minutes" | Vier Zeitangaben für dieselbe Erhebung | Eine Zahl überall, z. B. „Four questions · about five minutes · no account". |
| `home.matchmaking.steps[2]` | „Sign up to see matches — … reserved for registered accounts." | Gating als Exklusivität statt Grund | „Save your map to see matches — A free account lets us hold your map and send your request to the right provider. No credit card." |
| `home.beyond.mock.riskHigh/riskMedium/feedThreshold` | „● High risk · threshold reached" | Dashboard-Mock nutzt „risk", Produkt nutzt Priorität | „● High priority · threshold reached" / „● Medium priority · due Q3" |
| `common.solutions.counsel.benefit2Desc` | „Names, emails, and phone numbers are masked before any AI processing." | Gewissheit über Namen | „E-mail addresses, phone numbers and known identifier patterns are masked before any AI processing. Pattern rules do not catch every name — the Trust Center says what they cover." |
| `common.solutions.founders.pain1Desc` | „…One missed registration can mean fines." | Angst als Einstieg | „…and each registration has its own trigger. The map shows which ones apply to you." |
| `common.solutions.founders.pain2Title/Desc` | „The Unreliable Expert Trap" / „…is not a strategy. It's a liability." | Wertet den Nutzer ab, Provider-Bashing | „The long way to the right specialist" / „Cold-emailing providers and waiting weeks costs time you may not have. A structured request with your context gets a substantive answer within 48 hours." |
| `common.solutions.operations.card1Solution` · `compliance.resourceTeaser.*` (letzteres nicht gemountet) | „Knowledge Hub aggregates … tutorials, and guides" | Verspricht Inhalte, die `resources.gap` als nicht vorhanden benennt | „The Markets and Compliance Areas pages hold the duties we check against, each with its statute. Guides and tutorials follow once they are worth reading." |
| `common.compliance.riskPanel.title` | „Where it burns first — computed for your market." | Angstbild | „What needs attention first — weighted for your market." |
| `common.compliance.matrix.col.fine` | „Typical Exposure" | Obergrenzen als „typisch" verkauft | „Maximum penalty" |
| `common.compliance.product-packaging.cov3` | „…in doubt a duty is assumed, not defined away" | Offener Fall als Pflicht gezeigt (created need) | „Edge cases are flagged as open, not defined away — you see where a duty is likely and where it needs confirming." |
| `common.compliance.howItWorks.body` | „CompliHub360 controls the engagement funnel and enforces response accountability." | Vertriebsvokabular an den Nutzer | „CompliHub360 structures your request and holds providers to their response times. You stay in control end-to-end." |
| `common.seo.complianceArea.title` | „{{area}} — Obligations & Penalties" | Strafen als Hook im Seitentitel | „{{area}} — Obligations & Sources · CompliHub360" |
| `common.aiGov.dimTechDesc` | „…ensures zero downtime…" | Unhaltbares Versprechen | „…built for resilience: if an AI step fails, the workflow falls back to a deterministic process…" |
| `common.hero.scenarios.*`, `hero.companies`, `hero.funnel.*` (**nicht gerendert**) | „Your Compliance Shortcut to Global Markets", „Stop guessing", „Trusted by innovative companies", „Qualify now" | Expansion, Superlative, Nutzer als Lead | **Schlüssel löschen** statt umschreiben — tote Copy, die in vier Sprachen gepflegt wird. |

### Nutzer-Workspace und Ergebnis (`userws.json`, `results.json`, `auth.json`)

| Stelle | Text | Punkt | Vorschlag |
|---|---|---|---|
| `auth.login.footer.operational` | „All systems operational" (statischer grüner Punkt, kein Check dahinter) | Beruhigung ohne Grundlage | Punkt und Label entfernen, bis ein Live-Check dahinter steht; sonst nur „Status page"-Link. |
| `userws.termine.cancelConfirmBody` | „…the placement fee was charged at booking." | Nutzer liest, er habe gezahlt — widerspricht „Nothing is charged to you" überall sonst; Absage-Moment | „The appointment on {{date}} will be cancelled and the provider notified. This cannot be undone. Nothing is charged to you." |
| `results.schedule.confirmCta` | „Book bindingly" (unter „no obligation") | Widerspruch auf einem Screen | „Confirm booking" |
| `userws.assistant.intro` | „Ask me about VAT rules… I answer from CompliHub360's verified knowledge base." | Sagt nicht, dass es AI ist; nennt keine Grenze | „I'm CompliHub360's AI assistant. Ask me about VAT rules, thresholds and deadlines in your markets. I answer from the verified knowledge base and say so when I'm not sure." |
| `userws.home.alertTitle`, `home.unit*Tip`, `riskMaps.kpiRisk`, `riskMaps.lageHigh_*`, `domainPage.lageHigh_*`, `domainPage.kpiHigh` | „High risk: {{name}}", „Risk split", „{{count}} at high risk" | Zwei Vokabulare (Risk vs Priority) im selben Workspace | „Needs attention: {{name}}", „Priority split", „{{count}} high priority" |
| `auth.register.urgencyLabel/urgencyOptions` | „Urgency: Immediately / This week / …" | Frage nur zur Lead-Qualifizierung; nichts auf Nutzerseite hängt davon ab | Feld streichen oder optional mit sichtbarem Zweck: „When do you want to get started? (optional — helps us order your risk map)" |

### Anbieter-Workspace (`providerws.json`)

| Stelle | Text | Punkt | Vorschlag |
|---|---|---|---|
| `helpDrawer.scope` | „Not part of support: … fee disputes." | Gebührenfragen pauschal ausgeschlossen, obwohl Bands als Hilfethema gelistet sind | „Not part of support: your fee negotiations with clients and professional advice — you are the professional, we are the platform. Questions about a lead fee, band or credit belong here: pick 'Billing'." |
| `billing.reason.payment_failed` | „A different payment method lifts this — the same card does not." | Widerspricht `billing.recheck.*` auf demselben Screen | „The last lead charge did not go through. Have the same card checked again or add a different payment method — either lifts the pause once confirmed." |
| `performance.enforcementBody` | „Your profile stays visible; new bookings are paused…" für alle fünf Enforcement-Typen | Bei „Profile limited"/„Account suspended" nicht wahr | Body je Typ oder: „New bookings are paused until the team decides; what this means for your visibility is shown in the status above." |
| `notifications.subtitle` | „Aggregated event feed from canonical event model… downgrade warnings…" | Spezifikationssprache, „downgrade warnings" undefiniert und bedrohlich | „Everything we have sent you in one place: new requests, SLA reminders, plan and payment updates, review activity." |
| `requests.subtitle` | „…push-anchored (email + magic-link)…" | Architektur-Jargon | „Every request routed to you. New requests arrive by email with a one-time link and stay highlighted here until you confirm." |
| `settings.pricingNoteV2` | „…shown on the (billed) detail open." | Impliziert Gebühr pro Profilaufruf | „The listing card shows only your billing model, no prices. Your full pricing table appears on your detail page. Lead fees arise per booking, not per profile view." |

### API — Prompts, Mails, Seed

| Stelle | Text | Punkt | Vorschlag |
|---|---|---|---|
| `assistant.ts` Regel 1 (beide Prompts) | „If the context does not cover the question, say so plainly and suggest sending a request to a verified partner…" | Jede Wissenslücke wird zum Partner-Nudge (created need) | „…say so plainly. Offer the user a choice: rephrase or narrow the question, or — where a qualified person is needed — send a request to a verified partner. Do not present a partner request as the only or the required next step." |
| `assistant.ts` Regel 6 | „…say coverage for it is coming and suggest a partner request." | Roadmap-Versprechen, das das Modell nicht prüfen kann | „…say that CompliHub360 does not yet cover that country, so you cannot answer for it, and that the user can ask to be notified when it is covered." |
| `assistant.ts` Regel 4 + `domain.ts:121` | „State amounts and deadlines precisely." + Kontext liefert „penalty €…" je Markt ohne Regel | Bußgeld ohne Prioritätsrahmen | Prompt: „Penalties are context, not the headline: lead with what applies and by when; mention a penalty only when the user asks or when it changes the priority, and then as one factual sentence." · Kontext-Label `legal consequence if missed:` |
| `assistant.ts:162` | „Free daily limit reached — Assistant Pro unlocks unlimited questions" | Overclaim (Pro ist auf 200/Tag begrenzt) | „You have used today's free questions. Assistant Pro raises the daily allowance to 200; the free limit resets tomorrow." |
| `mailer.ts:511` (+ de/es/tr) | „Rate your specialist within the next 2 days — …" | Frist auf Nutzerseite, obwohl Bewertung freiwillig ist | „If you have two minutes, rate your specialist — your feedback improves your matching and helps us notice problems early. Reviews are verified and appear anonymised." |

## 3 · Nits — ein sorgfältiger Lektor würde es ändern

**Website:** `hero.dual.*` ohne Hinweis, dass die Frage in der Beta in die Erhebung führt, nicht zu einer Direktantwort · `problemRecognition.items[1].desc` „Nobody is paid…" → „Few are paid…" · `matchmaking.title.line1` „Other tools tell you what's wrong." → „A list of rules is not a plan." · `footer.tagline`/`hero.eyebrow` Systemsprache → „We help you understand what applies to your business — and reach the right person when it needs one." · `solutions.founders.pain3Title` „We Fix This" → „What CompliHub360 does instead" · `compliance.matrix.disclaimer` „accurate guidance" → „the assessment narrows it to yours" · `compliance.corporate-structure.cov3` „uncertain founders" → „when the setup question is still open" · `contact.lane.sales.desc` klarstellen, dass es um Anbieter-Pläne geht · `solutions.founders.stat4Label` (nicht gerendert, einziger plausibler Wert „0 surprises") löschen.

**Nutzer:** `results.cta.title`/`home.riskMap.save.title` „Unlock the providers." → „Keep your matches." · `results.partners.unlocked` → „Matches saved" · `results.snapshot.group.now` „Act now" → „Due now" · `userws.comingSoon.library.sub` „secure early access" → „join early access" · `userws.assistant.upgradeBody/upgradeSuccess` „unlimited", „welcome aboard!" → „removes the daily limit", „Assistant Pro is active. Ask away." · `auth.login.forgot.fineprint` „Argon2id" → „Passwords stored hashed".

**Anbieter:** `billing.currentPeriodHint` „exactly what the monthly invoice will contain" → „so far" · `billing.readyTitle` „ready to be charged" → „payment method confirmed" · `billing.subtitle` Band-Spanne in USD, alles andere EUR · `billing.reason.account_paused` ohne Erklärung und Weg zum Menschen · `magicAction.pressNote*` „burns the link", „audit log" → Klartext · `addMarket.footerNote` feste „2-business-day" → „usually about 2 business days" · `termine.dossierNote` „no confirm gate", No-Show ohne Gutschrift-Regel · `termine.rateNote` „internal lead quality" → was die Bewertung bewirkt · `invoiceDetail.pdfNote` „(C3)", `notifications.descEngagementClosed` „quality_score +2" (Ticket-Referenz, Variablenname) · `apiAccess.rejectedNoNote` ohne Gesprächsangebot.

**API:** Acknowledgement-Seed de/es/tr ohne Umlaute/Akzente/türkische Zeichen („fuer Sie sichtbar", „direccion") → als `booking-ack-v2` neu seeden, v1 für Bestandsbuchungen behalten · `mailer.ts:99` Reminder „the client is waiting for your confirmation" (Schuldrahmen) · `mailer.ts:126` Footer „orchestration layer between compliance complexity and operational reality" → „Always on your side." · `mailer.ts:179/183` „Ihre Kanzlei" (de) → „Ihr Unternehmen" · `mailer.ts:1230` kept_paused ohne Horizont · `subscriptions.ts:837` „Please contact us" ohne Adresse · generische 5xx „Session save failed"/„Search failed" → Muster „could not be saved right now. Nothing was changed — please try again in a moment."

## 4 · Addendum V2 — Acceptance Items im Copy-Stand

| Item | Stand |
|---|---|
| Pricing-Fairness („Zahlung kauft kein besseres Match") | **getragen** in `common.pricing.ranking.body`, `pricing.faq`, `howItWorks`; **fehlt auf der Startseite** (FAQ „Providers & engagements", `howItActs.cards[0]`) — ein Satz schließt es. |
| „How our AI behaves" | **getragen** (`common.aiGov.behaviour`, sechs Punkte). |
| About / Why We Exist / Purpose / Mission / Vision | **getragen** wortgleich (`common.about.*`). |
| Lebenslange Beziehung („Wir bleiben an Ihrer Seite") | **teilweise** — Substanz in `home.beyond.*` und `howItActs.cards[1]`, aber kein sechster Schritt in `howItWorks` und kein ausdrücklicher Satz. |
| Hero-Master-Richtung | **teilweise** — `riskMap.title`, `entryDoor.subtitle` tragen sie; `heroWorld.*` noch cross-border-geführt (Änderungen oben). |
| Priorität statt Panik, Strafen aus den Headlines | **teilweise** — Vokabular im Produkt da; Startseiten-Showcase (H1) und Dashboard-Mock widersprechen. |
| Erklärbare Match-Kriterien (✓ / Lücke) | **teilweise** — `matchmaking.matches[*]` nennt Gründe; `risk.match` „{{pct}}% match" ohne sichtbare Kriterien. |
| AI nie Fachperson, nicht Rechtsberatung | **getragen** (FAQ, `domains.items[7]`, Footer, Assistant-Disclaimer). |
| Ehrlichkeit über Nicht-Verfügbares | **getragen** („in preparation", unabgedeckte Märkte markiert). |

**Assistant-Systemprompt gegen §5:** MUSS erfüllt: Kontext vor Empfehlung, Übergabe an Partner (in der Form), „keine Rechtsberatung". MUSS fehlt: sich als AI benennen · „warum" fragen bei Bedarf ≠ Anliegen · klar/auslegungsbedürftig trennen · Grenze bei Unsicherheit · Ruhe bei belasteten Nutzern. DARF-NICHT gefährdet: Partner-Empfehlung reflexartig bei jeder Lücke · Bußgelder ohne Handhabungsregel im Kontext.

## 5 · Was schon stimmt

- **Fehlerzustände übernehmen Verantwortung:** „That was our mistake, not yours… nothing is charged to you" (`termine.after.*`), „This is not on your side… Nothing was shared" (`schedule.fail.*`), „Nothing was lost", „Your status is unchanged" (providerws, dutzendfach).
- **Grenzen werden benannt:** „Matched by keywords — not a review of your case", „a genuine gap in coverage, not a clean bill of health", „Proofs not yet verified", Platzhalter-Hinweis an den Assistenten („a gap in our coverage, not in the law — do not name one").
- **Nichts zu verkaufen wird gesagt:** „If it turns out you already have everything covered, we say so — there is nothing for us to sell you", „The advice itself is not free, and we will not pretend otherwise", „Placement is never for sale".
- **Mensch bleibt erreichbar:** „Rather ask a person directly? Write to us. We reply the next business day.", „No bot — a person replies", jede Entscheidungs-Mail endet mit „reply to this email — a person will answer".
- **Anbieter sind Partner:** „Your plan never affects your ranking", „A higher plan shows more trends, never better numbers", Enforcement-Mails nennen Konsequenz einmal, Sichtbarkeit bleibt, Einspruchsweg steht dabei; das Billing-Mandat erklärt Beträge, Zeitpunkte, Scheitern, Erstattung und Widerruf in einfachen Sätzen.
- **Strafen als Obergrenze, nicht als Prognose:** „a ceiling if everything went wrong at once, not a forecast", „counted at zero, not estimated".

## 6 · Vorgeschlagene Reihenfolge

1. **Blocker** C1–C3, H1, P1–P2 (reine Textänderungen in zwei Locale-Dateien, vier Sprachen) und A1 (Prompt-Ergänzung, mit Test auf die neuen Regeln) — ein PR.
2. **Änderungen Website + Nutzer** (Hero, Gate-Texte, Vokabular Risk → Priority, Urgency-Feld, Assistant-Intro) — ein PR, vorher Wahl des Nutzers je Zeile.
3. **Änderungen Anbieter + API** (Help-Scope, Enforcement-Body, Prompt-Regeln 1/4/6, Review-Mail) — ein PR.
4. **Nits** gesammelt, dazu tote Schlüssel löschen (`hero.scenarios.*`, `hero.companies`, `hero.funnel.*`, `founders.stat4Label`) und Acknowledgement v2 mit Diakritika.
5. Übersetzungen de/es/tr je PR nachziehen (`i18n:check`, `terminology:check`, `copy:check`).

Nicht Teil dieses Durchgangs: Übersetzungsqualität, Tippfehler, Layout, Legal-Platzhalter (Impressum, Datenschutz, AGB — warten auf die Rechtsprüfung).
