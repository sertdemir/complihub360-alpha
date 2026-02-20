# Vertical Slice 1 (VS1) - Compliance Check Pipeline

## Übersicht

Der **Vertical Slice 1** demonstriert den kompletten End-to-End Datenfluss (produktnah) eines "Compliance Checks" in der CompliHub360 Plattform.
Der User reicht einen Payload (Text & Tags) ein, welcher vom Backend über den Orchestrator und die Registry an einen rule-based Agenten geroutet wird. Die gefundenen Ergebnisse (Findings) werden abschließend durch die zentrale Policy Engine geprüft und entweder genehmigt oder blockiert.

## Beteiligte Packages

1. **`@complihub360/types`**: Beherbergt die zentralen Contracts (`ComplianceCheckRequest`, `ComplianceCheckResponse`, `ComplianceCheckFinding`).
2. **`@complihub/agent-core`**: Enthält den `compliance-check-agent`, der deterministisch Texte nach Länge, "password" Keywords und "public" Tags analysiert.
3. **`@complihub/agent-registry`**: Verwaltet das Default-Setup und registriert den Agent anhand seiner Capability (`compliance_check`).
4. **`@complihub/policy-engine`**: Implementiert die Regel: *Deny wenn Findings irgendeine Severity="high" UND tags="public" enthalten. Allow sonst.*
5. **`@complihub/task-orchestrator`**: Stellt den Endpoint `runComplianceCheck` bereit, der IDs generiert, den Agent ausführt und an die Policy Engine zur Freigabe reicht.
6. **`@complihub/compliance-api`** (`services/compliance-api`): Ein minimaler, dependencies-freier Node HTTP Server (Port `3001`), der die Orchestrator-Funktion aufruft.
7. **`@vs1-demo/ui`** (`apps/vs1-demo/ui`): Eine simple React Vite App, die das Formular (`ComplianceCheckForm.tsx`) darstellt und via `fetch()` an die API funkt.

## Lokal Starten

### 1. Abhängigkeiten installieren & bauen

Im Root-Verzeichnis ausführen:

```bash
npm install
npm run typecheck
npm run build
```

### 2. Services hochfahren

Beide Scripte im Root-Verzeichnis ausführen (idealerweise in separaten Terminal-Tabs oder via `concurrently` / TMs):

```bash
npm run dev:service
npm run dev:ui
```

*Die UI ist danach typischerweise unter `http://localhost:5173` erreichbar, die API unter `http://localhost:3001`.*

### 3. API Direkt Testen (cURL)

```bash
curl -X POST http://localhost:3001/api/compliance/check \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "default-tenant",
    "appId": "vs1-demo",
    "text": "This is a password for the API",
    "tags": ["public", "draft"]
  }'
```

*(Hier wird die API ein "Deny" zurückliefern, aufgrund des Secrets in Kombination mit dem Tag "public".)*

## Ausblick (VS2)

Für den nächsten Vertical Slice (VS2) wird folgendes Setup empfohlen:

1. **Authentifizierung**: Middleware Integration zur Validierung von User-Sessions und echten Tenant-Zuweisungen.
2. **Audit Logging**: Sämtliche via API ausgelösten `EventEnvelope` und `TaskResult`-Ereignisse hart in eine lokale Dateistruktur oder DB loggen.
