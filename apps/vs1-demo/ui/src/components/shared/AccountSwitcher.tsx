import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Check, Plus, X } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import {
  clearLocalAuth, forgetAccount, homeFor, isAccountSwitcherEnabled, loadAccounts, ROLE_LABEL, type SavedAccount,
} from '../../lib/accountSwitcher';

// ─── Konto-Umschalter, nur Staging ───────────────────────────────────────────
// Kleine Pille unten links: zeigt das aktive Konto und wechselt per Klick in
// ein anderes, mit dem sich jemand in diesem Browser schon angemeldet hat.
// Werkzeug fuer Tests, kein Produktteil — deshalb deutsch und ohne i18n,
// und ausserhalb von Staging rendert es nichts (lib/accountSwitcher).

export function AccountSwitcher() {
  if (!isAccountSwitcherEnabled) return null;
  return <Switcher />;
}

function Switcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SavedAccount[]>(() => loadAccounts());
  const box = useRef<HTMLDivElement>(null);
  const lang = location.pathname.split('/')[1] || 'de';

  // Die Liste folgt der Anmeldung: jede Sitzung wird im Store gemerkt.
  useEffect(() => { setAccounts(loadAccounts()); }, [user?.id, open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const current = accounts.find((a) => a.userId === user?.id) ?? null;
  if (!accounts.length && !user) return null;

  const switchTo = async (a: SavedAccount) => {
    const sb = await getSupabase();
    if (!sb) return;
    setBusy(a.userId); setNote(null);
    const { error } = await sb.auth.setSession({ access_token: a.accessToken, refresh_token: a.refreshToken });
    setBusy(null);
    if (error) {
      // Abgelaufen oder anderswo abgemeldet: nicht weiter anbieten.
      setAccounts(forgetAccount(a.userId));
      setNote(`Die Sitzung von ${a.email ?? 'diesem Konto'} ist abgelaufen. Bitte einmal neu anmelden.`);
      return;
    }
    setOpen(false);
    navigate(homeFor(a.role, lang));
  };

  // Weiteres Konto: die Sitzung nur im Browser vergessen, NICHT abmelden —
  // jeder signOut widerruft sie auf dem Server (lib/accountSwitcher,
  // clearLocalAuth). Neu laden, damit der Client ohne Sitzung startet.
  const addAccount = async () => {
    const sb = await getSupabase();
    if (sb) await sb.auth.stopAutoRefresh();
    clearLocalAuth();
    window.location.assign(`/${lang}/login`);
  };

  const label = (a: SavedAccount) => a.email ?? a.userId.slice(0, 8);

  return (
    <div ref={box} className="fixed bottom-4 left-4 z-[60] text-[13px]" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {open && (
        <div role="dialog" aria-label="Konto wechseln" className="mb-2 w-[300px] max-w-[calc(100vw-32px)] rounded-xl border border-stroke bg-surface p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">Staging · Konto wechseln</span>
            <button type="button" aria-label="Schließen" onClick={() => setOpen(false)} className="rounded p-1 text-fg-tertiary hover:text-fg"><X size={14} /></button>
          </div>
          <ul className="grid gap-1">
            {accounts.map((a) => {
              const active = a.userId === user?.id;
              return (
                <li key={a.userId}>
                  <button
                    type="button"
                    disabled={active || busy !== null}
                    onClick={() => switchTo(a)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left ${active ? 'bg-brand-light' : 'hover:bg-surface-secondary'} disabled:cursor-default`}
                  >
                    <span className="w-[58px] shrink-0 rounded-md border border-stroke px-1.5 py-[1px] text-center text-[11px] font-semibold text-fg-secondary">{ROLE_LABEL[a.role]}</span>
                    <span className="min-w-0 flex-1 truncate text-fg">{label(a)}</span>
                    {active ? <Check size={14} className="shrink-0 text-fg-brand" aria-label="aktiv" /> : busy === a.userId ? <span className="text-fg-tertiary">…</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {note && <p className="px-2 pt-2 text-[12px] text-error-500">{note}</p>}
          <button type="button" onClick={addAccount} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-fg-brand hover:bg-surface-secondary">
            <Plus size={14} /> Weiteres Konto anmelden
          </button>
          <p className="px-2 pb-1 pt-1 text-[11px] leading-snug text-fg-tertiary">Gemerkt werden nur Konten, mit denen du dich in diesem Browser angemeldet hast. Zum Wechseln nicht abmelden: Abmelden widerruft die Sitzung und entfernt das Konto aus der Liste.</p>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-dashed border-stroke bg-surface px-3 py-1.5 font-medium text-fg shadow-md hover:border-brand"
      >
        <ArrowLeftRight size={14} className="text-fg-brand" />
        {current ? <>{ROLE_LABEL[current.role]} <span className="max-w-[160px] truncate text-fg-tertiary">{label(current)}</span></> : 'Konto wechseln'}
      </button>
    </div>
  );
}
