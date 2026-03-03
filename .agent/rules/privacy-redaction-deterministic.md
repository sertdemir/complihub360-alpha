# Rule: Redaction Must Be Deterministic

## Constraint

The Redaction Pipeline must use deterministic algorithms (Regex, Pattern Matching, fixed Heuristics) to locate and replace PII.
No LLMs or external probabilistic models may be used for the detection of sensitive markers to avoid data leakage prior to sanitization.

## Enforcement

- Agents updating `/services/redaction` must rely on `RegExp` or offline rules.
- Policy-Guard will automatically reject PRs introducing OpenAI, Anthropic, or similar dependencies to the `redaction` package.
