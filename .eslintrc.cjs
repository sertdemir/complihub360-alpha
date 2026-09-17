/* eslint-env node */

// ESLint 8 (eslintrc), bewusst nicht Flat Config: die lint-Scripts im Repo
// fahren `--ext .ts,.tsx`, das Flat Config nicht mehr kennt, und
// apps/vs1-demo/ui trägt seinen Storybook-Config als `eslintConfig`-Key in
// der package.json — beides eslintrc-Mechanik, die hier weiter kaskadiert.
// Beim Sprung auf ESLint 9 wird das zusammen migriert, nicht halb.

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, node: true, es2022: true },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    // Kein `project`: typbewusstes Linten verlangt, dass JEDE gelintete Datei
    // in einem tsconfig-Include liegt. Das ist hier nicht der Fall (Skripte,
    // Konfigs, Supabase-Functions), und jede Lücke wäre ein harter Parse-Fehler
    // statt eines Befunds. Syntaktisch reicht für die Regeln unten; typbewusste
    // Regeln kommen erst, wenn die tsconfig-Abdeckung dafür steht.
  },
  rules: {
    // Die `_`-Präfix-Konvention wird im Repo bereits benutzt (z. B. `_ok` in
    // apps/vs1-demo/ui/src/api/admin.ts). Ohne diese Zeile meldet die Regel
    // genau die Fälle, die jemand absichtlich als ungenutzt markiert hat.
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],

    // Absichtlich `warn`, nicht `error`. 191 Vorkommen im Bestand: `any` ist
    // hier ein "noch nicht typisiert"-Marker, kein Defekt. Als Fehler wäre die
    // Regel dauerhaft verletzt und damit wirkungslos — als Warnung bleibt der
    // Rückstand sichtbar und zählbar, ohne jeden Lauf rot zu färben.
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: [
    'node_modules/',
    // Alter, kaputt umbenannter Abhängigkeitsbaum im Repo-Wurzelverzeichnis.
    'node_modules.broken/',
    // Build-Artefakte. apps/vs1-demo/ui/dist enthält vollständige Kopien der
    // Quellen und würde sonst jeden Befund doppelt melden.
    'dist/', '**/dist/',
    'build/', '**/build/',
    'coverage/', '**/coverage/',
    '.vite/', '**/.vite/',
    'storybook-static/', '**/storybook-static/',
    'playwright-report/', 'test-results/',
    '*.min.js',
  ],
};
