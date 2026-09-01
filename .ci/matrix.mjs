#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';

const MARKER = '<!-- desk-trial-matrix -->';

const STAGES = [
  { id: 'backend', title: 'бэк', match: /01-backend|01-perf|\/01-backend\// },
  { id: 'frontend', title: 'фронт', match: /02-frontend/ },
  { id: 'database', title: 'база', match: /03-database/ },
  { id: 'redis', title: 'redis', match: /04-redis|04-perf/ },
];

function load(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function files(report) {
  const rows = report?.testResults ?? report?.files ?? [];
  return rows.map((row) => {
    const name = String(row.name ?? row.filename ?? '');
    const assertions = row.assertionResults ?? row.tasks ?? [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    if (assertions.length) {
      for (const a of assertions) {
        const s = a.status ?? a.mode;
        if (s === 'passed' || s === 'pass') passed += 1;
        else if (s === 'skipped' || s === 'pending' || s === 'todo') skipped += 1;
        else failed += 1;
      }
    } else if (row.status === 'passed' || row.result === 'pass') {
      passed = 1;
    } else if (row.status === 'failed' || row.result === 'fail') {
      failed = 1;
    }
    return { name, passed, failed, skipped };
  });
}

function stageOf(filename) {
  return STAGES.find((s) => s.match.test(filename))?.id ?? null;
}

function summarize(report) {
  const acc = Object.fromEntries(
    STAGES.map((s) => [s.id, { passed: 0, failed: 0, skipped: 0, seen: false }]),
  );
  if (!report) return acc;
  for (const f of files(report)) {
    const id = stageOf(f.name);
    if (!id) continue;
    acc[id].seen = true;
    acc[id].passed += f.passed;
    acc[id].failed += f.failed;
    acc[id].skipped += f.skipped;
  }
  return acc;
}

function cell(row) {
  if (!row.seen) return '—';
  if (row.failed > 0) return row.failed > 1 ? `❌ ${row.failed}` : '❌';
  if (row.passed === 0 && row.skipped > 0) return '—';
  if (row.passed > 0) return '✅';
  return '—';
}

function totals(acc) {
  let passed = 0;
  let failed = 0;
  for (const row of Object.values(acc)) {
    passed += row.passed;
    failed += row.failed;
  }
  return { passed, failed, total: passed + failed };
}

const smoke = summarize(load(process.env.SMOKE_JSON ?? '/tmp/desk-smoke.json'));
const rest = summarize(load(process.env.REST_JSON ?? '/tmp/desk-rest.json'));
const smokeTot = totals(smoke);
const restTot = totals(rest);

const lines = [
  MARKER,
  '## 4 этапа',
  '',
  '| этап | дым | вторая пачка |',
  '|:---|:---:|:---:|',
  ...STAGES.map((s) => `| ${s.title} | ${cell(smoke[s.id])} | ${cell(rest[s.id])} |`),
  '',
  `дым **${smokeTot.passed}/${smokeTot.total || '—'}** · вторая пачка **${restTot.passed}/${restTot.total || '—'}**`,
];

const md = `${lines.join('\n')}\n`;

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

const repo = process.env.GITHUB_REPOSITORY;
const pr = process.env.PR_NUMBER;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (repo && pr && token) {
  const list = JSON.parse(
    execSync(`gh api repos/${repo}/issues/${pr}/comments --paginate`, {
      encoding: 'utf8',
      env: { ...process.env, GH_TOKEN: token, GH_PROMPT_DISABLED: '1' },
    }),
  );
  const prev = list.find((c) => typeof c.body === 'string' && c.body.includes(MARKER));
  const bodyFile = '/tmp/desk-matrix.md';
  writeFileSync(bodyFile, md);
  if (prev) {
    execSync(`gh api -X PATCH repos/${repo}/issues/comments/${prev.id} -F body=@${bodyFile}`, {
      stdio: 'inherit',
      env: { ...process.env, GH_TOKEN: token, GH_PROMPT_DISABLED: '1' },
    });
  } else {
    execSync(`gh api -X POST repos/${repo}/issues/${pr}/comments -F body=@${bodyFile}`, {
      stdio: 'inherit',
      env: { ...process.env, GH_TOKEN: token, GH_PROMPT_DISABLED: '1' },
    });
  }
}

process.stdout.write(md);
