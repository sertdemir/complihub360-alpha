import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LogoMark } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { verifyMagicToken, actOnEngagement, type EngagementDossier, type UnlockedDossier } from '../../api/engagement';

// ─── Provider magic-link action page ─────────────────────────────────────────
// Target of the e-mailed links (?id=…&token=…&action=confirm|reply|decline).
// Interstitial by design: the GET only VERIFIES the token — the mutation
// happens on the explicit button press (POST). No prefetch side effects.

type Phase = 'verifying' | 'ready' | 'working' | 'done' | 'invalid';

const ACTION_COPY: Record<string, { title: string; gold: string; button: string; done: string }> = {
  confirm: { title: 'Confirm this engagement', gold: 'Confirm', button: 'Confirm engagement', done: 'Engagement confirmed — the client has been notified.' },
  reply: { title: 'Reply to this engagement', gold: 'Reply', button: 'Send reply', done: 'Reply recorded — the client has been notified.' },
  decline: { title: 'Decline this engagement', gold: 'Decline', button: 'Decline engagement', done: 'Engagement declined — the client has been notified.' },
};

export function ProviderMagicActionPage() {
  const params = new URLSearchParams(useLocation().search);
  const token = params.get('token') || '';
  const action = (params.get('action') || 'confirm') as 'confirm' | 'reply' | 'decline';
  const copy = ACTION_COPY[action] ?? ACTION_COPY.confirm;

  const [phase, setPhase] = useState<Phase>('verifying');
  const [engagementId, setEngagementId] = useState('');
  const [message, setMessage] = useState('');
  const [dossier, setDossier] = useState<EngagementDossier | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedDossier | null>(null);

  useEffect(() => {
    if (!token) { setPhase('invalid'); return; }
    verifyMagicToken(token)
      .then((info) => { setEngagementId(info.engagementId); setDossier(info.dossier); setPhase('ready'); })
      .catch(() => setPhase('invalid'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async () => {
    setPhase('working');
    try {
      const u = await actOnEngagement(action, engagementId, token, action === 'reply' ? message : undefined);
      setUnlocked(u);
      setPhase('done');
    } catch {
      setPhase('invalid');
    }
  };

  const answers = dossier ? Object.entries(dossier.structured_answers).filter(([k]) => k !== 'source') : [];

  const [pre, post] = copy.title.split(copy.gold);

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[#1F2937] px-4 text-fg">
      <div className="w-full max-w-[480px] rounded-xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/40">
        <div className="mb-6 flex items-center gap-2">
          <LogoMark tone="on-petrol" className="h-[22px] w-auto" />
          <span className="text-[15px] font-semibold text-white">CompliHub</span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fg-accent">Partner</span>
        </div>

        {phase === 'verifying' && <p className="text-[13px] text-fg-secondary">Verifying your link…</p>}

        {phase === 'invalid' && (
          <>
            <h1 className="font-serif text-[24px] font-semibold text-fg">Link no longer valid</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-secondary">
              This magic link is invalid, expired (24h) or was already used — each link works exactly once.
              Please use the most recent e-mail, or contact the client through your dashboard.
            </p>
          </>
        )}

        {(phase === 'ready' || phase === 'working') && (
          <>
            <h1 className="font-serif text-[24px] font-semibold text-fg">
              {pre}<span className="text-fg-accent">{copy.gold}</span>{post}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tag tone="neutral">Request {engagementId.slice(0, 8).toUpperCase()}</Tag>
              {dossier && <Tag tone="brand">{dossier.country} · {dossier.category}</Tag>}
              <Tag tone="neutral">single-use link</Tag>
            </div>
            {dossier && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-tertiary">Anonymized dossier</p>
                {answers.length > 0 && (
                  <dl className="mt-2 space-y-1">
                    {answers.map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[12px]">
                        <dt className="min-w-[110px] capitalize text-fg-tertiary">{k.replace(/_/g, ' ')}</dt>
                        <dd className="text-fg-secondary">{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="mt-3 border-l-2 border-fg-brand/40 pl-3 text-[12px] italic leading-relaxed text-fg-secondary">
                  “{dossier.message_redacted || '—'}”
                </p>
                <p className="mt-3 text-[11px] text-fg-tertiary">
                  🔒 Requester identity unlocks when you confirm — names and contact details are masked until then.
                </p>
              </div>
            )}
            {action === 'reply' && (
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your reply to the client…"
                className="mt-4 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-fg placeholder:text-fg-tertiary focus:border-fg-brand focus:outline-none"
              />
            )}
            <p className="mt-4 text-[12px] leading-relaxed text-fg-tertiary">
              Pressing the button {action === 'decline' ? 'declines' : 'accepts'} this engagement and burns the link.
              This action is recorded in the audit log.
            </p>
            <Button
              variant={action === 'decline' ? 'danger' : 'accent'}
              className="mt-5 w-full"
              onClick={act}
              disabled={phase === 'working' || (action === 'reply' && message.trim().length < 5)}
            >
              {phase === 'working' ? 'Working…' : copy.button}
            </Button>
          </>
        )}

        {phase === 'done' && (
          <>
            <h1 className="font-serif text-[24px] font-semibold text-fg">Done ✓</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-secondary">{copy.done}</p>
            {unlocked && (
              <div className="mt-4 rounded-lg border border-fg-accent/30 bg-fg-accent/5 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-accent">🔓 Dossier unlocked</p>
                <p className="mt-2 border-l-2 border-fg-accent/40 pl-3 text-[12px] italic leading-relaxed text-fg-secondary">
                  “{unlocked.message || '—'}”
                </p>
                <p className="mt-2 text-[12px] text-fg-secondary">
                  {unlocked.requester_identity.company || unlocked.requester_identity.email
                    ? `${unlocked.requester_identity.company ?? ''}${unlocked.requester_identity.company && unlocked.requester_identity.email ? ' · ' : ''}${unlocked.requester_identity.email ?? ''}`
                    : 'Requester contact will appear in your partner dashboard thread.'}
                </p>
              </div>
            )}
            <p className="mt-4 text-[12px] text-fg-tertiary">You can close this window or open your partner dashboard.</p>
          </>
        )}
      </div>
    </div>
  );
}
