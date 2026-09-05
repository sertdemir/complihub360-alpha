import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Drawer } from '../ui/Drawer';
import { AnimatedWizard } from '../home/AnimatedWizard';

// ─── Wizard als Schublade ────────────────────────────────────────────────────
// Nutzer-Vorgabe 2026-09-05: Jeder "Anbieter finden"-Weg im Arbeitsbereich
// oeffnet den Vier-Schritte-Wizard als Schublade von rechts — die Ansicht
// bleibt stehen, niemand wird auf die Marketing-Seite /wizard gerissen. Am
// Ende fuehrt der Abschluss wie bisher zur Ergebnisseite (im Arbeitsbereich).
//
// Ein Kontext, damit jede Flaeche (Leerzustaende, Kopfzeilen-Knoepfe, die
// Aktions-Schublade) denselben Wizard oeffnet, und die Schublade nur einmal
// in der Shell haengt.

interface WizardDrawerApi {
  openWizard: () => void;
}

const Ctx = createContext<WizardDrawerApi | null>(null);

export function useWizardDrawer(): WizardDrawerApi {
  const api = useContext(Ctx);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || 'en';
  // Ohne Provider (Flaechen ausserhalb der Dashboard-Route) bleibt der alte
  // Weg zur Wizard-Seite — besser als ein Absturz.
  return api ?? { openWizard: () => navigate(`/${locale}/wizard`) };
}

export function WizardDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('userws');
  const locale = i18n.resolvedLanguage || 'en';
  const openWizard = useCallback(() => setOpen(true), []);
  const api = useMemo(() => ({ openWizard }), [openWizard]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <Drawer open={open} onClose={() => setOpen(false)} size="xl" eyebrow={t('wizardDrawer.eyebrow')} title={t('wizardDrawer.title')}>
        {/* `key` setzt den Wizard bei jedem Oeffnen auf Schritt 1 zurueck. */}
        {open && (
          <AnimatedWizard
            key="wizard-drawer"
            spacious
            interactive
            showHeader={false}
            onComplete={(profile) => {
              setOpen(false);
              navigate(`/${locale}/results`, { state: { searchProfile: profile } });
            }}
            className="!min-h-0 !rounded-none !border-0 !bg-transparent !shadow-none"
          />
        )}
      </Drawer>
    </Ctx.Provider>
  );
}
