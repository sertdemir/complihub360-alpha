# Redaction Service

Provides deterministic, rule-based redaction of PII and sensitive data.
This service **DOES NOT** use LLMs to identify PII, guaranteeing predictable and fast execution without risking data leakage to third parties.

## How it works

Uses an ordered array of regular expressions (Rule Categories) to detect patterns like Emails, Phone Numbers, Credit Cards, IBANs, and API Keys.
A risk score is calculated based on the types and counts of items found.

Rules run sequentially in array order, each over the already-partially-redacted text. **Ordering is load-bearing**: structured identifiers containing long digit runs (IBAN, credit card, API key) must run *before* the generic phone rules, otherwise the phone matcher consumes digits embedded inside them — `NL91ABNA0417164300` was being shredded into `[REDACTED:PHONE]` fragments instead of being recognised as an IBAN.

Phone numbers are covered by two rules: an international one (country prefix, freely grouped digits) that runs first, and a local 3-3-4 rule. Both are pinned to token boundaries by lookarounds, and the international rule additionally requires at least seven digits after the country code so that `+12 34` in ordinary prose is not read as a number.

## Name detection (strict profile)

Name detection is a regex heuristic, **not** NER. A name is only redacted when it is:

1. **Title-prefixed** — `Mr./Mrs./Ms./Dr./Prof./Herr/Frau` followed by two capitalised words, or
2. **Context-anchored** — preceded by a contact keyword (`Contact`, `Dear`, `Attn`, `Name:`, `Kontakt`, `Ansprechpartner(in)`), e.g. `Contact Marlies Hertog` → `Contact [REDACTED:NAME]`. Dutch and German name particles (`van`, `von`, `de`, `der`, …) are handled.

Free-standing names without title or anchor (`Marlies Hertog approved this`) are **not** detected. Closing that gap requires a real NER pass (spaCy or a dedicated offline package). The test suite documents this limitation explicitly rather than leaving it implied.

## Limitations

- Addresses and Names use very simplistic heuristics here. A real-world deterministic engine would use NER (Named Entity Recognition) via spacy or a dedicated offline package.
- Regex can produce false positives (e.g., a long product code flagged as an IBAN).
