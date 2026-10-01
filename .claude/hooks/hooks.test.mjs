// Tests der Guard-Hooks. Ausführen: node --test .claude/hooks/hooks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check as checkGit } from './block-no-verify.mjs';
import { protectionReason } from './config-protection.mjs';
import { check as checkPrivacy, stripComments } from './privacy-raw-to-ai.mjs';
import { isUiSource, summarize } from './ui-typecheck.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function runHook(script, payload, projectDir) {
  const res = spawnSync('node', [path.join(HERE, script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  });
  assert.equal(res.status, 0, res.stderr);
  return res.stdout ? JSON.parse(res.stdout) : null;
}

test('block-no-verify: sperrt das Umgehen von Git-Hooks', () => {
  for (const cmd of [
    'git commit --no-verify -m "x"',
    'git commit -n -m x',
    'git commit -an -m x',
    'git push --no-verify origin main',
    'git push --no-veri',
    'npm test && git commit --no-verify -m wip',
    'git -c core.hooksPath=/dev/null commit -m x',
    'git -ccore.hooksPath=/dev/null push',
    '/usr/bin/git merge --no-verify feature',
    'HUSKY=0 git commit --no-verify -m x',
    'env git push --no-verify',
    'bash -c "git commit --no-verify -m x"',
    'GIT_CONFIG_PARAMETERS="\'core.hooksPath=/dev/null\'" git commit -m x',
  ]) {
    assert.ok(checkGit(cmd), `sollte blocken: ${cmd}`);
  }
});

test('block-no-verify: lässt normale Kommandos durch', () => {
  for (const cmd of [
    'git commit -m "kein --no-verify hier"',
    'git commit -m --no-verify',
    'git commit -mn',
    'git status',
    'git log --no-verify-signatures',
    'echo git commit --no-verify',
    'git -c user.name=x commit -m y',
    'git diff --no-index a b',
  ]) {
    assert.equal(checkGit(cmd), null, `sollte durchlassen: ${cmd}`);
  }
});

test('config-protection: erkennt geschützte Pfade', () => {
  for (const rel of [
    '.eslintrc.cjs', 'apps/vs1-demo/ui/eslint.config.mjs', '.prettierrc', '.eslintignore',
    '.claude/settings.json', '.claude/hooks/lib.mjs', '.agents/rules/dna-decision-filter.md',
    '.knowledge/memory/nodes/KN-BRAND-001-complihub360-dna.md', '.knowledge/vault/x.pdf',
    'scripts/check-terminology.mjs',
  ]) {
    assert.ok(protectionReason(rel), `sollte geschützt sein: ${rel}`);
  }
  for (const rel of ['apps/vs1-demo/ui/vite.config.ts', 'tsconfig.json', 'CLAUDE.md',
    '.claude/agents/silent-failure-hunter.md', 'scripts/deploy-staging.sh', '']) {
    assert.equal(protectionReason(rel), null, `sollte frei sein: ${rel}`);
  }
});

test('config-protection: fragt bei bestehenden, nicht bei neuen Dateien', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-'));
  fs.writeFileSync(path.join(dir, '.eslintrc.cjs'), 'module.exports = {};');
  const existing = runHook('config-protection.mjs',
    { tool_name: 'Edit', tool_input: { file_path: path.join(dir, '.eslintrc.cjs') } }, dir);
  assert.equal(existing.hookSpecificOutput.permissionDecision, 'ask');
  const fresh = runHook('config-protection.mjs',
    { tool_name: 'Write', tool_input: { file_path: path.join(dir, '.prettierrc') } }, dir);
  assert.equal(fresh, null);
});

const AI_FILE = "const r = await fetch(`${GEMINI_BASE}/m:generateContent`);\n";

test('privacy: sperrt, wenn ein Edit Raw-Ref und AI-Endpoint neu zusammenführt', () => {
  const reason = checkPrivacy('services/x/src/a.ts', 'Edit',
    { old_string: 'const r', new_string: "const ref = 'raw://doc1';\nconst r" }, AI_FILE);
  assert.match(reason, /Privacy-Gate/);
  assert.ok(checkPrivacy('services/x/src/new.ts', 'Write',
    { content: `import { rawVault } from '@x/storage';\n${AI_FILE}` }, ''));
});

test('privacy: lässt Kommentare, Tests, getrennte Module und Altbestand durch', () => {
  const commentOnly = "// Ein raw://-Ref erreicht nie die AI.\n" + AI_FILE;
  assert.equal(checkPrivacy('services/x/src/a.ts', 'Write', { content: commentOnly }, ''), null);
  assert.equal(checkPrivacy('services/x/src/a.test.ts', 'Write',
    { content: "expect('raw://x');\n" + AI_FILE }, ''), null);
  assert.equal(checkPrivacy('packages/storage/src/rawVault.ts', 'Write',
    { content: 'return { storageRef: `raw://${id}` };' }, ''), null);
  const both = "const ref = 'raw://doc1';\n" + AI_FILE;
  assert.equal(checkPrivacy('services/x/src/a.ts', 'Edit',
    { old_string: 'doc1', new_string: 'doc2' }, both), null);
  assert.equal(checkPrivacy('docs/privacy.md', 'Write', { content: both }, ''), null);
});

test('privacy: stripComments behält URLs in Strings', () => {
  assert.match(stripComments("const u = 'https://api.anthropic.com'; // raw://"), /api\.anthropic\.com/);
  assert.doesNotMatch(stripComments('/* raw:// */ x // raw://'), /raw:\/\//);
});

test('privacy: Hook-Prozess antwortet mit deny', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-'));
  const out = runHook('privacy-raw-to-ai.mjs', {
    tool_name: 'Write',
    tool_input: { file_path: path.join(dir, 'src/ai.ts'), content: "const ref = 'raw://a';\n" + AI_FILE },
  }, dir);
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
});

test('ui-typecheck: greift nur für UI-Quelltext', () => {
  assert.ok(isUiSource('apps/vs1-demo/ui/src/components/A.tsx'));
  assert.ok(!isUiSource('apps/vs1-demo/ui/vite.config.ts'));
  assert.ok(!isUiSource('services/compliance-api/src/index.ts'));
});

test('ui-typecheck: Fehler der editierten Datei stehen vorn', () => {
  const out = [
    'apps/vs1-demo/ui/src/b.ts(1,1): error TS2322: x',
    'apps/vs1-demo/ui/src/a.tsx(2,2): error TS2307: y',
    'irgendein Rauschen',
  ].join('\n');
  const { count, text } = summarize(out, 'apps/vs1-demo/ui/src/a.tsx');
  assert.equal(count, 2);
  assert.ok(text.startsWith('apps/vs1-demo/ui/src/a.tsx'));
});
