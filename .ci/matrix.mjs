#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';

const MARKER = '<!-- desk-trial-matrix -->';

const STAGES = [
  { id: 'backend', title: 'бэк' },
  { id: 'frontend', title: 'фронт' },
  { id: 'database', title: 'база' },
  { id: 'redis', title: 'redis' },
];

const PACKS = [
  { id: 'smoke', title: 'дым' },
  { id: 'checks', title: 'проверки' },
  { id: 'hidden', title: 'скрытые' },
  { id: 'speed', title: 'скорость' },
];

const LABELS = {
  'backend:smoke:01': 'create',
  'backend:smoke:02': 'POST /tickets',
  'backend:smoke:03': 'mix 2×2',
  'backend:checks:01': 'create: поля',
  'backend:checks:02': 'create: валидация',
  'backend:checks:03': 'create: comment',
  'backend:checks:04': 'assign: одна в работе',
  'backend:checks:05': 'complete: только свой',
  'backend:checks:06': 'cancel',
  'backend:checks:07': 'list: порядок',
  'backend:checks:08': 'POST create',
  'backend:checks:09': 'http: 404 / 400',
  'backend:checks:0a': 'GET list фильтр',
  'backend:checks:0b': 'assign + complete http',
  'backend:hidden:a': 'complete/cancel статусы',
  'backend:hidden:b': 'assign без staffId',
  'backend:hidden:c': 'GET list порядок',
  'backend:speed:m0': 'mix пустые',
  'backend:speed:m1': 'mix размеры',
  'backend:speed:m2': 'mix 12×12',
  'backend:speed:m3': 'mix 220×220',
  'backend:speed:m4': 'list 18k',
  'frontend:smoke:01': 'подписи',
  'frontend:smoke:02': 'карточка',
  'frontend:checks:0e': 'подписи',
  'frontend:checks:0f': 'карточка: взять',
  'frontend:checks:10': 'кнопка «берём»',
  'frontend:checks:11': 'загрузка',
  'frontend:checks:12': 'ошибка сети',
  'frontend:checks:13': 'пустой список',
  'frontend:checks:14': 'фильтр без второго запроса',
  'frontend:checks:15': 'взять из очереди',
  'frontend:checks:16': 'ошибка взять',
  'frontend:hidden:a': 'ошибка не Error',
  'frontend:hidden:b': 'фильтр «в работе»',
  'database:smoke:01': 'assign',
  'database:smoke:02': 'DATABASE_URL',
  'database:checks:1a': 'listInbox',
  'database:checks:1b': 'assign + event',
  'database:checks:1c': 'конфликты assign',
  'database:checks:1d': 'complete',
  'database:checks:1e': 'sql в comment',
  'database:checks:1f': 'гонка assign',
  'database:checks:20': 'DATABASE_URL',
  'database:hidden:a': 'гонка: две заявки одному',
  'database:hidden:b': 'повторный assign без event',
  'redis:smoke:01': 'лимит',
  'redis:smoke:02': 'кэш',
  'redis:checks:22': 'лимит: окно',
  'redis:checks:23': 'лимит: не скользящее',
  'redis:checks:24': 'кэш + invalidate',
  'redis:checks:25': 'кэш TTL',
  'redis:checks:26': 'идемпотентность replay',
  'redis:checks:27': 'fail → повтор',
  'redis:hidden:a': 'ключ rl:',
  'redis:hidden:b': 'кэш двух списков',
  'redis:hidden:c': 'ключ idem:',
  'redis:speed:r0': 'лимит 12k',
};

