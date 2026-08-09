# CompliHub360 · Pricing-Benchmarks & State of the Art

**Stand: 08.08.2026 · Basis: Markt-Recherche Vergleichsplattformen · Status: ENTSCHIEDEN 2026-08-09**

> **Beschluss 2026-08-09:** Vorschlag übernommen und implementiert (billing.ts,
> env-überschreibbar): Lead-Fee **120 €** · Abo **149 €/Monat** oder
> **1.490 €/Jahr** (2 Monate geschenkt, Abrechnung im Jubiläumsmonat) inkl.
> 1 Lead/Monat + unbegrenzte Detail-Opens · Detail-Open **3 €** (Nicht-Abonnenten,
> Cap 50 €/Monat) · **erste 2 Leads pro Provider frei** · Affiliate ohne Preis
> (Post-Booking-Feature, Phase 1b). Abrechnung: monatliche Stripe-Sammelrechnung
> über die v2-Events; Abo-Verwaltung in Phase 1 durch Admin (Offline-B2B-Vertrieb).

CompliHub360 monetarisiert in Phase 1 vier Punkte entlang des Matchmaking-Funnels
(Priorisierung vom 06.08.2026): Detail-Open, Lead-Fee, Provider-Abo, Affiliate-Link.
Dieses Dokument fasst zusammen, wie vergleichbare Plattformen diese Punkte bepreisen,
und leitet daraus einen Preisarchitektur-Vorschlag ab.

**Untersuchte Vergleichsmodelle:** Ageras (Accountant-Matching — engster Comp),
Thumbtack & Bark (Lead-Marktplätze), Capterra/G2/Gartner Digital Markets
(Pay-per-Click-Software-Verzeichnisse), anwalt.de & deutsche Steuerberater-Verzeichnisse,
Sortlist (Agentur-Matching), Houzz Pro (Home-Professionals).

---

## 1 · Detail-Open (Klick von der anonymen Liste auf die Provider-Detailseite)

**Zentraler Befund: Kein Lead-Marktplatz bepreist das Ansehen eines Profils.**
Thumbtack, Bark und Ageras setzen die Bezahlschranke ausnahmslos erst beim
Kontakt-Moment. Das einzige etablierte Klick-Preismodell ist das der
Software-Verzeichnisse:

| Modell | Preis | Mechanik |
|---|---|---|
| Capterra / Gartner Digital Markets | ab 2 $ pro Klick, je Kategorie 2–15 $+ | Second-Price-Auktion, 500 $ Monats-Minimum |
| G2 | vergleichbare CPC-Range | Kategorie-abhängig |

Diese Modelle bepreisen allerdings den *Outclick zur Vendor-Website* (Kaufabsicht),
nicht eine Detailansicht innerhalb der Plattform.

**Einordnung für CompliHub360:** Unser Detail-Open ist qualifizierter als ein
Capterra-Klick (registrierter User, serverseitig 1×/User/30 Tage dedupliziert,
aktiv im Auswahlprozess). Die Branchenerfahrung zeigt aber: Bezahlung pro Ansicht
wird Provider-seitig als „Zahlen fürs Schaufenster" empfunden und erzeugt Dispute.

**SOTA-konforme Optionen:** (a) niedrig bepreisen (2–5 €, Capterra-Anker),
(b) ins Abo einpreisen, (c) Phase 1 kostenlos mitzählen und mit echten Daten bepreisen.

---

## 2 · Lead-Fee (Buchung = bezahlter Lead)

Benchmarks, sortiert nach Lead-Qualität:

| Vergleich | Preis | Lead-Typ |
|---|---|---|
| Bark (Credits à ~2,30 $) | typ. 5–36 $, High-Value 150 $+ | Kontakt-Lead |
| Thumbtack (je Gewerk) | 8–150 $+ (Küchen-Umbau 90–150 $) | Kontakt-Lead |
| Accounting-Leads (Markt allgemein) | 20–100 $ | Kontakt-Lead |
| Regulierte Branchen (Legal, Financial) | **100–400 $+** | qualifizierter Lead |
| Appointment-Setting-Agenturen | **550–1.700 $** | gebuchter B2B-Termin |

**Einordnung für CompliHub360:** Unser „Lead" ist kein Kontakt-Lead, sondern ein
**bestätigter Termin mit Dossier** (Risk Map + Kontaktdaten + Intake-Antworten) —
qualitativ näher am gebuchten B2B-Termin als am Thumbtack-Lead. Die Mechanik ist
bereits entschieden und implementiert: Provider zahlt bei Buchung, auch bei No-Show
(erhält dafür das Dossier), Verschieben kostenlos, Storno ohne Erstattung.

Der historische interne Anker (92 € Confirm-Fee aus v1) liegt am **unteren Rand**
des Marktkorridors für regulierte Branchen.

