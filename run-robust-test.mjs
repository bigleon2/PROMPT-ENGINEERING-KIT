// Test robuste PEK v4.1 — avec Bloc par Bloc natif dans le backend
// Stratégie anti-timeout : le backend découpe automatiquement les sources > 20KB
// Ce script envoie le source COMPLET et laisse le backend gérer l'injection progressive
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';

const db = new PrismaClient();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForSession(sessionId, maxMs = 600000) {
  const start = Date.now();
  let lastStatus = '';
  while (Date.now() - start < maxMs) {
    const s = await db.session.findUnique({
      where: { id: sessionId },
      include: { steps: { orderBy: { stepNumber: 'asc' } }, validations: { orderBy: { createdAt: 'desc' } } },
    });
    if (!s) throw new Error('Session not found');
    const done = s.steps.filter(st => st.status === 'completed' || st.status === 'error' || st.status === 'skipped').length;
    const hasError = s.steps.some(st => st.status === 'error');
    if (done === 7 || hasError || s.status === 'completed' || s.status === 'error') return s;
    const running = s.steps.find(st => st.status === 'running');
    const elapsed = Math.round((Date.now() - start) / 1000);
    const status = `[${elapsed}s] Step ${running?.stepNumber || '?'} ${running?.name || s.status}...`;
    if (status !== lastStatus) {
      process.stdout.write(status + '\n');
      lastStatus = status;
    }
    await sleep(5000); // Poll every 5s
  }
  throw new Error('Timeout global (>10 min)');
}

