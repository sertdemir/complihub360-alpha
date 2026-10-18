# CompliHub360 Video Lab · Konzept V1

> **Zweck:** Testprogramm für Motion-Graphic-Videos (Instagram zuerst, YouTube als lange Schwester) aus der Perspektive des Gründers (technische Seite). Perspektive Marketing (Mitgründerin) folgt als eigener Canvas.
> **Stand:** 2026-10-18 · Canvas der Session: <https://claude.ai/artifact/FWGBuiPGsTKQkgd4XxtHWT> · DNA geprüft gegen `KN-BRAND-001` (Decision Filter §6).
> Preise: Listenpreise USD/Monat ohne USt, Stand Oktober 2026 aus Drittquellen; vor Kauf auf der Anbieterseite prüfen.

---

## 0 · Leitidee

**„Ich tippe in die Luft, und die Plattform antwortet."** Der Gründer spricht in die Kamera, tippt auf Punkte im Raum, an diesen Punkten erscheinen Compass-Karten, Screens, Quellen. Ruhige Sci-Fi-Ästhetik („Calm Interface"), kein Cyberpunk: Die Marke verkauft Vertrauen, nicht Tempo.

DNA-Leitplanken für alle Clips: keine Angst als Hook, keine Hype-Sprache, keine Dringlichkeit als Verkaufstaktik, Quellen sichtbar, Mensch bleibt Option, Avatar immer gekennzeichnet.

## 1 · Motion-DNA

| Element | Festlegung |
|---|---|
| Bühne | dunkle Petrol-Bühne `#121616` → `#1B2222`, ein weicher Lichtkegel, echtes Setting mit Tiefe, kein Greenscreen |
| Helle Szenen | der Gradient (`linear-gradient(165deg, #EAF3F1 0%, #DDECE8 55%, #E9E4D3 100%)`); Wechsel dunkel → hell = Unsicherheit → Klarheit |
| Gold | nur Quellen und geprüfte Partner. Rot nur innerhalb der Ampel der Risk Map |
| Typografie | IBM Plex Serif (Aussagen), Plex Sans (UI-Text), Plex Mono (Labels, Quellen, Zeitstempel) |
| Karten | Compass-Komponenten, 6 px Blur dahinter, 1 px Hairline, 10–14 px Radius |
| Untertitel | immer, 2 Zeilen |

**Signature Moves**

1. **Tap-to-Reveal** · Ring pulst einmal (1,2 s), Karte entfaltet sich aus dem Punkt, 420 ms `cubic-bezier(.16,1,.3,1)`, Staffelung 180 ms, max. drei Karten gleichzeitig.
2. **Risk Map Bloom** · Pflichten Zeile für Zeile, Priorität als Wort (Sofort / Hoch / Mittel / Niedrig), nie als Bußgeld.
3. **Anonymous Reveal** · Provider als Silhouette mit Match-Indikatoren, Identität erst nach dem Termin.
4. **Orchestrator Lines** · dünne Linien verbinden Problem, Information, Mensch.

**Nie:** Glitch, Matrix-Code, Lila-Blau-Verlauf, Roboterstimme, Countdown, Bußgeldsumme als Hook, Avatar ohne Kennzeichnung.

## 2 · Formate

| # | Format | Frage der Zuschauer | Länge | Status |
|---|---|---|---|---|
| A | **Tap Explainer** | „Was gilt eigentlich, wenn ich nach Frankreich verkaufe?" | 45–60 s Reel, 2–3 min YT | **Pilot** |
| B | **Building CompliHub** (build in public, technisch) | „Warum habt ihr das so gebaut?" | 60 s Reel + 6–10 min Devlog | **Pilot** |
| C | **Behind the Privacy Wall** | „Was passiert mit meinen Dokumenten?" | 45–60 s, Mini-Serie 3 Folgen | **Pilot** |
| D | **Real Stories** | „Geht es anderen wie mir?" | 60–90 s | Welle 2 |
| E | **Partner Voices** | „Was habe ich als Berater davon?" | 60 s | Welle 2 |
| F | **Was gilt wirklich** | „Muss ich das wirklich?" | 30–45 s | Welle 2 |

Perspektive 2 (später, Marketing): „Why is nobody protecting the customer?" als Gründungsgeschichte · „Provider sind Partner" · „Was Compliance mit Vertrauen zu tun hat". Gleiche Motion-DNA, helle Bühne.

## 3 · Story-Bank