**Realistischer Phase-1-Korridor: 90–150 € flat**, spätere Differenzierung nach
Domain (Legal Advisory / Corporate über Marketing).

---

## 3 · Provider-Abo

**Der klare Branchentrend geht ZU Subscription-Modellen.** Stärkstes Signal:
Bark stellt aktuell komplett von Pay-per-Lead auf Subscription um (Australien live,
UK/US-Rollout 2026) — Hintergrund sind endlose Lead-Qualitäts-Dispute im reinen
Pay-per-Lead. Die etablierten Hybride:

| Plattform | Modell | Preis |
|---|---|---|
| Ageras (engster Comp) | Subscription + Fee pro Vermittlung | nicht öffentlich |
| Sortlist | Jahres-Abo inkl. 500 Credits, Leads kosten Credits | auf Anfrage |
| anwalt.de | Profil-Tiers | ab 69,90 €/Monat (Bronze) |
| Deutsche StB-Verzeichnisse | Premium-Eintrag | ~30 €/Monat |
| Houzz Pro | SaaS + Marketing-Bundle | 99–399 $/Monat |

**State of the Art ist das Hybrid-Modell:** Basis-Abo (planbarer Umsatz für die
Plattform, planbare Kosten für den Provider) + inkludiertes Lead-Kontingent +
Pay-per-Use darüber.

**Plausibler Korridor: 99–199 €/Monat** inkl. 1–2 Leads; ein Tier für Phase 1.

**Wichtige Abgrenzung:** Sichtbarkeits-Boosts gegen Geld (wie Sortlist sie
verkauft) würden den CompliHub-Qualitäts-Score korrumpieren. Das Ranking bleibt
unverkäuflich — das ist langfristig der Differenzierer.

---

## 4 · Affiliate-Link (Provider-Website via Detail-Page)

Referenzmodell wäre Capterra-CPC (ab 2 $/Outclick). Die Recherche spricht jedoch
**gegen eine eigene Revenue-Line**:

- Pre-Booking-Outclicks sind **Disintermediation**: der User googelt den Provider
  und bucht an der Plattform vorbei — exakt das Leakage-Problem, gegen das die
  Anonymität bis zur Buchung designt ist.
- Plattformen mit Anonymitäts-Modell verstecken URLs konsequent bis zur Transaktion.

**Empfehlung:** Kein Preis. Der Website-Link wird ein **Post-Booking-Feature**
(bzw. Abo-Feature, Kundenbindung), kein Erlösstrom. Umsetzung Phase 1b.

---

## Preisarchitektur-Vorschlag (zur Entscheidung)

| # | Position | Vorschlag | Begründung |
|---|---|---|---|
| 1 | Lead-Fee | **120 € flat** | Mitte des Korridors; über dem alten 92-€-Anker, weit unter Appointment-Setting-Niveau |
| 2 | Provider-Abo | **149 €/Monat**, inkl. 1 Lead + unbegrenzte Detail-Opens | Hybrid-Modell nach Branchentrend; anwalt.de-Premium + Lead-Wert als Anker |
| 3 | Detail-Open | **3 €** (nur Nicht-Abonnenten), Monats-Cap 50 € | Capterra-Anker; Cap gegen Kostenschock |
| 4 | Onboarding | **erste 2 Leads frei** für offline angeworbene Provider | Kaltstart-Sweetener, branchenüblich |
| 5 | Affiliate | kein Preis — Post-Booking-Feature | Anti-Leakage, Anonymitäts-Modell |

Abrechnungsmechanik: monatliche Sammelrechnung über den bestehenden
Stripe-Invoice-Run (EUR, B2B/Reverse-Charge zu klären), keine Sofort-Charges
pro Event. Phase 2 (geparkt): Newsletter-Platzierungen, Domain-differenzierte
Lead-Preise, ggf. zweites Abo-Tier.

---

## Quellen

- Thumbtack Lead-Kosten: pipelineon.com/blog/how-much-does-thumbtack-charge-per-lead
- Bark-Preise + Subscription-Umstellung: datalatte.pro/blog/bark-vs-thumbtack-local-business
- Capterra PPC-Mechanik: coseom.com/capterra-advertising
- G2/Capterra CPC-Range: paidmediaworld.com/g2-capterra-software-directory-ppc
- Ageras-Modell: old.ageras.com/how-it-works
- Sortlist-Modell: help.sortlist.com/en/articles/1867681
- anwalt.de-Preisliste: anwalt.de/pdf/anwalt.de_preisliste.pdf
- B2B-CPL regulierte Branchen: belkins.io/blog/b2b-cost-per-lead
- Qualified-Appointment-Kosten: saleshive.com/blog/lead-generation-services-what-should-they-cost
- Houzz Pro Pricing: houzz.com/houzz-pro/pricing
- Accounting-Lead-Preise: accountingfirms.co.uk/blog/how-much-do-accountant-pay-for-lead-generation-services
