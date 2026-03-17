# Redaction Service

Provides deterministic, rule-based redaction of PII and sensitive data.
This service **DOES NOT** use LLMs to identify PII, guaranteeing predictable and fast execution without risking data leakage to third parties.

## How it works

Uses an ordered array of regular expressions (Rule Categories) to detect patterns like Emails, Phone Numbers, Credit Cards, IBANs, and API Keys.
A risk score is calculated based on the types and counts of items found.

## Limitations

- Addresses and Names use very simplistic heuristics here. A real-world deterministic engine would use NER (Named Entity Recognition) via spacy or a dedicated offline package.
- Regex can produce false positives (e.g., a long product code flagged as an IBAN).
