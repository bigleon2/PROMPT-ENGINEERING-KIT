// Lance un seul test PEK — usage: node run-one-test.mjs <label> <title> <filePath|bloc:start-end> <complexity>
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, appendFileSync } from 'fs';

const db = new PrismaClient();
const [,, label, title, sourceSpec, complexity] = process.argv;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitFor(sessionId, maxMs = 420000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const s = await db.session.findUnique({
      where: { id: sessionId },
      include: { steps: { orderBy: { stepNumber: 'asc' } }, validations: { orderBy: { createdAt: 'desc' } } },
    });
    const done = s.steps.filter(st => st.status === 'completed' || st.status === 'error' || st.status === 'skipped').length;
    if (done === 7 || s.status === 'completed' || s.status === 'error') return s;
    const running = s.steps.find(st => st.status === 'running');
    const elapsed = Math.round((Date.now() - start) / 1000);
    if (elapsed % 20 < 3 && running) process.stdout.write(`  [${elapsed}s] Step ${running.stepNumber}...\n`);
    await sleep(6000);
  }
  throw new Error('TIMEOUT');
}

let source;
if (sourceSpec.startsWith('bloc:')) {
  // Format: bloc:filePath:startLine-endLine
  const [fileRef, range] = sourceSpec.replace('bloc:', '').split(':');
  const [startLine, endLine] = range.split('-').map(Number);
  const allLines = readFileSync(fileRef, 'utf8').split('\n');
  source = allLines.slice(startLine - 1, endLine).join('\n');
} else {
  source = readFileSync(sourceSpec, 'utf8');
}

(async () => {
  console.log(`${label} — ${source.length}c ${source.split('\n').length}l`);

  const res = await fetch('http://127.0.0.1:3000/api/sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title, context: 'Test robuste PEK v4.0 bloc par bloc.', sourceMaterial: source,
      results: '', constraints: '', inputFormat: 'markdown',
      selectedBlocks: 'auto', complexity: complexity || 'complexe', language: 'fr', executionMode: 'cot',
    }),
  });
  const data = await res.json();
  if (!data.success) { console.error('ERR:', data.error); process.exit(1); }
  const sid = data.data.id;
  console.log('Session:', sid);

  fetch(`http://127.0.0.1:3000/api/sessions/${sid}/execute`, { method: 'POST' }).catch(() => {});
  const session = await waitFor(sid);

  const totalTime = session.steps.reduce((s, st) => s + (st.duration || 0), 0);
  const totalOutput = session.steps.reduce((s, st) => s + (st.output?.length || 0), 0);
  const v = session.validations[0];
  let checks = [];
  if (v?.checks) try { checks = JSON.parse(v.checks); } catch {}

  console.log(`Status: ${session.status} | ${totalTime}s | ${totalOutput}c`);
  for (const st of session.steps) {
    console.log(`  ${st.stepNumber}. ${st.name}: ${st.status} ${st.duration}s ${(st.output?.length||0)}c`);
  }
  if (v) console.log(`SCORE: ${v.totalScore}/${v.maxScore} (C:${v.completeness} Co:${v.coherence} Q:${v.quality}) | ${checks.filter(c=>c.passed).length}/${checks.length} checks`);
  for (const c of checks) console.log(`  [${c.passed?'PASS':'FAIL'}] ${c.label}`);

  // Append to results file
  const result = { label, sessionId: sid, status: session.status, totalTime, totalOutput, sourceChars: source.length, validation: v ? { totalScore: v.totalScore, completeness: v.completeness, coherence: v.coherence, quality: v.quality, passed: v.passed } : null, checks };
  try { 
    const existing = JSON.parse(readFileSync('/home/z/my-project/robust-test-results.json', 'utf8'));
    existing.push(result);
    writeFileSync('/home/z/my-project/robust-test-results.json', JSON.stringify(existing, null, 2));
  } catch { writeFileSync('/home/z/my-project/robust-test-results.json', JSON.stringify([result], null, 2)); }

  await db.$disconnect();
})();