---
title: "Referenz-ID für \"Technical details\" (Risk Map failed, Canvas-Wahl B3)"
assignee: "Claude"
status: "review"
---

# Referenz-ID für "Technical details"

## Objective

Canvas-Wahl **B3** (Risk Map failed) zeigt unter dem abgenommenen Zustand
aufklappbar *Technical details*: Referenz-ID und Zeitpunkt (UTC) des
gescheiterten Aufrufs. Der Nutzer nennt sie dem Support, und der Support findet
den Fehler damit im Log.

Die Copy ist abgenommen (Nutzer, 2026-09-22). Dieses Ticket liefert, was die
Copy voraussetzt: eine ID, die Browser und Log **gemeinsam** kennen. Die
Oberfläche selbst folgt nach dem UI-Workflow: Figma (Stufe 2), danach
lokaler Rollout mit Review (Stufe 3).

## Ausgangslage: die ID gab es, sie kam nur nicht an

`apiFetch` schickt seit Langem je Anfrage eine `x-correlation-id`, und
`ApiError` trägt sie. Auf den Wegen, auf denen B3 erscheint, ging sie trotzdem
verloren:

| Weg | bis heute | jetzt |
|---|---|---|
| Suche scheitert im Server (z. B. Datenbank) | `400 { error: String(err) }`: falscher Status, die interne Meldung roh im Browser, **kein Log**, keine ID | `500 { errorCode, message, correlationId }`, Log-Zeile `ERR_SEARCH` mit ID und Ursache |
| Body ist kein JSON | derselbe Zweig: 400 mit Parser-Meldung | `400 INVALID_JSON` mit ID |
| Keine Antwort (Netz, CORS, Server weg) | roher `TypeError`, **ID weg** | `ApiError` mit Status 0 und der gesendeten ID |
| 200 mit unlesbarem Body (Proxy-Seite) | roher `SyntaxError` | `ApiError` mit ID |
| Eingang | jeder Header-Wert ungeprüft übernommen, auch Text und beliebige Länge | nur 8–64 Zeichen `[A-Za-z0-9-]`, sonst eigene ID |

## Acceptance Criteria

- [x] Jeder Fehlerweg von `apiFetch` endet in einem `ApiError` mit Referenz-ID und UTC-Zeitstempel (`at`).
- [x] Die ID im Fehler ist die, **unter der der Server geloggt hat**: aus dem Body, dann aus dem Antwort-Header, erst dann die gesendete.
- [x] Die Suche schreibt ihre Fehler mit ID ins Log und gibt nach außen nur `errorCode`, `message` und die ID zurück.
- [x] `x-correlation-id` steht auf jeder Antwort der Suche und ist per CORS lesbar (`Access-Control-Expose-Headers`, Staging hat getrennte Origins).
- [x] `useApiData` gibt den Fehler des letzten Ladeversuchs heraus (`error`), `referenceOf(err)` macht daraus `{ id, at }` oder `null`.
- [x] Keine erfundene Referenz: Fehler, die nicht aus `apiFetch` kommen, haben keine (`null`), und eine Fläche zeigt dann keine Details.
- [x] Abgenommene Copy in `common:states` (4 Sprachen): `scope.triedToAssess`, `scope.checked`, `scope.markets`, `scope.areas`, `technicalDetails`; EN wortgleich über `npm run copy:check`.
- [x] OpenAPI: Header-Parameter, Antwort-Header, `ErrorResponse`, 400/500 der Suche.

## Tests und Sabotagen

| Test | Sabotage | Ergebnis |
|---|---|---|
| API: ID wird zurückgegeben, auch bei Erfolg; Expose-Header | — | grün |
| API: fremde Werte werden ersetzt | alte `normalizeCorrelationId` | **rot** |
| API: Fehler → 500, Log mit ID und Ursache, Antwort ohne Interna | alter Fehlerzweig (`400 String(err)`) | **rot** |
| API: kaputtes JSON → 400 mit ID | — | grün |
| Client: 6 Fälle (Netz, Body-ID, Header-ID, Rückfall, 200 unlesbar, eigene ID + UTC) | alter Client | **5 von 6 rot** (der sechste prüft `referenceOf` auf Nicht-API-Fehler) |
| Hook: `error` bei Fehlschlag, `null` bei Erfolg | — | grün |
| Copy: EN wortgleich | "What we checked" → "What we reviewed" | **rot** |

API 157/157, UI (unit) 237/237, `npm run build` grün.

## Nicht in diesem Ticket

- **Die Fläche.** *Technical details* auf der Risk Map und die Umfangs-Box
  (B3 *What we tried to assess*, C3 *What we checked*) kommen mit dem
  UI-Rollout nach Figma. Das Plumbing hier ändert nichts Sichtbares.
- Die übrigen Routen haben ihr Fehlerformat schon (`errorCode`, `message`,
  `correlationId`). Ob jede auch loggt, ist nicht geprüft.

## DNA-Check

Betroffen: **Copy und Microcopy** (fünf neu abgenommene Strings als Vertrag).

- **Sind wir bereit, Verantwortung zu übernehmen, wenn etwas schiefgeht?**
  Bis heute hieß ein Serverfehler bei der Suche "deine Anfrage ist falsch"
  (400), und niemand konnte ihn finden. Jetzt gibt es eine Spur, die der
  Nutzer in der Hand hält.
- **Keine Reibung vor dem Menschen:** *Contact Support* ohne Referenz heißt
  Rückfragen und Suchen. Mit ID ist der erste Kontakt schon der hilfreiche.
- **Unsicherheit nicht hinter selbstsicherer Sprache verstecken:** Die Antwort
  sagt nur, *dass* die Suche gescheitert ist, und rät nicht, warum. Die
  Ursache steht im Log, nicht beim Nutzer.

## Agent Audit Log

- [2026-09-22] **Claude**: Server (Fehlerzweig, Validierung, Expose), Client (alle Fehlerwege mit ID + UTC), Hook, Copy, OpenAPI; 13 Tests, 4 Sabotagen. (Status: review)
