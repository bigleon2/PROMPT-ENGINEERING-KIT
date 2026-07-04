import { readFileSync, writeFileSync } from 'fs';

const SOURCE_FILE = '/home/z/my-project/upload/tsi-generator-source.md';
const API_BASE = 'http://localhost:3000';
const PAUSE_BETWEEN_POLLS = 3000;
const MAX_WAIT = 600000; // 10 min

const CONTEXT = `Tu es un expert en développement de mapping MIDI (*.tsi) pour TRAKTOR 3.11 et tu es spécialisé dans le mapping du controleur KONTROL S4 MK2 de "Native Instrument".`;

async function main() {
  // 1. Lire le fichier source
  const sourceMaterial = readFileSync(SOURCE_FILE, 'utf-8');
  console.log(`[INFO] Source material: ${sourceMaterial.length} chars`);
  console.log(`[INFO] Seuil 20KB: ${sourceMaterial.length <= 20000 ? 'SOUS SEUIL — pas de découpage' : 'AU-DESSUS SEUIL — découpage requis'}`);

  // 2. Créer la session PEK
  console.log('\n[1/3] Création de la session PEK...');
  const createRes = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `TEST ROBUSTE TSI Generator ${new Date().toISOString().slice(0,10)}`,
      context: CONTEXT,
      sourceMaterial: sourceMaterial,
      executionMode: 'hybride',
      complexity: 'expert',
      language: 'fr',
      selectedBlocks: 'auto',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error(`[ERREUR] Création session: ${createRes.status} — ${err}`);
    process.exit(1);
  }

  const session = await createRes.json();
  const sessionId = session.data?.id || session.id;
  console.log(`[OK] Session créée: ${sessionId}`);
  console.log(`[OK] Mode: hybride | Complexité: expert | Blocs: auto`);

  // 3. Lancer l'exécution
  console.log('\n[2/3] Lancement du pipeline CoT 7 étapes...');
  const execRes = await fetch(`${API_BASE}/api/sessions/${sessionId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!execRes.ok) {
    const err = await execRes.text();
    console.error(`[ERREUR] Exécution: ${execRes.status} — ${err}`);
    process.exit(1);
  }

  console.log(`[OK] Pipeline lancé, status: ${execRes.status}`);

  // 4. Poller jusqu'à complétion
  console.log('\n[3/3] Polling de la session...');
  const startTime = Date.now();
  let lastStep = 0;
  let pollCount = 0;

  while (Date.now() - startTime < MAX_WAIT) {
    await new Promise(r => setTimeout(r, PAUSE_BETWEEN_POLLS));
    pollCount++;

    const pollRes = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
    if (!pollRes.ok) continue;

    const data = await pollRes.json();
    const steps = data.steps || [];
    const completed = steps.filter(s => s.status === 'completed').length;
    const errored = steps.filter(s => s.status === 'error').length;
    const currentStep = data.currentStep || 0;

    // Progress
    if (currentStep !== lastStep || completed !== lastStep) {
      const stepNames = steps.map(s => {
        const icon = s.status === 'completed' ? '✅' : s.status === 'running' ? '🔄' : s.status === 'error' ? '❌' : '⏳';
        const chars = s.output ? `${s.output.length}c` : '—';
        return `  ${icon} Step ${s.stepNumber} (${s.name}): ${s.status} [${chars}]${s.duration ? ` ${s.duration}s` : ''}`;
      });
      console.log(`\n[POLL #${pollCount}] Status: ${data.status} | Steps: ${completed}/7 completed | ${errored} errors`);
      stepNames.forEach(s => console.log(s));
      lastStep = currentStep;
    }

    // Check termination
    if (data.status === 'completed' || data.status === 'error') {
      console.log(`\n[FIN] Session terminée: ${data.status}`);
      break;
    }
  }

  if (Date.now() - startTime >= MAX_WAIT) {
    console.log('\n[TIMEOUT] Délai maximum atteint');
  }

  // 5. Récupérer les résultats finaux
  console.log('\n[RESULTATS] Récupération complète...');
  const finalRes = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
  const finalData = await finalRes.json();

  // 6. Compiler le rapport
  const steps = finalData.steps || [];
  const validation = finalData.validation;

  let totalChars = 0;
  let minChars = Infinity;
  let maxChars = 0;
  let stepOutputs = [];

  for (const step of steps) {
    const len = (step.output || '').length;
    totalChars += len;
    if (len < minChars) minChars = len;
    if (len > maxChars) maxChars = len;
    stepOutputs.push({
      step: step.stepNumber,
      name: step.name,
      status: step.status,
      chars: len,
      duration: step.duration || 0,
    });
  }

  // Vérifier troncature
  let truncationDetected = false;
  for (let i = 2; i < stepOutputs.length; i++) {
    const curr = (steps[i].output || '').slice(0, 200);
    const prev = (steps[i-1].output || '').slice(0, 200);
    if (curr === prev && curr.length > 1000) {
      truncationDetected = true;
      console.log(`  ⚠️ TRONCATURE DÉTECTÉE: Steps ${i} et ${i+1} ont des outputs identiques (${curr.length}c)`);
    }
  }

  const report = {
    test: {
      name: 'TEST ROBUSTE — TSI Generator (Good V1)',
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      sourceSize: sourceMaterial.length,
      sourceThreshold: '20KB',
      splitting: sourceMaterial.length <= 20000 ? 'NOT_NEEDED' : 'BLOC_PAR_BLOC',
    },
    config: {
      mode: 'hybride',
      complexity: 'expert',
      language: 'fr',
      selectedBlocks: 'auto',
    },
    steps: stepOutputs,
    validation: validation ? {
      completeness: validation.completeness,
      coherence: validation.coherence,
      quality: validation.quality,
      totalScore: validation.totalScore,
      maxScore: validation.maxScore,
      passed: validation.passed,
      checks: validation.checks ? JSON.parse(validation.checks) : [],
    } : null,
    stats: {
      totalChars,
      minChars,
      maxChars,
      avgChars: steps.length ? Math.round(totalChars / steps.length) : 0,
      totalDuration: steps.reduce((s, st) => s + (st.duration || 0), 0),
      truncationDetected,
    },
  };

  // Sauvegarder
  const outPath = '/home/z/my-project/robust-test-tsi-report.json';
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n[SAUVEGARDE] Rapport: ${outPath}`);

  // Affichage résumé
  console.log('\n' + '='.repeat(60));
  console.log('RAPPORT TEST ROBUSTE PEK v4.1');
  console.log('='.repeat(60));
  console.log(`Source: ${report.test.sourceSize} chars (${report.test.splitting})`);
  console.log(`Config: mode=${report.config.mode}, complexité=${report.config.complexity}`);
  console.log(`Steps: ${steps.filter(s=>s.status==='completed').length}/${steps.length} complétés`);
  console.log(`Durée totale: ${report.stats.totalDuration}s`);
  console.log(`Caractères: ${report.stats.totalChars.toLocaleString()} total (min: ${report.stats.minChars}, max: ${report.stats.maxChars}, moy: ${report.stats.avgChars})`);
  console.log(`Troncature: ${report.stats.truncationDetected ? '⚠️ DÉTECTÉE' : '✅ AUCUNE'}`);

  if (report.validation) {
    const v = report.validation;
    console.log(`\nSCORE LLM: ${v.totalScore}/${v.maxScore} (${v.passed ? '✅ PASSÉ' : '❌ NON PASSÉ — seuil 22/25'})`);
    console.log(`  Complétude: ${v.completeness}/10`);
    console.log(`  Cohérence: ${v.coherence}/8`);
    console.log(`  Qualité: ${v.quality}/7`);
    console.log(`\n  CHECKS (12):`);
    if (v.checks.length > 0) {
      v.checks.forEach((c, i) => {
        const icon = c.passed ? '✅' : '❌';
        console.log(`  ${icon} ${i+1}. ${c.label}: ${c.detail}`);
      });
    } else {
      console.log('  (checks non disponibles — fallback heuristique)');
    }
  } else {
    console.log('\n⚠️ Pas de validation disponible');
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});