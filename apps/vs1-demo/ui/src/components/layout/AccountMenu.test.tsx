import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AccountMenu } from './AccountMenu';
import { useAuthStore } from '../../store/useAuthStore';

// ─── AccountMenu ──────────────────────────────────────────────────────────────
// Der Grund fuer dieses Bauteil ist ein Loch, das eine Sichtpruefung nicht
// findet: auf /de war Abmelden ueberhaupt nicht erreichbar, weil dort ein
// Dashboard-Knopf stand statt eines Konto-Menues — und aus dem Mobile-Panel war
// Abmelden am 19.09. absichtlich entfernt und "dem Konto-Menue" zugewiesen
// worden. Beide Kopfzeilen sahen fuer sich genommen richtig aus.

const here = dirname(fileURLToPath(import.meta.url));

function signIn(over: Partial<{ role: 'user' | 'partner' | 'admin'; userName: string }> = {}) {
  const logout = vi.fn(async () => {});
  useAuthStore.setState({
    isLoggedIn: true,
    role: over.role ?? 'user',
    userName: over.userName ?? 'Serkan Test',
    logout,
  });
  return logout;
}

function renderMenu(lang = 'de') {
  return render(
    <MemoryRouter initialEntries={[`/${lang}`]}>
      <AccountMenu lang={lang} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  useAuthStore.setState({ isLoggedIn: false, role: null, userName: null });
});

describe('AccountMenu', () => {
  it('zeigt abgemeldet nichts — die Kopfzeilen antworten dort selbst', () => {
    useAuthStore.setState({ isLoggedIn: false, role: null, userName: null });
    const { container } = renderMenu();
    expect(container).toBeEmptyDOMElement();
  });

  it('macht Abmelden erreichbar — der Fund, der dieses Bauteil ausgeloest hat', async () => {
    const user = userEvent.setup();
    const logout = signIn();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /serkan test/i }));
    const abmelden = screen.getByRole('button', { name: /sign out|abmelden/i });
    await user.click(abmelden);

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('macht aus Abmelden einen Knopf, aus dem Dashboard einen Link', async () => {
    const user = userEvent.setup();
    signIn();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /serkan test/i }));

    // Ein Ziel ist ein <a> — neuer Tab, Adresse kopieren, Linkliste.
    const dash = screen.getByRole('link', { name: /dashboard/i });
    expect(dash.tagName).toBe('A');
    expect(dash).toHaveAttribute('href', '/de/dashboard');

    // Abmelden veraendert Zustand und ist deshalb kein Ziel.
    const abmelden = screen.getByRole('button', { name: /sign out|abmelden/i });
    expect(abmelden.tagName).toBe('BUTTON');
    expect(abmelden).not.toHaveAttribute('href');
  });

  it('fuehrt eine Partnerrolle in ihren eigenen Arbeitsbereich', async () => {
    const user = userEvent.setup();
    signIn({ role: 'partner' });
    renderMenu();
    await user.click(screen.getByRole('button', { name: /serkan test/i }));
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/de/partner-dashboard',
    );
  });

  it('sagt am Ausloeser, dass er etwas oeffnet, und schliesst auf Escape', async () => {
    // Beides fehlte der abgeloesten Fassung: kein aria-expanded, und Escape
    // liess das Panel offen stehen (im Browser nachgemessen).
    const user = userEvent.setup();
    signIn();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /serkan test/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(trigger.getAttribute('aria-controls')!)).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('kuendigt kein Menue-Widget an', async () => {
    const user = userEvent.setup();
    signIn();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /serkan test/i }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('haelt eine Rolle ohne eigenen Eintrag nicht fuer ein Unternehmen', async () => {
    // 'admin' fiel in der abgeloesten Fassung auf "Unternehmen" — die
    // Rollenzeile kannte nur partner und sonst.
    const user = userEvent.setup();
    signIn({ role: 'admin' });
    renderMenu();
    await user.click(screen.getByRole('button', { name: /serkan test/i }));
    expect(screen.getByText(/administration/i)).toBeInTheDocument();
  });
});

describe('AccountMenu · beide Kopfzeilen', () => {
  // Positivprobe wie beim NavMenu-Waechter: die Regel liesse sich sonst
  // erfuellen, indem jemand das Bauteil baut und eine Kopfzeile stehen laesst —
  // genau der Zustand, aus dem der Fund kam.
  it.each(['MarketingHeader.tsx', 'GlobalNav.tsx'])('%s benutzt AccountMenu', (file) => {
    const src = readFileSync(join(here, file), 'utf8');
    expect(src, `${file} soll das gemeinsame Konto-Menue benutzen`).toContain('<AccountMenu');
  });

  it('hat den handgebauten Rest in GlobalNav nicht stehen lassen', () => {
    const src = readFileSync(join(here, 'GlobalNav.tsx'), 'utf8');
    expect(src).not.toContain('user-menu-trigger');
    expect(src).not.toContain('text-red-600');
  });
});
