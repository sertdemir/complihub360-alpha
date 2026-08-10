# i18n — translating new keys with DeepL

`en` is the source of truth. `de`, `es` and `tr` are kept in key-parity with it by
`scripts/i18n-translate.mjs`, which sends **only the missing keys** to the DeepL API.
Existing target values are never overwritten, so hand-polished copy survives a re-run.

## Everyday use

```bash
npm run i18n:check
```

Fails when a target locale is missing a key or has an empty value. Runs in CI on every
PR, reads files only, needs no API key.

```bash
npm run i18n:translate
```

Fills every gap and reformats the touched files with Prettier. Needs `DEEPL_API_KEY`
in the environment.

Narrower runs and previews:

```bash
node scripts/i18n-translate.mjs --dry-run
node scripts/i18n-translate.mjs --lang tr --ns providerws
node scripts/i18n-translate.mjs home:hero.title      # force a re-translation
```

## What the script does to the strings

| Input                               | Sent to DeepL               | Why                                                                                                                                                            |
| ----------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{count}}`                         | `{ph0}`                     | Brace tokens come back inside grammatical sentences. XML placeholder tags get wrapped in German quotation marks (`„{ph0}“-Anbieter`) and scrambled in Turkish. |
| `<b>`, `<gold>`, `<terms>`, `<br/>` | unchanged, as real XML      | `tag_handling=xml` lets DeepL move the markup with the phrase it wraps instead of leaving it stranded.                                                         |
| stray `<`, `>`, `&` (e.g. `< €10k`) | XML-escaped, restored after | Otherwise the request fails with a tag-parse error.                                                                                                            |

Per-language settings: `de` translates with `formality: more`, `es` with `prefer_more`
(both surfaces are written in the formal register — Sie / usted). DeepL has no formality
support for `tr`, so none is sent.

All requests use the glossary **`complihub360-ui`** (`e2ccfb21-d0a9-4ad2-a9c7-46a7b990a54c`),
which pins the product vocabulary — `Risk Map` stays English everywhere, `AI Engine` becomes
`KI-Engine` / `Motor de IA` / `YZ Motoru`, `provider` becomes `Anbieter` / `proveedor` /
`sağlayıcı`, `compliance` stays `Compliance` in German but becomes `uyum` in Turkish.
Override with `DEEPL_GLOSSARY_ID` if you rebuild it.

## Machine output is a draft

The script validates every result against its source and **fails the run** if a
placeholder or a markup tag was dropped, duplicated, or moved out of a link label:

```
⚠ 1 key(s) came back structurally changed — fix these by hand:
  de/common:hero.subline
    placeholder {{total}}: 1× source, 0× result
```

Structural checks cannot catch bad wording. Two failure modes seen in testing that
pass validation and still need a human read:

- **Plural drift.** `_one` and `_other` are translated as independent strings, so the
  two variants can end up phrased differently.
- **Turkish word order.** Sentences with several placeholders sometimes come back with
  the roles swapped.

Treat a translate run as a first draft to review, not a finished deliverable.

## Intentionally empty keys

`scripts/i18n-intentional-empty.json` lists target keys that are correctly empty because
that language reorders the sentence — Turkish fronts the goal phrase in
`common:hero.scenarios.shortcut`, so the trailing `seg3` carries no words. Entries there
are skipped instead of being reported as gaps forever. Add a reason string when you add a key.

## Interactive translation

The DeepL MCP server is registered at user scope, so `translate-text`, `rephrase-text`
and `translate-document` are available in a Claude Code session for one-off work —
reviewing a phrasing, rewriting a headline, translating a legal PDF. It reads the same
`DEEPL_API_KEY`, which must be exported **before** Claude Code starts.

## Setup

```bash
echo 'export DEEPL_API_KEY="…"' >> ~/.zshrc && source ~/.zshrc
```

Free tier covers 1,000,000 characters/month. The English catalogue is 103,222 characters,
so even a from-scratch rebuild of all three locales costs ~310k — well inside one month's
budget. Incremental runs cost almost nothing.
