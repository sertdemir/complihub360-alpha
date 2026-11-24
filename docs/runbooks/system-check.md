# Runbook: Systemcheck der Anbindungen

Eingerichtet 2026-11-24 nach dem Durchgang von Hand (Befund: niemand prüfte,
ob die Schlüssel noch gelten). Die API fragt jede Anbindung mit ihrem
hinterlegten Schlüssel einmal **lesend** an: keine Mail, keine Belastung, kein
LLM-Aufruf mit Tokens.

## Was geprüft wird

| Name | Gegenseite | Aufruf | „ok" heißt |
|---|---|---|---|
| `database` | Supabase REST | eine Zeile aus `user_agreements` | der Schlüssel wird angenommen und ist der Server-Schlüssel (`not_service_role`: dort steht der öffentliche anon-Schlüssel) |
| `stripe` | Stripe | `GET /v1/customers?limit=1` | der Schlüssel wird angenommen; der Hinweis nennt `mode_test` oder `mode_live` |
| `mail` | Resend | `GET /domains` | der Schlüssel gilt (`send_only_key`: er darf nur senden, das genügt) |
| `calendar` | Nylas | `GET /v3/grants?limit=1` | der API-Schlüssel wird angenommen |
| `calendar_grants` | Nylas | je verbundenem Anbieter `GET /v3/grants/{id}` | jede Freigabe nennt Nylas ausdrücklich gültig (`grants_3_invalid_0`). `grants_not_loaded`: die Liste ließ sich nicht laden, es wurde nichts geprüft |
| `llm` | Scaleway (oder `LLM_BASE_URL`) | `GET /models` | der Schlüssel wird angenommen |

Zustände: `ok` · `not_configured` (kein Schlüssel hinterlegt) · `rejected`
(Schlüssel abgewiesen, Freigabe abgelaufen) · `unreachable` (keine Antwort in
6 s) · `error` (unerwartete Antwort).

Die Antwort nennt nie einen Schlüssel, einen Antwortkörper oder eine
Freigabe-Kennung, nur Statuscode und einen festen Hinweis.

## Wer fragt

1. **Der Watchdog auf dem VPS, alle fünf Minuten** (`scripts/vps/alert-watchdog.sh`,
   Schlüssel `deps` und `beta_deps`). Er fragt die Route im Container und mailt
   beim Wechsel, auch bei der Erholung. Die API hält ihr Ergebnis fünf Minuten,
   die Gegenseiten sehen also höchstens einen Aufruf je Tick. Scheitert die
   Mail, merkt sich der Watchdog den Wechsel nicht und versucht es beim
   nächsten Tick erneut.
2. **`system-check.yml`, zweimal am Tag von außen.** Rot bei 503, wenn die API
   nicht antwortet, wenn die Antwort kein Bericht ist und wenn die Secrets
   fehlen. GitHub mailt einen roten geplanten Lauf selbst. Das ist der Weg, der
   **nicht an Resend hängt**: Kippt der Mail-Schlüssel, kann der Watchdog nicht
   mailen, dieser Lauf schon. Geplante Läufe kommen in diesem Repository stark
   verspätet; er ist ein Netz unter dem Watchdog, kein Ersatz.
3. **Die API selbst, stündlich** (`startDependencyMonitor`), erster Lauf eine
   Minute nach dem Start. Kippt etwas, steht eine Zeile
   `"level":"error" … "errorCode":"ERR_DEPENDENCY" … "failing":"stripe:rejected"`
   im Log; die Erholung steht als `info`-Zeile da. Das ist die Spur im Log,
   nicht der Alarmweg: der Fehler-Digest des Watchdogs mailt höchstens einmal
   je Stunde und kann eine einzelne Zeile verschlucken.
4. **Von Hand:**

