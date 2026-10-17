# CompliHub360 · Payment Mandate for Providers — Draft, version 2026-10

**As of: 15 October 2026 · Status: draft for legal review · live in the acceptance dialog as version `2026-10` since 15 October 2026 (interim, operator's decision) · replaces the text-less version `2026-09`; the product shows “CompliHub360” where this draft says `[Operator]` until sign-off**

> **Not legal advice.** This draft comes from product engineering. It states
> what the platform actually does today, in words a provider is meant to read
> before clicking "accept". Whether these words are sufficient as a payment
> mandate is for legal review to decide. Only after that will the text be
> stored as a new version, and every provider will be asked to accept it again
> (Spec A §23: re-acceptance when material terms change).

## Brief for the reviewer

CompliHub360 is a compliance marketplace. Companies describe a compliance need,
the platform matches them with verified providers (tax advisors, customs
specialists, legal firms and similar), and a company can book an intro call
with a provider. Providers pay the platform in two ways only: a subscription
for their plan, and a lead fee per booking. Both are charged through Stripe
against a payment method the provider has stored in Stripe's billing portal.

Both charges are **merchant-initiated**: they happen without the provider
being present (Stripe `off_session`). The lead fee is charged at the moment a
company books. The subscription invoice is issued with 14 days to pay; if it
is still open after the due date, the platform would retry the stored payment
method on days 1, 3 and 6 after the due date. **That retry is built but
switched off** (`INVOICE_RETRY_ENABLED` not set) until legal review confirms
the mandate below covers it.

The problem: the current mandate version `2026-09` has no text. In the
acceptance dialog the provider reads one sentence — *"It allows us to charge
subscription and lead fees to the payment method on file."* — and confirms
with name and role. Part B below is the proposed full text.

---

## Part A · What we need legal review to answer

1. **Scope.** Does the text in Part B cover both kinds of charge: the lead fee
   at the moment of booking, and collecting an open subscription invoice up to
   three times after its due date?
2. **Off-session charges and strong customer authentication.** Both charges
   run without the cardholder present (Stripe `off_session`, merchant-initiated
   transaction). Does acceptance in the provider dossier plus storing the
   card in the Stripe portal constitute the agreement required for the
   PSD2/SCA exemption for merchant-initiated transactions? Is the current
   card setup sufficient, or do we need a dedicated `SetupIntent` with
   `usage: off_session` as its own step?
3. **Standard-terms control.** The text is presented identically to every
   provider, so it is a standard term. Does it survive content review
   (transparency, no surprising clause, amount and timing foreseeable)?
   Sections 3 (When) and 4 (How much) matter most.
4. **Governing law and contracting party.** The operating entity is not yet
   final (see `structure-addendum-2026-08.md`: US C-Corp plus German DevCo).
   The placeholder `[Operator]` must be filled before the text is stored.
   Jurisdiction and governing law belong in the provider agreement, not in
   this mandate.
5. **Revocation.** Section 7 says revocation takes effect immediately for new
   bookings and leaves open invoices in place. Is that tenable, and does
   revocation need to be in writing?
6. **Credits.** Section 4 mentions platform credit that is offset against the
   next subscription invoice and is never paid out (ADR-0007). Is the wording
   sufficient, or does this belong in the commercial terms rather than the
   mandate?
7. **Languages.** The first version is German; English, Spanish and Turkish
   follow after approval as translations of the same version. The acceptance
   record stores the language the provider read.

---

## Part B · The mandate text (provider-facing copy, for review)

### Payment Mandate · Version 2026-10

**1. What this is about**

With this declaration you allow `[Operator]` ("CompliHub360") to collect the
amounts listed in section 2 from the payment method you have stored with our
payment service provider, Stripe. Your card details are held exclusively by
Stripe; CompliHub360 neither sees nor stores them.

**2. Which amounts**

Only these two, nothing else:

- **Your subscription invoice** for the plan you chose, at the billing
  interval you selected when you subscribed.
- **The lead fee** for a booking a company makes with you. It is charged per
  booking, and the amount is shown in your account under *Billing* before
  every booking.

**3. When we charge**

- **Subscription invoice:** You receive the invoice with 14 days to pay and
  can pay it yourself. If it is still open on the due date, we tell you by
  email and in your account. After that we attempt to collect from your
  stored payment method on the 1st, 3rd and 6th day after the due date, at
  most once per day. If you pay in the meantime, no further attempt is made.
- **Lead fee:** at the moment of booking, before the company is shown your
  contact details.

**4. How much**

- The subscription invoice equals the plan price you confirmed when you
  subscribed or last changed plans. A plan change or cancellation takes
  effect at the end of the current period.
- The lead fee depends on the size of the enquiry and on your plan. You see
  the amount and how it is calculated under *Billing* before every booking;
  your plan's discounts are already deducted.
- Platform credit issued to you (for example after a missed appointment) is
  offset against your next subscription invoice. It is not paid out.

**5. If a charge does not succeed**

- **Lead fee:** The booking does not go ahead. No fee arises, and the company
  is not shown any of your details. You remain visible and can check the
  payment method or store another one. Until then you do not accept new
  bookings.
- **Subscription invoice:** The invoice stays open and the deadline stays as
  it is. You can pay yourself at any time. If the invoice is still open
  7 days after the due date, new bookings pause until it is paid. You remain
  visible even then.
- CompliHub360 charges no fee of its own for a failed attempt. Whether your
  card issuer charges fees depends on your agreement with them.

**6. If we reverse something**

If a booking does not go ahead after a charge has already succeeded (for
example because the same slot was taken at the same moment), we refund the
lead fee to the same payment method on our own initiative. You do not need
to do anything; the transaction appears in your billing history.

**7. Revocation**

You can revoke this mandate at any time in your account under *Settings*.
From then on we charge nothing further and you accept no new bookings until
you accept a current version again. Invoices that arose before the
revocation remain due and are paid by you.

**8. What we record**

For every acceptance we store the version and language of this text, the
name and role of the person accepting, the time, and a technical reference.
A new version does not replace an old one retroactively: for every booking it
remains verifiable which version applied at that time.

**9. Changes**

If we change this text in a point that affects you, we present the new
version to you for acceptance. Until you accept it, we charge nothing new
beyond what the old version allows.

---

## Part C · Every sentence has a place in the code

| Section | Statement | Where this holds today |
|---|---|---|
| 1 | card details only at Stripe | billing portal and `SetupIntent` run at Stripe; `stripe.ts` holds only `customer_id` and `payment_method_id` |
| 2 | only subscription invoice and lead fee | `billing.ts` (invoices), `leadCharge.ts` (PaymentIntent per booking); no other charging code path in the service |
| 3 | 14 days to pay | `days_until_due: 14`, ADR-0006 |
| 3 | notice on due date, attempts on days 1/3/6 | `invoiceRetry.ts`: `invoice_retry_notice`, `retryStage`, idempotency per invoice and day; ADR-0008 B2a |
| 3 | lead fee before disclosure | ADR-0005: the charge decides disclosure; `lead.revealed` only after `captured` |
| 4 | amount visible before booking, discounts deducted | `quoteLeadFee`, preview under `/billing`; ADR-0003 |
| 4 | plan change and cancellation at period end | ADR-0006 B2 and C2 |
| 4 | credit offset against next invoice, never paid out | ADR-0007, `provider_credits` |
| 5 | lead: no booking, no disclosure, stay visible | ADR-0005 decision 3, `payment_failed` copy ("You stay visible") |
| 5 | subscription: deadline unchanged, pause 7 days after due date | ADR-0006 A2, `due_at` is never written |
| 5 | no fee of our own for a failed attempt | no such line item in the code; **to be confirmed by legal review** |
| 6 | automatic refund on double booking | ADR-0005 item 9, `refundPaymentIntent`, event `lead_charge_reversed` |
| 7 | revocation in settings, consequence: no bookings | `withdrawn_authorization`, `billingReadiness` requires a non-superseded acceptance |
| 8 | version, language, name, role, time, reference | `provider_agreement_acceptance`: `version`, `language`, `accepted_by_name`, `accepted_by_title`, `accepted_at`, `audit_ref`; old version kept (`superseded_at`) |
| 9 | re-acceptance on change | Spec A §23, acceptance dialog always shows the current version |

A sentence with no row here does not belong in the text.

## Part D · What happens after approval

1. The text becomes version `2026-10` in the acceptance dialog
   (`application.agreements.*`, chapter 5 of the dossier) in four languages;
   the current one-liner `billingNote` becomes the summary above the full text.
2. Every provider on version `2026-09` is asked to re-accept; until then
   `INVOICE_RETRY_ENABLED` stays off (effectively ADR-0008 option B1).
3. Ticket `TKT-PROV-13` moves to `done`.

*German original: `zahlungsmandat-2026-10-entwurf.md`. In case of doubt the German text is authoritative until legal review has signed off a language version.*