function load(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function flatten(report) {
  const out = [];
  const files = report?.testResults ?? report?.files ?? [];
  for (const file of files) {
    const name = String(file.name ?? file.filename ?? file.filepath ?? '');
    const assertions = file.assertionResults ?? [];
    if (assertions.length) {
      for (const a of assertions) {
        out.push({
          file: name,
          title: String(a.title ?? a.name ?? ''),
          status: a.status ?? a.mode ?? 'failed',
          message: Array.isArray(a.failureMessages) ? a.failureMessages[0] : a.message,
        });
      }
      continue;
    }
    walkTasks(file.tasks ?? file.tests ?? [], name, out);
    if (!assertions.length && !file.tasks && (file.status || file.result)) {
      out.push({
        file: name,
        title: '',
        status: file.status ?? file.result,
        message: file.message,
      });
    }
  }
  return out;
}

function walkTasks(tasks, file, out) {
  for (const task of tasks) {
    if (Array.isArray(task.tasks) && task.tasks.length) {
      walkTasks(task.tasks, file, out);
      continue;
    }
    out.push({
      file,
      title: String(task.name ?? task.title ?? ''),
      status: task.result?.state ?? task.mode ?? task.status ?? 'failed',
      message: task.result?.errors?.[0]?.message ?? task.message,
    });
  }
}

function stageOf(filename) {
  if (/01-backend|01-perf/.test(filename)) return 'backend';
  if (/02-frontend/.test(filename)) return 'frontend';
  if (/03-database/.test(filename)) return 'database';
  if (/04-redis|04-perf/.test(filename)) return 'redis';
  return null;
}

function packOf(filename) {
  if (/\/tests\/s\.test\.js$|\/smoke\//.test(filename)) return 'smoke';
  if (/perf/.test(filename)) return 'speed';
  if (/hidden/.test(filename)) return 'hidden';
  if (/full-tests/.test(filename)) return 'checks';
  return null;
}

function normStatus(status) {
  const s = String(status || '');
  if (s === 'passed' || s === 'pass') return 'passed';
  if (s === 'skipped' || s === 'pending' || s === 'todo' || s === 'skip') return 'skipped';
  return 'failed';
}

function hint(message) {
  if (!message) return '';
  const line = String(message)
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('at ') && !l.includes('node_modules')) || '';
  return line
    .replace(/^AssertionError:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/\s+/g, ' ')
    .slice(0, 110);
}

function emptyBuckets() {
  return Object.fromEntries(
    STAGES.map((s) => [
      s.id,
      Object.fromEntries(PACKS.map((p) => [p.id, { passed: 0, failed: 0, skipped: 0, fails: [] }])),
    ]),
  );
}

function add(buckets, tests, packOverride) {
  for (const t of tests) {
    const stage = stageOf(t.file);
    const pack = packOverride ?? packOf(t.file);
    if (!stage || !pack) continue;
    const bucket = buckets[stage][pack];
    const status = normStatus(t.status);
    if (status === 'passed') bucket.passed += 1;
    else if (status === 'skipped') bucket.skipped += 1;
    else {
      bucket.failed += 1;
      bucket.fails.push({
        title: LABELS[`${stage}:${pack}:${t.title}`] || t.title || 'тест',
        hint: hint(t.message),
      });
    }
  }
}

function cell(row) {
  const total = row.passed + row.failed;
  if (!total && !row.skipped) return '—';
  if (!total && row.skipped) return `⏭ ${row.skipped}`;
  const score = `${row.passed}/${total}`;
  if (row.failed) return `❌ ${score}`;
  return `✅ ${score}`;
}

function packTotals(buckets, pack) {
  let passed = 0;
  let failed = 0;
  for (const stage of STAGES) {
    passed += buckets[stage.id][pack].passed;
    failed += buckets[stage.id][pack].failed;
  }
  return { passed, failed, total: passed + failed };
}

function allFails(buckets) {
  const rows = [];
  for (const stage of STAGES) {
    for (const pack of PACKS) {
      for (const fail of buckets[stage.id][pack.id].fails) {
        rows.push({
          stage: stage.title,
          pack: pack.title,
          title: fail.title,
          hint: fail.hint,
        });
      }
    }
  }
  return rows;
}

const smokeReport = load(process.env.SMOKE_JSON ?? '/tmp/desk-smoke.json');
const restReport = load(process.env.REST_JSON ?? '/tmp/desk-rest.json');
const buckets = emptyBuckets();
if (smokeReport) add(buckets, flatten(smokeReport), 'smoke');
if (restReport) add(buckets, flatten(restReport));

const fails = allFails(buckets);
const restSeen = Boolean(restReport);
const anyFail = fails.length > 0;
const restPacks = PACKS.filter((p) => p.id !== 'smoke');
const restNumbers = restPacks.map((p) => packTotals(buckets, p.id));
const restPassed = restNumbers.reduce((n, x) => n + x.passed, 0);
const restTotal = restNumbers.reduce((n, x) => n + x.total, 0);
const smokeTot = packTotals(buckets, 'smoke');

const lines = [
  MARKER,
  anyFail ? '## не готово' : '## готово',
  '',
  '| этап | дым | проверки | скрытые | скорость |',
  '|:---|---:|---:|---:|---:|',
  ...STAGES.map((s) => {
    const row = buckets[s.id];
    return `| ${s.title} | ${cell(row.smoke)} | ${cell(row.checks)} | ${cell(row.hidden)} | ${cell(row.speed)} |`;
  }),
  '',
  restSeen
    ? `дым **${smokeTot.passed}/${smokeTot.total || '—'}** · остальное **${restPassed}/${restTotal || '—'}**`
    : `дым **${smokeTot.passed}/${smokeTot.total || '—'}** · остальное не прогналось`,
];

if (fails.length) {
  lines.push('', '### где сыпется', '');
  for (const fail of fails.slice(0, 20)) {
    lines.push(`- **${fail.stage} · ${fail.pack}** — ${fail.title}`);
    if (fail.hint) lines.push(`  \`${fail.hint.replace(/`/g, "'")}\``);
  }
  if (fails.length > 20) lines.push(`- … и ещё ${fails.length - 20}`);
}

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