Namen sind Platzhalter aus `GoogleDrive_Docs/Detailed Personas & User Stories.md`. Echte Geschichten nur mit schriftlicher Einwilligung, nie mit Dokumenten oder Daten aus der Plattform.

| Person | Situation → Moment → mit CompliHub360 → Ausgang |
|---|---|
| **Alex** (U1, D2C, Frankreich) | Händler-Mail erwähnt Triman/EPR → fünf Meinungen, keine Antwort → Risk Map: EPR Hoch, USt Mittel, Quelle sichtbar, zwei anonyme Spezialisten → Erstgespräch gebucht, kein Schreck, ein Plan |
| **Sofia** (U2, SaaS US→EU) | erster Münchner Kunde fragt nach AVV und SCC → Antwort-Seite mit Quellen, klare vs. interpretationsbedürftige Pflichten → PDF fürs Board, DSB gebucht |
| **Daniel** (U3, Agentur, Supplements) | Kunde will „stärkt das Immunsystem" → Health-Claims-Verordnung mit Quelle, Mensch nötig → Beleg statt Meinung, Launch zwei Tage später, sauber |
| **Emma** (U4, Research first) | zwölf Behördenseiten, drei Länder → nur Wissens-Teil, PDF, kein Drängen → vier Wochen später bucht sie |
| **Dr. Schmidt** (P1, Boutique) | fünf Verzeichnis-Anfragen ohne Kontext → Anfrage kommt mit Risk Map, Ein-Klick-Bestätigung → gefunden nach Passung, nicht Bekanntheit |
| **Laura** (P3, DSB allein) | sieben oder null Anfragen im Monat → vorqualifiziert, SLA klar, Magic Link → planbar ohne Plattform-Abhängigkeit |
| **John** (Marketing-Briefing) | googelt „VAT verkaufen Italien" → Wizard, Teil-Risk-Map, Registrierung, anonyme Spezialisten, Termin → Identität nach Buchung, Monitoring bleibt |
| **Der Gründer** | Risk Map zeigte Bußgelder je Zeile → Audit: Priorität statt Panik → #54 Stufen, #55 Ampel, #56 Bußgeld raus → erste Folge „Building CompliHub" |

## 4 · User Stories

**Zuschauer**

- **V-01** Als Gründer eines D2C-Shops, der abends durch Reels scrollt, will ich in 30 s verstehen, was CompliHub360 für mich tut, ohne mich klein zu fühlen. *Akzeptanz:* Nutzen in 3 s sichtbar, kein Fachjargon ohne Klartext.
- **V-02** Als Head of Expansion will ich sehen, dass Aussagen belegt sind. *Akzeptanz:* jede Pflicht hat eine lesbare Quellen-Karte.
- **V-03** Als Compliance-Berater will ich verstehen, was für mich als Partner drin ist, ohne dass meine Branche abgewertet wird. *Akzeptanz:* kein herabsetzender Vergleich, Fairness-Regel genannt.
- **V-04** Als Zuschauer will ich wissen, ob ich einen Menschen oder einen Avatar sehe. *Akzeptanz:* Kennzeichnung ab Frame 1.
- **V-05** Als jemand, der erst verstehen will, will ich vom Reel zur langen Fassung finden. *Akzeptanz:* jedes Reel hat eine lange Schwester, Verweis in Caption und Endcard.
- **V-06** Als Zuschauer in ES oder TR will ich das Video in meiner Sprache, mit derselben Person und Stimme. *Akzeptanz:* EN/DE/ES/TR aus demselben Dreh, Lippensynchronität geprüft.

**Produzent**

- **P-01** Einmal drehen, in vier Sprachen ausspielen. *Akzeptanz:* Stimmklon + Avatar eingerichtet, Pipeline statt Handarbeit.
- **P-02** Karten direkt aus Figma/Compass animieren. *Akzeptanz:* Figma-Frame → Jitter ohne Neubau, Token exakt.
- **P-03** Kontrolle über Gesicht und Stimme. *Akzeptanz:* Referenzen privat, nie im Repo; Klon nur auf eigenem Konto; Löschweg dokumentiert.
- **P-04** Nach vier Wochen wissen, ob das Format trägt. *Akzeptanz:* Metriken je Clip + DNA-Check je Clip.
- **P-05** Nur zahlen, was der Test braucht. *Akzeptanz:* Stufe 1 < 150 $/Monat.
- **P-06** Jedes Skript durch den Decision Filter vor dem Dreh. *Akzeptanz:* Checkliste ausgefüllt, ein Verstoß stoppt den Dreh.

