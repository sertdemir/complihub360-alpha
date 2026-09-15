import { forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PartnerCard, MatchBasis } from './PartnerCard';
import { PartnerDrawer } from './PartnerDrawer';
import { runSearch, type AnonProvider } from '../../api/search';
import { fetchUserBookings } from '../../api/bookings';
import type { SearchProfile } from '../wizard/WizardContext';

// ─── Anbieter fuer den Bereich (Canvas 5D, 2026-09-13) ───────────────────────
// Dieselbe Partner-Karte wie auf der Sitzungsseite (PartnerCard — Nutzer-
// Vorgabe 2026-09-13: eine Darstellung, nur „Details ansehen"), hier nach
// Bereich statt nach Sitzung gesucht: POST /search mit dem Bereich als
// einziger Domaene und dem Hauptmarkt des Nutzers. Die Match-Basis zeigt
// dann Markt und diesen einen Bereich.
//
// „Details ansehen" oeffnet die PARTNER-SCHUBLADE (Canvas 1C, Nutzer-
// Entscheidung 2026-09-15), nicht mehr die eigene Partnerseite: der Nutzer
// bleibt auf der Bereichsseite, die Liste bleibt sichtbar, Vergleichen heisst
// naechste Karte, naechste Schublade. Die Buchung passiert in derselben
// Schublade (Schritt zwei), der Bereich bleibt die ganze Zeit stehen. Die
// volle Seite wird erst wieder verlinkt, wenn es eine Partner-Uebersichts-
// seite und einen Navigationspunkt „Partner" gibt.
//
// Die Karten kennen die Termine des Nutzers (GET /bookings): wo einer liegt,
// traegt die Karte den KLARNAMEN und den Termin statt des Pseudonyms — beim
// Laden wie unmittelbar nach einer Buchung in der Schublade (Nutzer
// 2026-09-15). Drei Karten nebeneinander, ohne Umbruch.

/** Termin je Anbieter — nur bestaetigte und abgeschlossene zaehlen; eine
 *  abgesagte Buchung nimmt den Klarnamen nicht zurueck, aber sie ist kein
 *  Termin mehr und soll auf der Karte nicht als einer stehen. */
export type BookingByKey = Record<string, { name: string; slotStart: string }>;

export async function loadBookingsByKey(): Promise<BookingByKey> {
  const rows = await fetchUserBookings();
  const out: BookingByKey = {};
  for (const b of rows) {
    if (b.status !== 'confirmed' && b.status !== 'completed') continue;
    const prev = out[b.providerKey];
    // Der naechstliegende Termin gewinnt die Karte.
    if (!prev || new Date(b.slotStart) < new Date(prev.slotStart)) {
      out[b.providerKey] = { name: b.providerName, slotStart: b.slotStart };
    }
  }
  return out;
}

export const DomainProviders = forwardRef<HTMLElement, {
  slug: string;
  areaLabel: string;
  /** Hauptmarkt des Nutzers in diesem Bereich; ohne Sitzung DE. */
  country: string;
}>(function DomainProviders({ slug, areaLabel, country }, ref) {
  const { t } = useTranslation('userws');
  const [providers, setProviders] = useState<AnonProvider[] | null>(null);
  const [open, setOpen] = useState<AnonProvider | null>(null);
  const [booked, setBooked] = useState<BookingByKey>({});

  useEffect(() => {
    let alive = true;
    runSearch({ country, categories: [slug] as SearchProfile['categories'] })
      .then((r) => { if (alive) setProviders(r.providers ?? []); })
      // Ohne Suche keine Anbieter — die Karte sagt das, statt zu erfinden.
      .catch(() => { if (alive) setProviders([]); });
    return () => { alive = false; };
  }, [slug, country]);

  useEffect(() => {
    let alive = true;
    loadBookingsByKey()
      // Ohne Termine bleibt es beim Pseudonym — kein Fehler, nur nichts zu zeigen.
      .then((b) => { if (alive) setBooked(b); })
      .catch(() => { if (alive) setBooked({}); });
    return () => { alive = false; };
  }, []);

  return (
    <section ref={ref} className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-body-md font-bold text-fg">
          {t('domainPage.providersTitle', { area: areaLabel })}{' '}
          {providers && providers.length > 0 && <span className="text-fg-brand">{providers.length}</span>}
        </h2>
      </div>
      {providers === null ? (
        <p className="text-body-xs text-fg-tertiary">{t('shared.loading')}</p>
      ) : providers.length === 0 ? (
        <p className="text-body-xs text-fg-tertiary">{t('domainPage.providersNone')}</p>
      ) : (
        // Drei nebeneinander, ohne Umbruch (Nutzer 2026-09-15). Unter 768 px
        // passen drei Karten in kein Raster mehr, in das ein Klarname hinein-
        // geht — dort steht eine unter der anderen.
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {providers.map((p, i) => (
            <PartnerCard
              key={p.provider_key}
              provider={p}
              top={i === 0}
              basis={p.match_basis ? <MatchBasis basis={p.match_basis} /> : undefined}
              booking={booked[p.provider_key] ?? null}
              onDetails={() => setOpen(p)}
            />
          ))}
        </div>
      )}
      <PartnerDrawer
        open={open !== null}
        onClose={() => setOpen(null)}
        provider={open}
        basisNode={open?.match_basis ? <MatchBasis basis={open.match_basis} /> : undefined}
        booking={open ? booked[open.provider_key] ?? null : null}
        onBooked={(key, b) => setBooked((prev) => ({ ...prev, [key]: b }))}
      />
    </section>
  );
});
