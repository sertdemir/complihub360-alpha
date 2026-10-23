# Runbook: Scaleway-MCP für Claude Code

Stand 23.10.2026. Scaleway liefert keinen eigenen MCP-Server, sondern baut
ihn in die CLI ein: `scw mcp server serve` stellt die CLI-Befehle als
MCP-Tools bereit, über stdio oder streamable HTTP. Die Konfiguration dafür
liegt in [`.mcp.json`](../../.mcp.json) im Repo-Root und gilt für jeden, der
das Projekt mit Claude Code öffnet.

Quelle: `docs/commands/mcp.md` im Repo `scaleway/scaleway-cli` (die
Website scaleway.com ist aus Cloud-Sessions nicht erreichbar).

## Was der Server darf

`.mcp.json` startet ihn bewusst eng:

| Filter | Wert | Grund |
|---|---|---|
| `read-only=true` | nur `get` und `list` | Kein Anlegen, Ändern, Löschen aus dem Chat heraus. Für Budgets, Schlüssel und Deployments bleibt die Konsole zuständig. |
| `namespaces=account,billing,iam,inference` | vier Bereiche | `billing`: Verbrauch und Rechnungen der Generative APIs · `iam`: API-Schlüssel, Policies, Logs · `account`: Projekte · `inference`: Deployments, Modelle. Alles andere (Instances, Storage, Netzwerk) nutzt CompliHub360 nicht. |

Lesend heißt: Claude kann nachsehen, was der Assistent im Monat kostet,
welche Schlüssel es gibt und welche Modelle verfügbar sind. Mehr braucht es
im Alltag nicht. Soll der Server einmal schreiben dürfen, ist das eine
bewusste Änderung an `.mcp.json`, nicht ein Flag im Chat.

## Einrichtung auf dem Mac

1. **CLI installieren**

   ```bash
   brew install scw
   scw version
   ```

2. **API-Schlüssel anlegen**, nur lesend. In der Konsole unter
   IAM → API Keys einen neuen Schlüssel erzeugen, Inhaber ist am besten eine
   eigene IAM-Application „claude-mcp" mit einer Policy aus den
   Permission-Sets `AllProductsReadOnly` oder enger: `BillingReadOnly`,
   `IAMReadOnly`, `ProjectReadOnly`, `InferenceReadOnly`. Der
   Secret Key wird einmal angezeigt.

   Nicht den Schlüssel der API (`LLM_API_KEY`) wiederverwenden. Der darf
   nur Generative APIs aufrufen und gehört in die `.env` auf dem VPS, nicht
   auf den Mac.

3. **CLI anmelden**

   ```bash
   scw init
   ```

   Access Key und Secret Key eingeben, Organisation und Projekt
   „complihub360" wählen, Region `fr-par`. Die CLI legt
   `~/.config/scw/config.yaml` an. Diese Datei ist das Geheimnis; sie bleibt
   auf dem Mac und kommt nie ins Repo.

4. **Prüfen, was der Server anbietet**

   ```bash
   scw mcp server list-tools read-only=true namespaces=account,billing,iam,inference
   scw billing consumption list
   ```

   Die zweite Zeile ist die Gegenprobe, dass der Schlüssel lesen darf.

5. **Claude Code**: Beim nächsten Start im Projektordner fragt Claude Code
   einmal, ob der Server aus `.mcp.json` genutzt werden darf. Bestätigen,
   dann mit `/mcp` prüfen, dass `scaleway` verbunden ist.

   Alternativ ohne Projektdatei, nur für das eigene Konto:

   ```bash
   claude mcp add --scope user scaleway -- scw mcp server serve read-only=true namespaces=account,billing,iam,inference
   ```

6. **Claude Desktop** (optional), in
   `~/Library/Application Support/Claude/claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "scaleway": {
         "command": "/opt/homebrew/bin/scw",
         "args": ["mcp", "server", "serve", "read-only=true", "namespaces=account,billing,iam,inference"]
       }
     }
   }
   ```

   Desktop kennt den Homebrew-Pfad nicht, deshalb der volle Pfad.

## Erste Fragen, die sich lohnen

- „Was haben die Generative APIs diesen Monat gekostet?" → `billing consumption`
- „Welche API-Schlüssel gibt es in der Organisation, und wann wurden sie zuletzt benutzt?" → `iam api-key list`
- „Welche Modelle sind für Inference verfügbar?" → `inference model list`

## Grenzen

- **Cloud-Sessions** (claude.ai/code) können den Server nicht starten: Dort
  gibt es kein `scw`, und `api.scaleway.com` ist hinter dem Proxy gesperrt.
  Claude Code meldet den Server dann als nicht verbunden und arbeitet ohne
  ihn weiter. Das ist erwartet.
- Die 41 Tools des so gestarteten Servers (Stand CLI 23.10.2026, Liste aus
  `list-tools`) sind in `.claude/settings.json` unter `permissions.allow`
  freigegeben (Muster `mcp__scaleway__<tool>`), weil sie alle nur lesen.
  Kommt mit einer neuen CLI-Version ein Tool dazu, fragt Claude Code bei dem
  einmal nach; dann `list-tools` erneut laufen lassen und die Liste nachziehen.
- Wer den Server zusätzlich mit `claude mcp add --scope user` angelegt hat,
  hat ihn doppelt (Projekt und Konto). Claude Code nimmt die Projektfassung;
  die Kontofassung lässt sich mit `claude mcp remove --scope user scaleway`
  entfernen.
- `scw init` legt den Schlüssel im Klartext in `~/.config/scw/config.yaml`
  ab. Wer das nicht will, setzt stattdessen `SCW_ACCESS_KEY`,
  `SCW_SECRET_KEY`, `SCW_DEFAULT_ORGANIZATION_ID`, `SCW_DEFAULT_PROJECT_ID`
  im Schlüsselbund oder in der Shell-Umgebung; `.mcp.json` trägt bewusst
  keine `env`-Werte.
