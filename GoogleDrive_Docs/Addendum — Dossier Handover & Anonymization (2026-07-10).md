# Addendum — Dossier Handover & Anonymization (2026-07-10)

**Status:** DECIDED (product owner, 2026-07-10)
**Amends:** Provider Flows (Complete) §3–§4 · User Flows (Complete) §6
**Resolves:** the contradiction between the flow specs (full request content
delivered to the provider immediately) and the earlier design iteration
(anonymized dossier with unlock — Partner Dashboard v0, Advisory page).

## 1. Decision

The provider receives the engagement as a **two-stage dossier**:

| Stage | When | Provider sees |
|---|---|---|
| **Anonymized dossier** | Immediately — in the magic-link e-mail and on the magic-link landing page | Full *situational* context: markets/countries, category/domain, structured wizard answers (revenue band, business model, risk flags, timeline), and the requester's message **run through the redaction pipeline** (names, e-mails, phone numbers, company identifiers masked) |
| **Unlocked dossier** | The moment the provider **confirms** (Action A) | Everything above unredacted, plus requester identity (company name, contact channel) and the engagement thread |

Decline or expiry → identity is never disclosed.

## 2. Rationale

- **Privacy DNA:** data minimization in action — identity is disclosed only on
  mutual commitment. This is the platform's own privacy promise applied to its
  core transaction, and it is demonstrable to enterprise customers.
- **Decision-fit:** providers accept/decline on *situation*, not on *who* —
  the anonymized context (markets, category, revenue band, risk profile) is
  exactly the information a professional needs for a capacity/scope decision.
- **Incentive alignment:** confirming (the SLA-relevant action) is rewarded
  with the unlock — it strengthens the 24h-confirm behavior the ranking
  system measures.
- **Reuses existing infrastructure:** the redaction pipeline
  (`@complihub360/redaction`, strict profile) already exists and is
  runtime-verified; the anonymized message stage is a read-time application
  of it, not new machinery.

## 3. Dossier data model

```
dossier (always visible on magic-link landing + summarized in e-mail):
  country, category
  structured_answers        — wizard-derived: markets, revenue band,
                              business model, risk flags, timeline, domain
  message_redacted          — requester message through redactText(strict)

unlocked (visible after provider_confirmed):
  message                   — original requester message
  requester_identity        — company name · contact e-mail (from account,
                              once real auth ships; until then the account
                              e-mail field of the engagement)
```

Implementation note: the split is enforced **server-side at read time**
(magic-link verify + confirm responses), never in the client. The raw
message is stored once; the redacted variant is computed, not persisted.

## 4. Spec deltas applied

- **Provider Flows §3.1** — system assembles the dossier at request creation.
- **Provider Flows §4.1** — e-mail contains the anonymized dossier summary
  (no requester identity in e-mail, ever — e-mail is an untrusted channel).
- **Provider Flows §4.2** — landing shows the anonymized dossier; identity
  marked as locked. Action A (confirm) unlocks in the same response.
- **User Flows §6.2** — modal consent copy: "Your situational context is
  shared anonymized; your identity is revealed only after the provider
  confirms."

## 5. Events

- `dossier_unlocked` — logged at confirm, payload: engagementId (identity
  disclosure is an auditable moment).
