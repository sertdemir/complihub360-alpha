import { defineConfig } from "vitest/config";

// Nur die Quelle testen, niemals das Build-Artefakt.
//
// Der tsconfig zieht ganz `src` ein, also kompiliert `tsc -b` auch
// Orchestrator.test.ts nach dist/. Ohne diese Einschränkung findet vitest
// beide Kopien und führt sie aus — die aus dist/ in dem Stand, in dem sie
// zufällig zuletzt gebaut wurde. Genau daran ist hier lange nichts
// aufgefallen: dist/Orchestrator.test.js trug noch das alte
// `runTests()`-Skript und meldete "No test suite found", während die Quelle
// längst anders aussah.
//
// Bewusst nicht über ein tsconfig-`exclude` gelöst (wie in
// packages/compliance-engine und services/compliance-api): dort fallen die
// Tests damit auch aus der Typprüfung. Hier bleibt die Testdatei Teil von
// `tsc -b` und damit gegen API-Drift im Orchestrator abgesichert.
export default defineConfig({
    test: {
        include: ["src/**/*.test.ts"],
    },
});