## 5 · Storyboards der Piloten (9:16)

### Pilot A · Tap Explainer · „Ein Paket nach Frankreich. Was gilt eigentlich?" (45–50 s)

| F | Zeit | Bild | Motion | Ton (Vorschlag) |
|---|---|---|---|---|
| 1 | 0–3 s | Gründer nah, Lichtkegel, Titel klein | Kamera steht, Text 200 ms | „Ein Paket nach Frankreich. Was gilt eigentlich? Ich baue CompliHub360, nehmen wir das mal auseinander." |
| 2 | 3–9 s | Tipp rechts oben → Karte „Ziel: Frankreich · D2C · Shopify" | Ring 1,2 s, Karte 420 ms, Parallaxe | „Du sitzt in Deutschland, verkaufst über Shopify und Amazon, Frankreich läuft gerade an." |
| 3 | 9–18 s | Tipp → Risk Map: EPR Verpackung Hoch, USt-Registrierung Mittel, Widerruf FR Niedrig | Zeilen gestaffelt 180 ms, Priorität nach Titel | „Drei Dinge gelten. Die Verpackungs-Registrierung, in Frankreich heißt das EPR, hat Priorität. Umsatzsteuer kommt dazu, je nach Volumen. Der Rest ist Formalie." |
| 4 | 18–26 s | Tipp → Quellen-Karte (Gold-Hairline): Code de l'environnement, Art. L541-10, ADEME | klappt auf, Mono tippt sich ein | „Und das sagen nicht wir, das steht hier. Wir zeigen immer, woher wir es wissen." |
| 5 | 26–36 s | Wischer in den Gradient, zwei anonyme Spezialisten, Match-Indikatoren | Bühne hellt auf, Karten von unten | „Wenn du Hilfe willst: zwei Leute passen. Du siehst erst, was sie können, dann wer sie sind. Das ist Absicht." |
| 6 | 36–48 s | Gründer, Lockup + Claim, kein Button | Karten lösen sich in den Lichtkegel auf | „Kein Druck. Erst verstehen, dann entscheiden. Link in der Bio, kostenlos, anonym." |

Caption: „Frankreich, D2C, Shopify. Drei Pflichten, eine Quelle, kein Alarm." · Kein Text im Bild eingebrannt, damit vier Sprachen aus einem Dreh gehen.

### Pilot B · Building CompliHub · Folge 1 · „Wir haben heute etwas aus der Risk Map gelöscht." (60 s / 8 min)

| F | Zeit | Bild | Motion | Ton |
|---|---|---|---|---|
| 1 | 0–4 s | Schreibtisch, Monitor im Anschnitt, Titel „Heute gelöscht: Bußgelder." | Push-in 4 s | „Wir haben heute etwas aus der Risk Map gelöscht. Und ich glaube, das macht sie besser." |
| 2 | 4–14 s | Tipp → alte Zeile mit Bußgeld-Untertitel, Zahl wird durchgestrichen | Durchstreichung 600 ms, Zeile verblasst | „So sah eine Zeile aus. Bußgeld bis hunderttausend, in jeder Zeile. Sah wichtig aus. Hat Angst gemacht. Und Angst ist kein Grund, uns zu vertrauen." |
| 3 | 14–26 s | Tipp → neue Zeile: Pflicht, Klartext, „Hoch" | morpht aus der alten, Label zuletzt | „Jetzt steht da, was zu tun ist und wie dringend. Die Strafe steht weiter im Detail, aber sie führt nicht mehr." |
| 4 | 26–38 s | Tipp → Changelog-Karte: #54 Stufen, #55 Ampel, #56 Bußgeld raus | Zeilen tippen, Haken mit Ping | „Drei Änderungen in einer Woche. Alles im Repo nachlesbar." |
| 5 | 38–50 s | Gradient-Vollbild, nur die DNA-Frage, Serif kursiv | wortweise Einblendung | „Jede Entscheidung bei uns läuft durch diese eine Frage. Wenn die Antwort Nein ist, bauen wir es nicht." |
| 6 | 50–60 s | Teaser Folge 2 „Warum Provider anonym bleiben." | Karte schwebt ein | „Nächste Folge: warum du bei uns erst siehst, was jemand kann, und erst dann, wer es ist." |

