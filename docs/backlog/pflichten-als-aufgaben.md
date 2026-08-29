# Pflichten als Aufgaben — Entwurf, Festlegungen, offene Voraussetzungen

Stand 2026-08-29. Canvas: https://claude.ai/code/artifact/8042f787-fc3b-43ea-99e5-eadcc3008f5f
(Abschnitte A–E) und https://claude.ai/code/artifact/1f11e575-1b8f-4553-97c6-12fa49db9ee3
(Artboard **G9**, der Zusammenbau im echten Sitzungs-Snapshot).

---

## 1 · Der Befund, aus dem alles folgt

Das heutige Chip-Paar „Bestätigt / Wahrscheinlich" beschreibt **nicht**, ob eine
Pflicht erledigt ist, sondern ob sie **zutrifft**:

```ts
// services/compliance-api/src/index.ts:2175
state: r.focus ? 'confirmed' : 'likely',
```

`focus` heißt: der Nutzer hat den Bereich im Assistenten selbst gewählt.
„Wahrscheinlich" heißt: die Engine hat ihn per Score dazugenommen.

Einen Erledigt-Zustand gibt es nirgends. `public.sessions`
(`supabase/migrations/20260711000000_sessions.sql`) führt `answers`,
`risk_summary` und `status` — nichts pro Pflicht, kein Endpunkt, kein Feld.
Ein grünes „Bestätigt" neben „EPR-Verpackungsregistrierung" liest sich damit
wie „erledigt", meint aber „betrifft Sie sicher".

**Konsequenz für jeden Entwurf:** eine Pflichtzeile trägt ZWEI Signale, die
niemals zu einem verschmelzen dürfen —

| | wer bestimmt es | Werte |
|---|---|---|
| **Geltung** | das System | Pflicht · Vermutlich Pflicht · Erst zu klären |
| **Bearbeitung** | der Nutzer | Offen · In Arbeit · Erledigt · Trifft nicht zu |

---

## 2 · Festlegungen des Nutzers (2026-08-29)

- **Wortlaut der Geltung:** „Pflicht" (vorher „Gilt für Sie") und
  „Vermutlich Pflicht" (vorher „Gilt vermutlich"). Dritter Wert bleibt
  „Erst zu klären".
- **Darstellung der Geltung:** Wort plus **Balken** darunter (Canvas A3).
  Der Balken zeigt die Abstufung — Pflicht voll, Vermutlich Pflicht ~60 %,
  Erst zu klären ~25 %. Er **läuft bei jedem Betreten der Seite ein**,
  dieselbe Kurve wie Donuts und zählende Zahlen; `prefers-reduced-motion`
  zeigt sofort den Endwert.
- **Darstellung der Bearbeitung:** **Chip** (Canvas B3), eingefärbt nach
  Zustand — Erledigt grün, In Arbeit gold, Offen rot, Trifft nicht zu grau.
  Der Chip ist zugleich das Menü (Pfeil). **Kein Balken** — er wäre nur eine
  dritte Schreibweise desselben Wortes.
- **Gesamtfortschritt:** ein Balken „x von y erledigt" (Canvas C2), platziert
  in der **rechten Spalte auf Breite des Verlaufs**, direkt darüber, damit er
  mit der Oberkante von „Sofort handeln" auf einer Kante sitzt.
- **Erfassung:** ein Klick (Canvas E1). Das System setzt das Datum, kein
  Dialog, kein Formular.
- **Ort:** keine neue Seite. Das Modell lebt im **Sitzungs-Snapshot**
  (`/results` eingeloggt). Verlauf und Anbieter bleiben unangetastet — ein
  eigenes Taskboard (Canvas D1) oder ein Zeitstrahl (D3) würde beide
  verdrängen und wurde deshalb verworfen.
- **Gruppierung bleibt nach Dringlichkeit.** Wer eine Sitzung öffnet, fragt
  zuerst „was ist fällig", nicht „wo stehe ich im Prozess".

### Mobile (Festlegung 2026-08-29)

