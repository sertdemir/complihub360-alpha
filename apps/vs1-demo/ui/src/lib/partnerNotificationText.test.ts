import { describe, it, expect } from 'vitest';
import { partnerNotificationText } from './partnerNotificationText';
import type { PartnerNotification } from '../api/partnerNotifications';

// t gibt Schluessel und Variablen zurueck — geprueft wird die Aufbereitung der Nutzlast.
const t = ((k: string, v?: Record<string, unknown>) => (v ? `${k}|${JSON.stringify(v)}` : k)) as never;
const n = (type: PartnerNotification['type'], payload: Record<string, string>): PartnerNotification =>
  ({ id: '1', type, payload, createdAt: '', unread: true, needsAction: false, topic: 'billing', to: 'billing' });

describe('partnerNotificationText', () => {
  it('macht Minuten zu Stunden und Cents zu Betraegen', () => {
    expect(partnerNotificationText(t, n('appointment_reminder', { offset: '1440', slot: '2026-10-13T10:00:00Z' }), 'en').title).toContain('partnerNotif.hours');
    expect(partnerNotificationText(t, n('credit_issued', { amount: '4470' }), 'en').body).toContain('$44.70');
  });
  it('uebersetzt den Nachweis-Code und nimmt das Ablaufdatum aus `to`', () => {
    const r = partnerNotificationText(t, n('evidence_expiring', { label: 'insurance', to: '2026-11-02' }), 'en');
    expect(r.body).toContain('application.evidence.type.insurance');
    expect(r.body).toContain('Nov');
  });
});
