import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { getSupabase } from '../../lib/supabase';
import { UNAUTHORIZED_EVENT, noteSessionExpired } from '../../lib/sessionExpiry';

// ─── G2: eine 401 mit Token → Anmeldung mit Hinweis ──────────────────────────
// api/client.ts meldet jede 401 auf einen Aufruf, der ein Token trug. Hier
// faellt die Entscheidung: nur wer eine echte Sitzung hat, hat eine verloren.
// Dann wird die lokale Sitzung geraeumt (sonst hielte der Store sie fuer
// gueltig) und der Weg geht zur Anmeldung — mit Ruecksprung auf diese Seite.
// Mehrere parallele 401 loesen den Weg einmal aus.
export function SessionExpiryWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const handled = useRef(false);
  const session = useAuthStore((s) => s.session);
  const here = useRef('');
  here.current = location.pathname + location.search;

  useEffect(() => { if (session) handled.current = false; }, [session]);

  useEffect(() => {
    const onUnauthorized = () => {
      const { session: current, user } = useAuthStore.getState();
      if (!current || handled.current) return;
      handled.current = true;
      noteSessionExpired(user?.email ?? null, here.current);
      const lang = i18n.resolvedLanguage || 'en';
      void (async () => {
        const sb = await getSupabase();
        await sb?.auth.signOut({ scope: 'local' }).catch(() => { /* lokal raeumen klappt auch offline */ });
        navigate(`/${lang}/login?redirect=${encodeURIComponent(here.current)}`, { replace: true });
      })();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [navigate, i18n]);

  return null;
}