YouTube-Fassung: gleiche Beats plus Screen-Recording Vorher/Nachher, Audit-Notiz vom 19.08., Blick in Figma (Compass-Zeile), Frage ans Publikum.

### Pilot C · Behind the Privacy Wall · Folge 1 (50 s)

| F | Zeit | Bild | Motion | Ton |
|---|---|---|---|---|
| 1 | 0–5 s | Dokument links, leuchtender Punkt rechts (KI), Hand dazwischen: Stopp | Dokument driftet, friert ein | „Bevor irgendein Dokument unsere KI erreicht, passiert das hier." |
| 2 | 5–16 s | Dokument groß, Name/IBAN/Adresse werden geschwärzt, Produkt und Zielmarkt bleiben, Label „Regeln" | Scanner von oben, 2 s, kein Flackern | „Namen, Kontonummern, Adressen: raus. Mit festen Regeln, nicht mit einer KI, die rät." |
| 3 | 16–28 s | zwei Tresore Raw (verschlossen) / Sanitized, Linie nur vom zweiten zur KI, Kreuz am ersten | Linie 800 ms, Kreuz hart | „Das Original bleibt in einem Tresor, den die KI nie sieht. Das ist kein Schalter, den jemand umlegen kann." |
| 4 | 28–38 s | Audit-Karte: raw.stored, sanitized.stored, sanitized → ai, audit.sealed, retention.delete | Zeilen im Uhrtakt 400 ms | „Jeder Übergang wird protokolliert. Speichern, bereinigen, weitergeben, löschen." |
| 5 | 38–45 s | Gründer nah, „Das ist kein Feature. Das ist Architektur." | Karten lösen sich auf | „Das ist kein Feature, das man einschaltet. Das ist, wie das Ding gebaut ist." |
| 6 | 45–50 s | Endcard, Teaser „Folge 2 · Zonen A bis D" | steht 5 s | „Folge zwei: die vier Zonen, in denen Daten bei uns leben." |

Dokument im Video ist ein Dummy mit erfundenen Werten. Nie ein echtes Kundendokument, auch nicht geschwärzt.

## 6 · Tool-Stack & Anbindungen

**Pipeline**

| Station | Empfehlung | Alternative |
|---|---|---|
| 1 Skript | Claude + Story-Bank, Teleprompter-App (Elegant Teleprompter / PromptSmart) | — |
| 2 Dreh | iPhone 4K 24 fps, Lavalier-Funkmikro, Key Light; Tap-Marker im Raum | Sony ZV-E10 II |
| 3 Karten | Figma/Compass → **Jitter** (Figma-Import, ProRes mit Alpha) | Lottie → After Effects |
| 4 Compositing | **After Effects** (3D Camera Tracker) | DaVinci Resolve Fusion (0 $) |
| 5 Schnitt & Ausspielung | **DaVinci Resolve** + **Captions** | Descript |

**Digitaler Zwilling (parallel, für lokalisierte Fassungen und B-Roll; Piloten werden echt gedreht)**

| Zweck | Tool | Hinweis |
|---|---|---|
| Stimme | ElevenLabs Professional Voice Clone (ab Creator) | 30 min saubere Aufnahme, gleicher Raum, gleiches Mikro; ergibt EN/DE/ES/TR |
| Gesicht | HeyGen Avatar IV/V Digital Twin | 2–5 min Trainingsvideo frontal mit Einwilligungs-Satz; Alternativen Captions Mirage, Synthesia |
| Bild & Cinematic | **ArtCraft** (Web-App, beim Gründer eingerichtet): Nano Banana, FLUX, Seedream, Kling, Veo, Seedance, Sora, Midjourney in einer Oberfläche, 2D-Komposition + 3D-Szenenbau | Higgsfield nur für Soul-ID-Figurkonsistenz; Google AI Pro und Midjourney entfallen im Pilot |

**ArtCraft:** kein offizielles API, kein MCP (Repo `storytold/artcraft`, Stand 10/2026). Weg im Pilot: Prompt und Szenenbau von Claude als Text, Generierung in ArtCraft, Export in einen Drive-Ordner oder eine Figma-Seite, die Claude lesen kann. Automatisierung erst mit API oder einer lokalen Session mit Browser-Steuerung.

**Anbindungen:** Figma → Jitter (Plugin) · Figma → AE (Lottie/AEUX) · ElevenLabs API → HeyGen API via **n8n** (bereits im Stack) für Vier-Sprachen-Fassungen · Claude für Skripte, Untertitel, DNA-Check · Resolve → Captions → Instagram (1080×1920) / YouTube (3840×2160).

