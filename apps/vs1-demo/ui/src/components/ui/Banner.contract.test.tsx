import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Banner, BannerLink } from './Banner';

// ─── Banner actions + strip · Compass "Alert Strip" (Canvas-Wahl 3A) ─────────
// Mehrere Links stehen UNTER dem Text und sind echte Links mit Unterstrich.
// Der Schliessen-Knopf traegt einen Namen in der Sprache der Seite.

describe('Banner', () => {
  it('rendert actions unter dem Text als echte, unterstrichene Links', () => {
    render(
      <Banner
        status="brand"
        variant="strip"
        title="Sie sind abgemeldet."
        actions={<><BannerLink href="/de/terms">Beta-Vereinbarung lesen</BannerLink><BannerLink href="/de/login">Wieder anmelden</BannerLink></>}
      >
        Buchen geht erst nach der Beta-Vereinbarung.
      </Banner>,
    );
    const hinweis = screen.getByRole('status');
    const links = within(hinweis).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Beta-Vereinbarung lesen', 'Wieder anmelden']);
    expect(links[0]).toHaveAttribute('href', '/de/terms');
    for (const l of links) expect(l).toHaveClass('underline');
    // Unter dem Text, nicht daneben: die Links stehen im selben Block wie der Titel.
    expect(links[0].parentElement!.parentElement).toBe(screen.getByText('Sie sind abgemeldet.').parentElement);
  });

  it('BannerLink rendert mit `as` eine andere Komponente und reicht deren Props durch', () => {
    const Router = ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => <a href={`#${to}`} className={className}>{children}</a>;
    render(<Banner title="T" actions={<BannerLink as={Router} to="/ziel">Weiter</BannerLink>} />);
    expect(screen.getByRole('link', { name: 'Weiter' })).toHaveAttribute('href', '#/ziel');
  });

  it('der Schliessen-Knopf traegt den uebergebenen Namen und ruft onClose', () => {
    const onClose = vi.fn();
    render(<Banner title="T" onClose={onClose} closeLabel="Hinweis schließen" />);
    fireEvent.click(screen.getByRole('button', { name: 'Hinweis schließen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ohne closeLabel bleibt der bisherige Name', () => {
    render(<Banner title="T" onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('strip: Rand nur unten, im Streifen hat das Schliessen 44 px', () => {
    render(<Banner variant="strip" title="T" onClose={() => {}} closeLabel="Schließen" />);
    expect(screen.getByRole('status')).toHaveClass('rounded-none', 'border-x-0', 'border-t-0');
    expect(screen.getByRole('button', { name: 'Schließen' })).toHaveClass('h-11', 'w-11');
  });

  it('strip mit innerClassName legt den Inhalt in einen eigenen Container', () => {
    render(<Banner variant="strip" title="Titel" innerClassName="mx-auto max-w-[1320px] px-6" />);
    const innen = screen.getByText('Titel').closest('.max-w-\\[1320px\\]');
    expect(innen).not.toBeNull();
    expect(innen!.parentElement).toBe(screen.getByRole('status'));
  });

  it('die bisherige einzelne action rechts bleibt, wie sie war', () => {
    render(<Banner title="T" action={<a href="/x">Mehr</a>} />);
    expect(screen.getByRole('link', { name: 'Mehr' })).toBeInTheDocument();
  });
});
