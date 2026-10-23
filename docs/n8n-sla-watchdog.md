# SLA Watchdog

**Status (2026-07-16):** Implemented as an **in-process scheduler** inside the
`compliance-api`, not as an n8n webhook flow. Autonomous SLA enforcement now runs
wherever the API runs.

> **Why not n8n / webhooks?** Staging sits behind Basic Auth, so *inbound*
> webhooks (Stripe, n8n triggers) never reach us. The API process is already
> long-lived, holds the Supabase `service_role`, and writes `event_log` — so the
> watchdog lives there. The JSON blueprints under `automations/n8n/` are legacy;
> `automations/n8n/provider-sla-watchdog.json` in particular is a stub (it pings
> an AI endpoint) and does **not** drive SLAs. The privacy-pipeline blueprints
> (`upload-gate`, `ai-processing-gate`, `redaction-service`, `retention-job`) are
> a separate concern and remain as design references.

## Where it lives

| Piece | Location |
|-------|----------|
| Scheduler + passes | `services/compliance-api/src/watchers.ts` |
| Startup | `startSlaWatchers()` called after `server.listen` in `src/index.ts` |
| Shared reminder core | `issueReminder()` in `watchers.ts` — also used by `POST /api/v1/engagement/:id/remind` |
| Manual trigger | `POST /api/v1/admin/watchers/tick` (server-to-server `x-api-key` only) |

## SLA model (unchanged, lives in the schema)

Deadlines are stamped when an engagement is created (`src/index.ts`): confirm
`+24h`, reply `+48h`, mirroring `providers.sla_target_confirm_hours` (24) and
`sla_target_reply_hours` (48). They are stored on the row as
`engagement_requests.sla_confirm_deadline` / `sla_reply_deadline`.

Status vocabulary (canonical, `packages/types/src/engagement.ts`):
`created → delivered → viewed → confirmed → replied → declined → expired → withdrawn`.
**Open-confirm** = `created | delivered | viewed` (awaiting the provider's confirm).

## The tick

One tick every `WATCHERS_TICK_MS` (default 5 min) loads the recent engagements
once and runs three passes:

1. **Reminder** — open-confirm request whose `sla_confirm_deadline` is within
   `SLA_REMINDER_LEAD_HOURS` (default 4h) and not yet past. Calls `issueReminder`:
   fresh single-use magic-link tokens (24h), event `sla_reminder_sent {auto:true, stage:'confirm'}`,
   a system note on the thread, and `sendMagicLinkMail(reminder:true)` (Resend, or
   the `email_outbox` event when `RESEND_API_KEY` is unset). One reminder per
   engagement (stage `confirm`). A manual reminder (`POST /engagement/:id/remind`)
   writes stage `manual` and does not stand in for the automatic one.
   Until 2026-10-23 the live marker carried no `stage`, so the pass never saw
   its own reminder and sent a new one every tick inside the window (Staging,
   1–2 Sep 2026: 84 mails to two providers).
2. **Breach / escalation** — deadline passed while still open. Confirm stage:
   open-confirm past `sla_confirm_deadline`. Reply stage: `confirmed` past
   `sla_reply_deadline`. Writes `sla_breach {stage, deadline}`, increments
   `providers.breach_count`; at `SLA_BREACH_DOWNGRADE_THRESHOLD` (default 3) sets
   `partner_status = 'downgraded'` and writes `provider_downgraded`. This is the
   "eingreifen" signal the operator cockpit surfaces.
3. **Expiry** — open-confirm past `sla_confirm_deadline` transitions to
   `status = 'expired'`, all open `magic_link_tokens` for the engagement are
   burned, event `engagement_expired`.

## Idempotency

`event_log` is the ledger. Each action writes a marker event; each pass skips any
engagement that already has its marker, keyed by `engagementId:stage`. Markers are
**mode-scoped**: live checks the real type, shadow checks `<type>_shadow`. This is
why flipping out of shadow later still fires each real action exactly once.

The three SLA passes run as `runSlaTick` in their own block of the tick, like
every other pass: a failed load of `engagement_requests` or of the markers counts
an error and skips only these passes (no marker, no send). Before 2026-10-23 the
load sat inline and a failure ended the whole tick early, so reviews, evidence,
billing and appointment reminders silently did not run.

Within one process, ticks never overlap: a tick that starts while the previous
one (scheduler or `POST /admin/watchers/tick`) is still running returns
`skipped: true` and does nothing, because both would load the same markers before
either writes. A rejected tick is logged (`ERR_WATCHER_TICK`), never left as an
unhandled rejection that would end the Node process.

Single-container assumption for Beta. Multi-replica safety (a Postgres advisory
lock around the tick) is a follow-up.

## Shadow mode (default on)

With `WATCHERS_SHADOW=true` the tick computes everything and writes `*_shadow`
marker events (`sla_reminder_sent_shadow`, `sla_breach_shadow`,
`engagement_expired_shadow`) but performs **no side effects** — no mail, no status
or provider mutation. Deploy in shadow, watch one round in the `admin/stats` feed,
then set `WATCHERS_SHADOW=false` to go live.

## Configuration

| Env | Default | Meaning |
|-----|---------|---------|
| `WATCHERS_ENABLED` | `true` | Master switch for the scheduler |
| `WATCHERS_SHADOW` | `true` | Dry-run: log intended actions, no side effects |
| `WATCHERS_TICK_MS` | `300000` | Tick interval (ms) |
| `SLA_REMINDER_LEAD_HOURS` | `4` | Reminder fires this long before the confirm deadline |
| `SLA_BREACH_DOWNGRADE_THRESHOLD` | `3` | `breach_count` at which a provider is downgraded |

## Events emitted (cockpit "SLA & Trust" lens reads these)

`sla_reminder_sent` · `sla_breach` · `provider_downgraded` · `engagement_expired`
— plus their `*_shadow` variants while in shadow mode. The manual tick endpoint
returns a `TickSummary` (`scanned`, `reminders`, `breaches`, `downgrades`,
`expiries`, `errors`).

## Verification

- Build gate: `npx tsc -b` in `services/compliance-api` (full reference graph).
- Behavioural: `node services/compliance-api/test/watchers.smoke.mjs` — stubs the
  Supabase REST surface, drives one shadow tick over four fixtures, and asserts the
  three passes plus idempotency on a second tick. Framework-free (the package has
  no test runner; tsx/esbuild is unavailable in some sandboxes).
- On Staging: `POST /api/v1/admin/watchers/tick` with `x-api-key` forces a tick
  immediately instead of waiting for the interval.

## Out of scope here (tracked separately)

- **Monthly billing run** (`POST /api/v1/admin/billing/run`) — cron-shaped; belongs
  on a VPS crontab (see `docs/stripe-setup.md`), not in the tick loop.
- **Invoice status webhook** (`invoice.paid` / `invoice.finalized`) — replaces
  sync-on-read once the API is reachable outside Basic Auth.
- **Multi-replica advisory lock** for the tick.
