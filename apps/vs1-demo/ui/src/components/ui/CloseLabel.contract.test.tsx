import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { Banner } from './Banner';
import { Drawer } from './Drawer';
import de from '../../../public/locales/de/common.json';
import en from '../../../public/locales/en/common.json';
import es from '../../../public/locales/es/common.json';
import tr from '../../../public/locales/tr/common.json';

// ─── Schliessen-Knoepfe sprechen die Sprache der Seite ───────────────────────
// Bis 2026-11-28 hiessen sie fuer Screenreader fest "Close" (Drawer) und
// "Dismiss" (Banner), auf jeder Sprachfassung. Der Standard kommt jetzt aus
// common:a11y; ein eigener closeLabel des Aufrufers gewinnt weiter.

async function instance(lng: string) {
  const i = i18next.createInstance();
  await i.use(initReactI18next).init({
    lng,
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    resources: { de: { common: de }, en: { common: en }, es: { common: es }, tr: { common: tr } },
    interpolation: { escapeValue: false },
  });
  return i;
}

const EXPECTED: Record<string, { close: string; dismiss: string }> = {
  de: { close: 'Schließen', dismiss: 'Hinweis schließen' },
  en: { close: 'Close', dismiss: 'Dismiss notice' },
  es: { close: 'Cerrar', dismiss: 'Cerrar aviso' },
  tr: { close: 'Kapat', dismiss: 'Bildirimi kapat' },
};

describe('Schliessen-Knoepfe', () => {
  for (const lng of Object.keys(EXPECTED)) {
    it(`${lng}: Drawer und Banner benennen den Knopf in der Sprache der Seite`, async () => {
      const i = await instance(lng);
      render(
        <I18nextProvider i18n={i}>
          <Banner title="Titel" onClose={() => {}} />
          <Drawer open onClose={() => {}} title="Schublade">Inhalt</Drawer>
        </I18nextProvider>,
      );
      expect(screen.getByRole('button', { name: EXPECTED[lng].dismiss })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: EXPECTED[lng].close })).toBeInTheDocument();
    });
  }

  it('ein eigener closeLabel des Aufrufers gewinnt', async () => {
    const i = await instance('de');
    render(
      <I18nextProvider i18n={i}>
        <Banner title="Titel" onClose={() => {}} closeLabel="Meldung ausblenden" />
      </I18nextProvider>,
    );
    expect(screen.getByRole('button', { name: 'Meldung ausblenden' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hinweis schließen' })).toBeNull();
  });
});
