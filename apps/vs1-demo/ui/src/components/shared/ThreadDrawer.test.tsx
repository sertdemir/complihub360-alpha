import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThreadDrawer } from './ThreadDrawer';
import { ApiError } from '../../api/client';
import type { EngagementDetail } from '../../api/thread';

// ─── Thread · Nachricht nicht gesendet (Punkt 1, Canvas T2, 15.10.2026) ──────
// Vorher verschluckte der Drawer den Fehler still. Jetzt bleibt die Nachricht
// als „Not sent“ im Verlauf — ausser sie ist trotz Fehler angekommen.

const { fetchEngagementDetail, postThreadMessage } = vi.hoisted(() => ({
  fetchEngagementDetail: vi.fn(),
  postThreadMessage: vi.fn(),
}));

vi.mock('../../api/thread', () => ({
  fetchEngagementDetail: (...a: unknown[]) => fetchEngagementDetail(...a),
  postThreadMessage: (...a: unknown[]) => postThreadMessage(...a),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const BODY = 'Could we move the call to Thursday afternoon?';

function detail(extra: EngagementDetail['messages'] = []): EngagementDetail {
  return {
    engagement: { id: 'e-1', provider_key: 'x', country: 'Germany', category: 'VAT registration', status: 'replied', created_at: '2026-10-13T08:00:00Z' },
    messages: [
      { id: 'm1', author: 'provider', body: 'Does a call this week work for you?', created_at: '2026-10-13T09:00:00Z' },
      ...extra,
    ],
  } as EngagementDetail;
}

async function openAndSend() {
  render(<ThreadDrawer open engagementId="e-1" viewer="user" onClose={() => {}} />);
  await screen.findByText('Does a call this week work for you?');
  fireEvent.change(screen.getByLabelText('thread.replyToProvider'), { target: { value: BODY } });
  fireEvent.click(screen.getByRole('button', { name: 'shared.send' }));
}

describe('ThreadDrawer · Senden', () => {
  beforeEach(() => {
    fetchEngagementDetail.mockReset().mockResolvedValue(detail());
    postThreadMessage.mockReset();
  });

  it('zeigt eine gescheiterte Nachricht als „Not sent“ mit Grund und Referenz (T2)', async () => {
    postThreadMessage.mockRejectedValue(new ApiError('x', 500, 'corr-9', '2026-10-15T09:42:17.000Z', { errorCode: 'INTERNAL' }));
    await openAndSend();
    expect(await screen.findByRole('alert')).toHaveTextContent('thread.sendFailed.heading');
    expect(screen.getByText(/thread\.notSent/)).toBeInTheDocument();
    expect(screen.getByText(BODY)).toBeInTheDocument();
    expect(screen.getByText('common:states.technicalDetails')).toBeInTheDocument();
    // Der Text steht in der Blase, nicht doppelt im Feld
    expect(screen.getByLabelText('thread.replyToProvider')).toHaveValue('');
  });

  it('„Try Again“ sendet denselben Text erneut; danach ist der Hinweis weg', async () => {
    postThreadMessage.mockRejectedValueOnce(new Error('offline'));
    await openAndSend();
    await screen.findByRole('alert');
    postThreadMessage.mockResolvedValue(undefined);
    fetchEngagementDetail.mockResolvedValue(detail([{ id: 'm2', author: 'user', body: BODY, created_at: new Date().toISOString() }]));
    fireEvent.click(screen.getByRole('button', { name: 'common:states.actions.tryAgain' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(postThreadMessage).toHaveBeenLastCalledWith('e-1', 'user', BODY, undefined);
    expect(screen.queryByText(/thread\.notSent/)).not.toBeInTheDocument();
  });

  it('„Edit“ legt den Text zurueck ins Feld', async () => {
    postThreadMessage.mockRejectedValue(new Error('offline'));
    await openAndSend();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'thread.edit' }));
    expect(screen.getByLabelText('thread.replyToProvider')).toHaveValue(BODY);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('kam die Nachricht trotz Fehler an, gilt sie als gesendet — kein Duplikat', async () => {
    postThreadMessage.mockRejectedValue(new Error('timeout'));
    // Nach dem Fehler steht die Nachricht beim Neuladen im Verlauf
    fetchEngagementDetail
      .mockResolvedValueOnce(detail())
      .mockResolvedValue(detail([{ id: 'm2', author: 'user', body: BODY, created_at: new Date().toISOString() }]));
    await openAndSend();
    await waitFor(() => expect(fetchEngagementDetail).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/thread\.notSent/)).not.toBeInTheDocument();
    expect(screen.getByText(BODY)).toBeInTheDocument();
  });
});
