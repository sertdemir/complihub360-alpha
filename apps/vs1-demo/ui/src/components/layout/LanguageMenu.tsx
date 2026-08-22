import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { NavMenu } from '../ui/NavMenu';

// ─── The language switcher ────────────────────────────────────────────────────
// One component, both headers — the same argument AreasMenuPanel makes. Until
// now there were two: MarketingHeader carried a local LanguageMenu and GlobalNav
// used common/LanguageSwitcher. They disagreed about almost everything that
// matters:
//
//   • MarketingHeader's rendered <a role="menuitem"> with no key handler in the
//     entire file. A screen reader was told it had entered a menu and then found
//     no menu navigation at all — worse than an unlabelled <div>, because the
//     promise is explicit.
//   • GlobalNav's rendered <button>s, so the four locales were not links: no
//     open-in-new-tab, no copy-address, nothing in the screen-reader link list.
//     It also painted itself in raw neutral-*/white classes, so it never
//     followed the theme into dark mode.
//
// NavMenu supplies what both were missing: arrows that wrap, Home/End, Escape
// with focus return, no focus trap on Tab, aria-expanded/aria-controls, and the
// check on the current locale.
//
// The destinations are real <Link>s, not navigate() calls. LocaleLayout in
// App.tsx watches the :locale segment and calls i18n.changeLanguage, so
// client-side navigation carries the language change and <html lang> with it.

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'tr', label: 'Türkçe' },
] as const;

export interface LanguageMenuProps {
  /** Styling for the trigger — the two headers size and tint it differently. */
  triggerClassName?: string;
}

export function LanguageMenu({ triggerClassName }: LanguageMenuProps) {
  const { t } = useTranslation('common');
  const { pathname, search, hash } = useLocation();

  // From the URL, not from i18n: on /de/… the resolved language can still read
  // 'en' while t() already returns German, and the check would then sit on the
  // wrong row. The path segment is what actually says which locale you are on.
  const parts = pathname.split('/');
  const hasLocale = parts.length > 1 && LANGUAGES.some((l) => l.code === parts[1]);
  const current = hasLocale ? parts[1] : 'en';

  // Swap the locale segment if there is one, otherwise prepend it — and keep
  // query and hash, so switching language does not drop the state in the URL.
  const hrefFor = (lng: string) =>
    (hasLocale ? ['', lng, ...parts.slice(2)].join('/') : `/${lng}${pathname}`) + search + hash;

  return (
    <NavMenu panel="popover" align="end" closeKey={pathname}>
      <NavMenu.Trigger
        label={t('header.language', 'Language')}
        iconOnly
        icon={<Globe size={18} />}
        className={triggerClassName}
      />
      <NavMenu.Panel className="min-w-[180px]">
        {LANGUAGES.map((l) => (
          <NavMenu.Item
            key={l.code}
            as={Link}
            href={hrefFor(l.code)}
            isCurrent={l.code === current}
            lang={l.code}
          >
            {l.label}
          </NavMenu.Item>
        ))}
      </NavMenu.Panel>
    </NavMenu>
  );
}
