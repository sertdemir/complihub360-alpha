import React from 'react';
import i18n from 'i18next';

// ─── Fehlergrenze der ganzen App ─────────────────────────────────────────────
// Bis 2026-09-22 gab es keine: jeder Render-Fehler und jeder Seiten-Chunk, der
// nicht nachlud, raeumte den Bildschirm WEISS — ohne Satz, ohne Weg zurueck
// (Befund auf Staging: die Glocke fuehrte auf eine weisse Seite, Neu laden
// half nicht). Jetzt steht dort, was passiert ist, und zwei Wege hinaus.
//
// Ein Chunk, der nach einem Deploy nicht mehr existiert, ist kein Fehler der
// Seite, sondern ein veralteter Tab: dann EINMAL selbst neu laden. Der Merker
// ist ein Zeitstempel in sessionStorage: innerhalb einer Minute gibt es keinen
// zweiten automatischen Versuch, sonst liefe ein dauerhaft fehlender Chunk in
// eine Endlosschleife (im Test passiert, bevor der Zeitstempel kam).

const RELOAD_KEY = 'c360_chunk_reload_at';
const RELOAD_WINDOW_MS = 60_000;

function istChunkFehler(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(msg);
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error);
    if (istChunkFehler(error)) {
      try {
        const zuletzt = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - zuletzt > RELOAD_WINDOW_MS) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
        }
      } catch { /* sessionStorage gesperrt: dann bleibt die Fehlerseite */ }
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const t = (k: string) => i18n.t(`common:errorBoundary.${k}`);
    const lang = window.location.pathname.split('/')[1] || 'en';
    return (
      <div role="alert" className="grid min-h-screen place-items-center bg-gradient-stage px-6 py-10 text-fg">
        <div className="w-full max-w-[520px]">
          <h1 className="font-serif text-[26px] font-bold leading-tight">{t('title')}</h1>
          <p className="mt-3 text-body-sm text-fg-secondary">{t('body')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-brand px-4 py-2.5 text-body-sm font-semibold text-fg-on-brand transition-colors hover:brightness-95"
            >
              {t('reload')}
            </button>
            <a
              href={`/${lang}`}
              className="rounded-lg border border-stroke bg-surface px-4 py-2.5 text-body-sm font-semibold text-fg transition-colors hover:bg-surface-secondary"
            >
              {t('home')}
            </a>
          </div>
          <details className="mt-8 text-body-2xs text-fg-tertiary">
            <summary className="cursor-pointer">{t('details')}</summary>
            <code className="mt-2 block whitespace-pre-wrap break-words font-mono">{error.name}: {error.message}</code>
          </details>
        </div>
      </div>
    );
  }
}
