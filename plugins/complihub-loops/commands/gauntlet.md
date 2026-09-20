---
description: Faehrt einen Gauntlet-Loop fuer CompliHub360 — Builder, getrennter Critic, blind A/B, bis STOP greift.
---

Nutze den Skill `complihub-gauntlet`.

Ziel oder Slug: $ARGUMENTS

Wenn dazu bereits eine Spec unter `.loops/` liegt, lade sie und fahre fort.
Wenn nicht, lass zuerst `complihub-loop-architect` eine schreiben und starte
danach.

Der Critic ist immer ein eigener Sub-Agent mit frischem Kontext — auch bei einem
einzigen Stueck.