**Hardware einmalig** (ca. 430–730 €): Lavalier-Funkmikro 100–170 € · Key Light 150–250 € · Teleprompter 100–200 € · Stativ 50–80 € · optional Glasständer mit Markern ~30 €.

**Regeln für Gesicht und Stimme:** Referenzaufnahmen in privatem Ordner, nie im Repo, nie im Vault · Klone nur auf eigenem Konto · jeder Avatar-Clip trägt „Digitaler Avatar" im Bild · kein Avatar bei Enforcement, Strafen, sensiblen Fällen · Löschweg je Anbieter vor dem Upload notieren.

## 7 · Kosten (USD/Monat, Listenpreis, ohne USt)

| Stufe | Summe | Enthalten |
|---|---|---|
| **1 · Pilotmonat** | **≈ 95 $ + ArtCraft-Credits** | ElevenLabs Creator 22 · HeyGen Creator 29 · ArtCraft Credits je Modell (Plan beim Gründer) · Jitter Pro ≈ 19 · Captions Max 25 · Resolve 0 |
| **2 · Produktion** | **≈ 255 $** | Stufe 1 + After Effects 23 · Higgsfield Plus ≈ 59 · Midjourney Standard 30 · Descript Creator 35 (−25 Captions, wenn Descript übernimmt) |
| **3 · Skalierung** | **≈ 450–600 $** | HeyGen Business 149 + Sitze · ElevenLabs Pro 99 · Higgsfield Ultra ≈ 99–129 · Runway Pro 35 · Rive Cadet 17/Sitz |

Engpass sind Avatar-Minuten (HeyGen: 20 Credits je Avatar-IV-Minute). Für den Pilot 10–30 Avatar-Minuten im Monat einplanen. Quellen widersprachen sich bei HeyGen, Higgsfield und Kling.

## 8 · Testplan (4 Wochen)

| Woche | Inhalt |
|---|---|
| 1 Setup | Stimme aufnehmen + PVC trainieren · Avatar-Training · Raum, Licht, Marker, Testaufnahme · Compass-Karten für A in Figma, Jitter-Import · Skripte A/B/C durch DNA-Check |
| 2 Produktion | A als Tap- **und** Talking-Head-Fassung (gleicher Text) · B Reel + Devlog · C Reel · A zusätzlich als gekennzeichnete Avatar-Fassung EN · Untertitel DE/EN |
| 3 Ausspielung | Mo A Tap · Mi A Talking Head · Fr C · Folgewoche B, Devlog, A Avatar EN · Kommentare täglich lesen |
| 4 Auswertung | Hook-Rate (3 s), Watch-through, Saves, Shares, Profilbesuche, Link-Klicks je Clip · Entscheidung Stufe 2 |

**Hypothesen:** (1) Tap-Stil hält ≥ 15 Prozentpunkte länger als Talking Head, sonst Tap nur für Erklärformate. (2) Gekennzeichneter Avatar wird akzeptiert: keine Häufung negativer Kommentare, Watch-through max. 10 Punkte unter echter Fassung, sonst Avatar nur für B-Roll. (3) Build-in-public bringt die besten Saves und Profilbesuche, dann wird B das Rückgrat für YouTube.

## 9 · DNA-Check je Skript (vor dem Dreh)

- [ ] Hook weckt Neugier oder Wiedererkennung, nicht Angst (kein Bußgeld, kein Countdown, kein „Du machst das falsch")
- [ ] Jede Pflicht hat eine sichtbare Quelle; Unsicheres wird als unsicher benannt
- [ ] Klartext zuerst, Fachbegriff dazu; niemand fühlt sich klein
- [ ] Kein Hype-Wort
- [ ] Plattform gibt sich nicht als Fachperson aus; Mensch bleibt sichtbar als Option
- [ ] Keine Angriffe auf Provider, Verzeichnisse, Kanzleien
- [ ] Kein Bedarf wird konstruiert
- [ ] Avatar-Fassung ab Frame 1 gekennzeichnet; kein Avatar bei Enforcement/Strafen/sensiblen Fällen
- [ ] Keine Kundendaten, keine Platzhalter-Person als echt ausgegeben
- [ ] Die eine Frage: Fühlt sich der Zuschauer danach, als stünden wir auf seiner Seite?
