# Runbook: Test-Provider in der Beta

Stand 15.10.2026. Es gibt noch keine echten Provider. Damit Beta-Tester trotzdem
die echten Wege gehen können (Risk Map, Treffer, Termin buchen, Nachricht),
stehen in der Beta 25 vollständige Test-Provider. Auf der Provider-Seite
**antwortet ein Mensch**, die Mitgründerin. Das ist keine Automatik: Die AI gibt sich nie
als Fachperson aus (DNA, `KN-BRAND-001`).

## Entscheidungen (Nutzer, 15.10.2026)

| Punkt | Entscheidung |
|---|---|
| Wer antwortet | Mensch im Produkt: die Mitgründerin |
| Postfach | `demet+p01@complihub360.com` … `+p25@`. Alles landet in einem Postfach. |
| Verteilung | gleichmäßig über 9 Bereiche × 8 Märkte |
| Kennzeichnung | keine im Produkt. Der Hinweis steht in den Beta-Bedingungen. **Tester bekommen Zugang erst, wenn sie die Bedingungen gesehen haben.** |
| Wächter | scharf: Erinnerungen und Herabstufung wie bei echten Providern |

## Was das Skript anlegt

`scripts/beta/seed-test-providers.mjs` legt je Provider Folgendes an:
- einen Login mit `app_metadata.role='partner'` und einem gemeinsamen Passwort,
- einen Stripe-Kunden im **Testmodus** mit Testkarte `pm_card_visa`. Ohne Karte lehnt die Buchung mit `BILLING_NOT_READY` ab.
- `providers` (`active`, `billing_ready`), `provider_members`, Leistungen und Abdeckung (`approved`),
- Nachweise: Zulassung je Land für die regulierten Bereiche `tax-vat` und `legal-advisory`,
- Vereinbarungen in Version `2026-09`,
- ein Abo. Essential (1 Bereich), Growth (2) und Global (3) wechseln sich ab.

Je Provider sind es 3 Märkte. Jede der 72 Zellen hat mindestens einen und höchstens drei Provider. Das prüfen `npm run scripts:test` in CI und das Skript selbst nach dem Schreiben gegen die View `matchable_provider_services`.

Alle Schlüssel beginnen mit `tp-`. Darüber findet `--remove` sie wieder.

Schutz: `--ref` muss zur URL passen, Staging (`kqylqwogxbiwpnomkzsn`) wird abgewiesen, und der Stripe-Schlüssel muss ein Testschlüssel sein.

## Ausführen

```bash
# Mac, im Repo
git pull
scp scripts/beta/seed-test-providers.mjs vps:/root/ch360/beta/
scp scripts/vps/seed-test-providers.sh vps:/root/ch360/vps/
ssh vps

# VPS
cd /root/ch360/vps
bash seed-test-providers.sh            # Probelauf: Plan und Abdeckungstabelle, schreibt nichts
bash seed-test-providers.sh --apply    # fragt das gemeinsame Passwort verdeckt ab
```

Das Passwort liegt im Passwort-Manager (`Beta Test-Provider · gemeinsam`) und
wird mit der Mitgründerin geteilt. Es gehört nicht in den Chat und nicht ins Repo.

Ein zweiter `--apply` legt nichts doppelt an. Vorhandene `tp-*` werden übersprungen.

## Arbeitsweise der Mitgründerin

- Gmail-Filter: *An* enthält `demet+p` → Label „CH360 Test-Provider“.
- Die Empfängeradresse sagt, als wer sie sich anmeldet: `+p07` steht für Provider 07. Die Anmeldung läuft über `beta.complihub360.com` (Basic-Auth-Zugang `demet`), Reiter „Provider“, dann Adresse und gemeinsames Passwort.
- Fristen: Bestätigung innerhalb von 24 Stunden. Die Wächter laufen scharf.
- Für Buchungen zwei Browser-Profile oder ein privates Fenster nutzen: einmal Nutzer, einmal Provider.

## Entfernen

```bash
bash seed-test-providers.sh --remove
```

Das entfernt alle `tp-*` samt Login und Stripe-Testkunde. Provider mit Terminen
bleiben stehen und werden gemeldet. Diese Termine zuerst klären.