```bash
curl -s -H "x-api-key: $API_KEY" "$API_URL/api/v1/admin/readiness?fresh=1" | jq .
```

   Ohne `?fresh=1` kommt das Ergebnis der letzten fünf Minuten (`"cached": true`).
   200 heißt alles in Ordnung, 503 heißt mindestens ein Befund.

## Was verlangt ist

Ohne weitere Einstellung ist nur die Datenbank verlangt: Eine Anbindung ohne
Schlüssel wird als `not_configured` genannt, macht den Bericht aber nicht rot.
`READINESS_REQUIRED` in der `.env` der API legt fest, was nicht fehlen darf:

```
READINESS_REQUIRED=stripe,mail,calendar,llm
```

Auf der Beta gehören alle vier dazu (`scripts/vps/beta.env.example`), auf
Staging alles, was dort eingerichtet ist. **Ohne diese Zeile fällt ein
verschwundener Schlüssel nicht auf:** Er steht dann als `not_configured` da,
und der Bericht bleibt grün. Ein Name, den es nicht gibt (`resend` statt
`mail`), macht den Bericht rot und steht unter `unknownRequired`. Nach dem
Ändern der `.env` den API-Container neu starten.

## Wenn etwas rot ist

| Befund | Bedeutung | Was tun |
|---|---|---|
| `stripe: rejected` | Schlüssel widerrufen oder abgelaufen | neuen Restricted Key anlegen (`docs/stripe-setup.md`), in die `.env`, Container neu starten |
| `stripe … mode_live` auf der Beta | die Beta-Vereinbarung verspricht Testmodus | sofort auf den Testschlüssel zurück |
| `mail: rejected` / `not_configured` | Anmeldelinks und Benachrichtigungen kommen nicht an | Schlüssel in Resend prüfen, Domain verifiziert? |
| `calendar_grants: rejected` | mindestens eine Kalenderfreigabe ist abgelaufen. Buchen geht weiter, aber die belegten Zeiten dieses Anbieters werden nicht mehr abgezogen (Doppelbuchung möglich), und neue Termine landen nicht in seinem Kalender (`calendar_event_failed` im `event_log`) | der Anbieter verbindet seinen Kalender im Arbeitsbereich neu („Kalender verbinden") |
| `llm: rejected` | der Assistent antwortet mit 503 | Schlüssel in der Scaleway-Konsole prüfen (`llm-scaleway-umstellung.md`) |
| `unreachable` bei einer Gegenseite | deren Ausfall oder unser Netz | Statusseite der Gegenseite; hält es an, Watchdog-Log ansehen |
| `database: rejected` | der Server-Schlüssel gilt nicht mehr | in Supabase unter API-Schlüssel prüfen; ohne ihn läuft nichts |

## Grenzen

- Geprüft wird, dass der Schlüssel **angenommen** wird, nicht jede einzelne
  Berechtigung. Ein Stripe-Schlüssel, der Kunden lesen, aber keine Zahlung
  anlegen darf, steht hier als `ok`.
- Die Annahmen über die Antworten von Resend (Fehlername `restricted_api_key`
  für Nur-Senden-Schlüssel) und Nylas (`grant_status`) sind aus der
  Dokumentation übernommen und am 24.11.2026 **nicht** gegen die echten Dienste
  geprüft worden. Der erste Aufruf von Hand auf Staging zeigt, ob sie stimmen.
- Höchstens 50 Kalenderfreigaben werden je Lauf einzeln geprüft. Sind es mehr,
  steht `calendar_grants` als `error` mit `…_unchecked_N` da: Die Prüfung deckt
  dann nicht mehr alles ab und muss umgebaut werden.
- Ein 200 gilt als Beweis, dass der Schlüssel angenommen wurde. Eine
  Gegenseite, die ohne Anmeldung antwortet (ein eigener LLM-Server ohne
  Schlüsselprüfung), stünde hier als `ok`.
- Bei Resend wird nicht geprüft, ob die Absender-Domain verifiziert ist.