Die **Balken der Geltung entfallen auf schmalen Breiten** — dort bleibt nur
das Wort. Sie kosten Platz, den die Zeile an den Seiten dringender braucht,
und sobald die Zeile zweizeilig umbricht, sollen Wort und Chip nebeneinander
noch Raum haben. **Der Balken ist eine reine Desktop-Verstärkung.**

---

## 3 · Was das Backend dafür braucht

### 3.1 Pflicht-Status je Sitzung

```sql
CREATE TABLE public.session_obligation_status (
  session_id     uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  obligation_id  text NOT NULL,      -- siehe 3.2
  status         text NOT NULL CHECK (status IN ('open','in_progress','done','not_applicable')),
  done_at        date,               -- gesetzt, sobald status = 'done'
  note           text,               -- freiwillig, z. B. LUCID-Nr.
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, obligation_id)
);
```

```
PUT    /api/v1/session/{id}/obligations/{obligationId}   { status, done_at?, note? }
GET    /api/v1/session/{id}/obligations                  -> alle abweichenden Zustände
```

Nicht gesetzte Zeilen sind `open` — die Tabelle hält nur Abweichungen, sonst
schreibt jede Sitzungsanzeige acht Zeilen ins Nichts.

### 3.2 Stabile Pflicht-ID — der kritische Punkt

Die Engine liefert `r.id`. Ob diese ID **über Neuberechnungen hinweg stabil**
bleibt, wenn der Nutzer seine Antworten ändert, ist ungeprüft. Wenn nicht,
hakt jemand die LUCID-Registrierung ab, ändert eine Antwort — und der Haken
ist weg. **Das ist zu klären, bevor irgendetwas gebaut wird.** Kandidat für
einen belastbaren Schlüssel: `subdomain + country`, weil daran auch der
Enrichment-Eintrag hängt.

### 3.3 Fristen — heute keine echten Termine

Die Datumsangaben der Seite stammen aus zwei Quellen, beide keine
Behördenkalender:

- **Design-Fixture** (`OBLIGATIONS` in `ResultsRiskMap.tsx`): feste
  Kalendertage wie `due: 'Apr 30', dueSub: '6 days'`. Sie laufen nie weiter —
  in drei Monaten steht dort immer noch „in 6 Tagen".
- **Live**: `packages/compliance-engine/obligation-enrichment.ts`, eine von
  Hand gepflegte Tabelle mit `due` als **Rhythmus** („Quarterly", „Monthly",
  „Ongoing") und `dueDays` als **typischer Anzahl Tage**. Der Kommentar dort
  sagt es selbst: *„editorial ground truth … deterministic, no live lookups"*.

„In 6 Tagen" heißt also „Quartalsmeldung, üblicherweise 30 Tage Frist" — nicht
„Ihre Meldung ist am 30. April fällig". Für den Nutzer sieht es wie Letzteres
aus. Belastbar ist allein `appliesFrom`: das echte ISO-Datum, ab dem eine Norm
greift (etwa die PPWR-Stufen 2030).

Ein echter Fristenkalender braucht zweierlei, das heute fehlt:

1. **Perioden-Stammdaten je Markt** — wann endet das Quartal, bis wann ist zu
   melden, welche Feiertagsregel gilt. Gepflegte Arbeit pro Markt.
2. **Den Stand des Nutzers** — wann hat er zuletzt gemeldet. Das liefert
   genau das Abhaken aus 3.1: `done_at` ist der Anker für die nächste Frist.

Solange beides fehlt, bleibt jede Sortierung nach Dringlichkeit eine
Schätzung, und die Oberfläche darf keine Zahl zeigen, die wie ein
verbindlicher Termin aussieht.

---

## 4 · Reihenfolge

1. 3.2 klären (stabile ID) — blockiert alles Weitere.
2. 3.1 bauen (Tabelle, zwei Endpunkte), Oberfläche nach Abschnitt 2.
3. Fortschritt in die Sitzungen-Liste und ins Dashboard erben lassen.
4. 3.3 Perioden-Stammdaten, Markt für Markt.