async function runPEK(label, title, context, sourceContent, complexity, executionMode) {
  process.stdout.write(`\n${'='.repeat(60)}\n${label}\n${'='.repeat(60)}\n`);
  process.stdout.write(`  Source: ${sourceContent.length.toLocaleString()} chars, ${sourceContent.split('\n').length} lignes\n`);
  if (sourceContent.length > 20000) {
    process.stdout.write(`  ⚠️ Source > 20KB → Bloc par Bloc automatique activé par le backend\n`);
  }

  // Create session
  const res = await fetch('http://127.0.0.1:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      context,
      sourceMaterial: sourceContent,
      results: '',
      constraints: '',
      inputFormat: 'markdown',
      selectedBlocks: 'auto',
      complexity,
      language: 'fr',
      executionMode: executionMode || 'hybride',
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Create: ' + data.error);
  const sessionId = data.data.id;
  process.stdout.write(`  Session: ${sessionId}\n`);

  // Fire execute (fire-and-forget — backend runs sequentially)
  fetch(`http://127.0.0.1:3000/api/sessions/${sessionId}/execute`, { method: 'POST' }).catch(() => {});

  // Wait for completion
  const session = await waitForSession(sessionId);

  // Extract results
  const totalTime = session.steps.reduce((s, st) => s + (st.duration || 0), 0);
  const totalOutput = session.steps.reduce((s, st) => s + (st.output?.length || 0), 0);
  const v = session.validations[0];
  let checks = [];
  if (v?.checks) try { checks = JSON.parse(v.checks); } catch {}

  process.stdout.write(`\n  Status: ${session.status} | Total: ${totalTime}s | Output: ${totalOutput.toLocaleString()} chars\n`);
  process.stdout.write(`  ${'─'.repeat(50)}\n`);
  for (const st of session.steps) {
    const ic = st.status === 'completed' ? '✅' : st.status === 'error' ? '❌' : '⏭️';
    const outLen = st.output?.length || 0;
    process.stdout.write(`  ${ic} ${st.stepNumber}. ${st.name}: ${st.duration}s (${outLen.toLocaleString()}c)\n`);
    if (st.status === 'error') {
      process.stdout.write(`     Erreur: ${(st.output || '').slice(0, 200)}\n`);
    }
  }
  if (v) {
    process.stdout.write(`\n  📊 SCORE: ${v.totalScore}/${v.maxScore} (C:${v.completeness} Co:${v.coherence} Q:${v.quality})\n`);
    const passed = checks.filter(c => c.passed).length;
    process.stdout.write(`  📋 Checks: ${passed}/${checks.length} passés\n`);
    if (checks.filter(c => !c.passed).length > 0) {
      process.stdout.write(`  ❌ Échoués:\n`);
      for (const c of checks.filter(c => !c.passed)) {
        process.stdout.write(`     - ${c.label}: ${c.detail}\n`);
      }
    }
  }

  return { label, sessionId, status: session.status, totalTime, totalOutput, steps: session.steps, validation: v, checks };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   TEST ROBUSTE PEK v4.1 — BLOC PAR BLOC NATIF             ║');
  console.log('║   Anti-timeout : découpage automatique > 20KB par étape    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Load source material
  const sourceContent = readFileSync('/home/z/my-project/upload/tsi-generator-source.md', 'utf8');
  const projectContext = 'Tu es un expert en développement de mapping MIDI (*.tsi) pour TRAKTOR 3.11 et tu es spécialisé dans le mapping du controleur KONTROL S4 MK2 de Native Instrument. Choisir le mode de raisonnement hybride et complexe, et choisir les blocs automatiquement.';

  console.log(`\nSource: ${sourceContent.length.toLocaleString()} chars, ${sourceContent.split('\n').length} lignes`);
  console.log(`Source < 20KB → Pas de découpage nécessaire (injection complète)`);

  const results = [];

  // === TEST UNIQUE : TSI Generator (Bon V1) ===
  try {
    results.push(await runPEK(
      'TEST — TSI Generator (Bon V1) avec Bloc par Bloc',
      'Robuste TSI Generator V1 — Hybride Complexe — Auto Blocs',
      projectContext,
      sourceContent,
      'complexe',
      'hybride'
    ));
  } catch (e) {
    results.push({ label: 'TEST TSI Generator', error: e.message });
    console.error(`\n  ❌ ERREUR FATALE: ${e.message}`);
  }

  // === RAPPORT FINAL ===
  console.log(`\n\n${'═'.repeat(60)}`);
  console.log('  RAPPORT FINAL — TEST ROBUSTE PEK v4.1');
  console.log('═'.repeat(60));

  for (const r of results) {
    if (r.error) {
      console.log(`\n❌ ${r.label}\n   ERREUR: ${r.error}`);
      continue;
    }
    const v = r.validation;
    const score = v ? `${v.totalScore}/${v.maxScore}` : 'N/A';
    const checks = r.checks?.length > 0 ? `${r.checks.filter(c => c.passed).length}/${r.checks.length}` : 'N/A';
    const status = r.status === 'completed' ? '✅ COMPLETÉ' : '⚠️ ' + r.status.toUpperCase();

    console.log(`\n📌 ${r.label}`);
    console.log(`   Status: ${status}`);
    console.log(`   Temps: ${r.totalTime}s | Output: ${r.totalOutput.toLocaleString()} chars`);
    console.log(`   Score: ${score} | Checks: ${checks}`);

    // Truncation detection
    const stepOutputs = r.steps.map(s => s.output?.length || 0);
    const uniqueOutputs = new Set(stepOutputs);
    if (stepOutputs.length > 1 && uniqueOutputs.size < stepOutputs.length) {
      console.log(`   ⚠️ TRONCATURE DÉTECTÉE: ${stepOutputs.length - uniqueOutputs.size} étapes avec output identique`);
    }
    const tooShort = stepOutputs.filter(o => o > 0 && o < 500);
    if (tooShort.length > 0) {
      console.log(`   ⚠️ OUTPUTS COURTS: ${tooShort.length} étapes avec < 500 chars`);
    }

    // Per-step breakdown
    console.log(`   Détail par étape:`);
    for (const st of r.steps) {
      const icon = st.status === 'completed' ? '  ✅' : '  ❌';
      const outLen = st.output?.length || 0;
      const troncFlag = outLen > 0 && outLen < 500 ? ' ⚠️COURT' : '';
      console.log(`${icon} Step ${st.stepNumber} (${st.name}): ${st.duration}s — ${outLen.toLocaleString()}c${troncFlag}`);
    }
  }

  // Save results
  writeFileSync('/home/z/my-project/robust-test-results.json', JSON.stringify(results, null, 2));
  console.log(`\n📁 Résultats détaillés: /home/z/my-project/robust-test-results.json`);

  await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });