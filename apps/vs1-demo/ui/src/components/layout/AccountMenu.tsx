import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { NavMenu } from '../ui/NavMenu';
import { Avatar } from '../ui/Avatar';
import { useAuthStore, type UserRole } from '../../store/useAuthStore';
import { initialsOf } from '../../lib/initials';

// ─── AccountMenu ──────────────────────────────────────────────────────────────
// Das Konto-Menue der Desktop-Leiste, einmal, fuer beide Kopfzeilen — dasselbe
// Versprechen, das navLinks.ts fuer die Eintraege und AccountActions fuer das
// Mobile-Panel gibt.
//
// Bis 2026-09-22 gab es dieses Menue nur in GlobalNav, handgebaut. Auf der
// Startseite (MarketingHeader) stand an seiner Stelle ein gefuellter
// "Mein Dashboard"-Knopf. Das hatte eine Folge, die niemand entschieden hat:
//
//   Abmelden war auf /de nicht erreichbar.
//
// Nicht in der Leiste und nicht im Mobile-Panel — aus dem Panel wurde Abmelden
// am 19.09. absichtlich herausgenommen und "dem Konto-Menue" zugewiesen, nur
// hat die Startseite keins. Wer sich abmelden wollte, musste die Startseite
// erst verlassen. Auf der Seite, die Angemeldete am haeufigsten als Einstieg
// treffen.
//
// Nutzer-Entscheidung 2026-09-22, Variante A: der Dashboard-Knopf weicht dem
// Menue, das jede andere Seite schon traegt. Eine Antwort auf der ganzen Site.
// Das Dashboard bleibt der erste Eintrag darin, der Weg dorthin kostet also
// einen Klick mehr — bewusst bezahlt fuer eine Kopfzeile, die ueberall gleich
// antwortet.
//
// Auf NavMenu, nicht handgebaut. Der abgeloeste Block in GlobalNav war die
// vierte handgebaute Variante desselben Musters; NavMenu existiert, weil die
// ersten drei es waren (siehe dort). Gemessen am 22.09., bevor er wich:
//
//   aria-expanded          fehlte     — der Knopf sagte nie, dass er etwas oeffnet
//   Escape                 schloss nicht
//   Pfeiltasten            gab es nicht
//
// Was NavMenu bewusst NICHT tut: role="menu" oder aria-haspopup="menu"
// ankuendigen. Die Begruendung steht in NavMenu.tsx, der Waechter dazu in
// NavMenu.guard.test.ts.

/** Rollenzeile unter dem Namen. Lag bis 2026-09-22 als deutscher Text im Code
 *  ("Unternehmen" / "Beratungspartner") und stand damit in allen vier Sprachen
 *  auf Deutsch. 'admin' fehlte ganz und fiel auf "Unternehmen". */
const ROLE_KEY: Record<UserRole, { key: string; fallback: string }> = {
  user: { key: 'account.role.user', fallback: 'Company' },
  partner: { key: 'account.role.partner', fallback: 'Advisory partner' },
  admin: { key: 'account.role.admin', fallback: 'Administration' },
};

export interface AccountMenuProps {
  /** Aktives Sprachsegment, z. B. 'de'. */
  lang: string;
  /** Ueber einem dunklen Hero — faerbt nur den Ausloeser, nie das Panel. */
  inverse?: boolean;
  /** Schliesst das Menue bei Routenwechsel — den aktuellen pathname uebergeben. */
  closeKey?: string;
  className?: string;
}

export function AccountMenu({ lang, inverse = false, closeKey, className }: AccountMenuProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { isLoggedIn, role, userName, logout } = useAuthStore();

  // Die Kopfzeilen entscheiden selbst, was sie abgemeldet zeigen — die beiden
  // Zustaende sehen dort verschieden aus. Hier nur der angemeldete.
  if (!isLoggedIn) return null;

  const effectiveRole: UserRole = role ?? 'user';
  const name = userName || t('account.fallbackName', 'My account');
  const roleLine = ROLE_KEY[effectiveRole];
  // Unveraendert aus beiden Kopfzeilen uebernommen: eine Rolle 'admin' landet
  // weiterhin im Nutzer-Dashboard. Ob sie stattdessen ins Control Center
  // gehoert, ist eine eigene Entscheidung und nicht Teil dieser.
  const dashHref = `/${lang}${effectiveRole === 'partner' ? '/partner-dashboard' : '/dashboard'}`;

  return (
    <NavMenu align="end" closeKey={closeKey} className={className}>
      <NavMenu.Trigger
        label={name}
        icon={<Avatar size="sm" initials={initialsOf(userName)} tone="accent" />}
        className={[
          'max-w-[200px] gap-2 px-2 py-1.5 font-semibold',
          inverse ? 'text-white/85 hover:text-fg-inverse' : '',
        ].join(' ')}
      />
      <NavMenu.Panel
        header={
          <>
            <p className="truncate text-body-sm font-semibold text-fg">{name}</p>
            <p className="mt-0.5 text-body-xs text-fg-tertiary">
              {t(roleLine.key, roleLine.fallback)}
            </p>
          </>
        }
      >
        <NavMenu.Item as={Link} href={dashHref} icon={<LayoutDashboard size={16} />}>
          {t('nav.dashboard', 'My dashboard')}
        </NavMenu.Item>
        <NavMenu.Action
          tone="danger"
          icon={<LogOut size={16} />}
          onClick={() => {
            // Reihenfolge wie in der abgeloesten Fassung: abmelden, dann auf
            // die Startseite der aktiven Sprache. logout() ist async und wird
            // auch dort nicht abgewartet — der Auth-Listener zieht den Zustand
            // nach, die Navigation haengt nicht daran.
            void logout();
            navigate(`/${lang}`);
          }}
        >
          {t('nav.signOut', 'Sign out')}
        </NavMenu.Action>
      </NavMenu.Panel>
    </NavMenu>
  );
}
