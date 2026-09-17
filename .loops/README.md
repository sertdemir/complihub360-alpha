# .loops/

Zustand laufender und abgeschlossener Loops aus `complihub-loops`.

Ein Verzeichnis pro Loop:

```
.loops/<slug>/
  LOOP.md      Spec — einmal geschrieben, nur bei Scope-Aenderung angefasst
  ROUNDS.md    Rundenlog — waechst nach unten, wird nie gekuerzt
  artifacts/   optional: Screenshots, Exporte, Diffs pro Runde
```

**Warum das versioniert wird:** der Loop-Zustand liegt bewusst auf Platte statt
im Kontextfenster. Damit ueberlebt ein Loop Kompaktierung, Session-Neustart und
die Uebergabe an einen anderen Menschen.

**Verlorene Runden werden nicht aufgeraeumt.** Sie sind die wertvollsten
Eintraege im Log: sie zeigen, was schon versucht wurde und warum es nicht
gereicht hat.

Format und Regeln: `plugins/complihub-loops/references/loop-protocol.md`
