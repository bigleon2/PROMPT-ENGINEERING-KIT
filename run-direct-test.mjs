// Test direct PEK v4.1 — bypass le serveur Next.js (anti-crash)
// Appelle z-ai-web-dev-sdk + Prisma directement, sans passer par HTTP
import { PrismaClient } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';
import { readFileSync, writeFileSync } from 'fs';

const db = new PrismaClient();
const SLEEP = ms => new Promise(r => setTimeout(r, ms));

// ── Bloc par Bloc (copié du backend) ──
const BLOCK_SIZE_THRESHOLD = 20000;
const MAX_BLOCK_INJECT = 15000;

function splitSourceIntoBlocks(source) {
  if (!source || source.length <= BLOCK_SIZE_THRESHOLD) return [{ index: 1, total: 1, header: '', content: source, title: 'complet' }];
  const h2Parts = source.split(/(?=^## )/m).filter(s => s.trim().length > 0);
  if (h2Parts.length >= 2) {
    const blocks = []; let currentBlock = '';
    for (const part of h2Parts) {
      const candidate = currentBlock + (currentBlock ? '\n\n' : '') + part;
      if (currentBlock && candidate.length > MAX_BLOCK_INJECT * 1.2) {
        const title = (part.match(/^##+\s+(.+)/m) || [,'Sans titre'])[1].replace(/[*`#]/g, '').trim().slice(0, 80);
        blocks.push({ index: 0, total: 0, header: '', content: currentBlock, title });
        currentBlock = part;
      } else { currentBlock = candidate; }
    }
    if (currentBlock.trim()) {
      const title = (currentBlock.match(/^##+\s+(.+)/m) || [,'Sans titre'])[1].replace(/[*`#]/g, '').trim().slice(0, 80);
      blocks.push({ index: 0, total: 0, header: '', content: currentBlock, title });
    }
    for (let i = 0; i < blocks.length; i++) { blocks[i].index = i + 1; blocks[i].total = blocks.length; blocks[i].header = `[BLOC ${i+1}/${blocks.length}${blocks[i].title ? ' — « '+blocks[i].title+' »' : ''}]`; }
    return blocks;
  }
  const blocks = []; let pos = 0;
  while (pos < source.length) { const end = Math.min(pos + 10000, source.length); blocks.push({ index: blocks.length+1, total: 0, header: `[BLOC ${blocks.length+1}/? — Chars ${pos}-${end}]`, content: source.slice(pos, end) }); pos = end; }
  for (const b of blocks) { b.total = blocks.length; b.header = b.header.replace('/?', '/' + blocks.length); }
  return blocks;
}

function getBlockForStep(blocks, stepNum, isChaining) {
  if (blocks.length === 1) return blocks[0].content;
  const mid = Math.ceil(blocks.length / 2);
  if (isChaining) {
    if (stepNum === 1) return blocks.map(b => '- ' + b.header).join('\n');
    if (stepNum === 2) return blocks.slice(0, mid).map(b => b.header + '\n' + b.content).join('\n---\n');
    return '[Source déjà traitée]';
  }
  switch (stepNum) {
    case 1: return blocks.map(b => '- ' + b.header).join('\n') + '\n\n' + blocks[0].header + '\n' + blocks[0].content;
    case 2: return blocks.map(b => b.header + '\n' + b.content.slice(0, 300) + '...').join('\n\n');
    case 3: return blocks.slice(0, mid).map(b => b.header + '\n' + b.content).join('\n---\n');
    case 4: return blocks.slice(mid).map(b => b.header + '\n' + b.content).join('\n---\n');
    case 5: return blocks.map(b => b.header + '\n' + b.content).join('\n---\n');
    default: return '[Source déjà traitée]';
  }
}

// ── System prompt PEK (simplifié) ──
function buildSystemPrompt(session) {
  const mode = session.executionMode || 'cot';
  const isChaining = mode === 'chaining' || (mode === 'hybride' && session.complexity === 'simple');
  const steps = isChaining ? 4 : 7;
  return `# PROMPT-ENGINEERING-KIT — MÉTA-PROMPT v4.1\nTu es un Architecte en Prompt Engineering. Pipeline ${isChaining ? 'Chaining 4 étapes' : 'CoT 7 étapes'}.\nComplexité: ${session.complexity} | Langue: ${session.language} | Blocs: ${session.selectedBlocks}\n9 Règles Critiques + Blocs A-J + Scoring 25pts (seuil 22/25).\nIMPORTANT: Produis le contenu de chaque bloc en Markdown structuré.`;
}

function buildUserMessage(step, session, prevOutputs, blocks, isChaining) {
  let msg = '## Contexte\n' + (session.context || '') + '\n\n';
  const blockContent = getBlockForStep(blocks, step.stepNumber, isChaining);
  if (blocks.length > 1) msg += `## Source (${blocks.length} blocs, ${session.sourceMaterial.length}c)\n${blockContent}\n\n`;
  else msg += '## Source\n' + blockContent + '\n\n';
  if (prevOutputs.length > 0) {
    msg += '## Résultats précédents\n';
    for (const p of prevOutputs) msg += `### Étape ${p.stepNumber}\n${p.output.slice(0, 2000)}\n\n`;
  }
  msg += step.instruction;
  return msg;
}

// ── Steps ──
const COT_STEPS = [
  { stepNumber: 1, name: 'COMPRÉHENSION', instruction: 'Analyse le projet. Identifie objectif, domaine, technologies, complexité, points clés. Format structuré.' },
  { stepNumber: 2, name: 'DÉCOMPOSITION', instruction: 'Décompose en composants. Pour chaque: responsabilité, E/S, dépendances, priorité. Format liste structurée.' },
  { stepNumber: 3, name: 'EXTRACTION', instruction: 'Extrais patterns récurrents, structures, workflows, contraintes, bonnes pratiques. Catalogue avec exemples.' },
  { stepNumber: 4, name: 'STRUCTURATION', instruction: 'Organise en kit PEK. Mappe aux blocs A-J. Définit relations et ordre. Plan d\'assemblage.' },
  { stepNumber: 5, name: 'GÉNÉRATION', instruction: 'Génère le contenu complet pour chaque bloc sélectionné. Markdown structuré, exemples concrets, 4+ domaines variés.' },
  { stepNumber: 6, name: 'VALIDATION', instruction: 'Évalue: Complétude (10pts), Cohérence (8pts), Qualité (7pts). Score >= 22/25. Liste déficiences.' },
  { stepNumber: 7, name: 'AMÉLIORATION', instruction: 'Corrige les déficiences, enrichis exemples, optimise. Kit final versionné.' },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST DIRECT PEK v4.1 — BYPASS SERVEUR (anti-crash)       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const source = readFileSync('/home/z/my-project/upload/tsi-generator-source.md', 'utf8');
  const context = 'Tu es un expert en développement de mapping MIDI (*.tsi) pour TRAKTOR 3.11 et tu es spécialisé dans le mapping du controleur KONTROL S4 MK2 de Native Instrument. Choisir le mode de raisonnement hybride et complexe, et choisir les blocs automatiquement.';

  console.log(`\nSource: ${source.length.toLocaleString()} chars`);
  const blocks = splitSourceIntoBlocks(source);
  console.log(`Blocs: ${blocks.length} (seuil 20KB)`);

  const session = {
    context, sourceMaterial: source, results: '', constraints: '',
    selectedBlocks: 'auto', complexity: 'complexe', language: 'fr', executionMode: 'hybride'
  };
  const isChaining = false; // hybride + complexe = CoT 7 étapes
  const systemPrompt = buildSystemPrompt(session);
  const zai = await ZAI.create();
  const prevOutputs = [];
  const results = [];

  for (const step of COT_STEPS) {
    const start = Date.now();
    const userMsg = buildUserMessage(step, session, prevOutputs, blocks, isChaining);
    console.log(`\n⏳ Étape ${step.stepNumber} — ${step.name} (${userMsg.length.toLocaleString()}c envoyés)...`);

    try {
      const comp = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        thinking: { type: 'disabled' },
      });
      const output = comp.choices[0]?.message?.content || 'ERREUR: pas de réponse';
      const dur = Math.round((Date.now() - start) / 1000);
      prevOutputs.push({ stepNumber: step.stepNumber, output });
      results.push({ stepNumber: step.stepNumber, name: step.name, duration: dur, output, outputLen: output.length, status: 'completed' });
      console.log(`  ✅ ${dur}s — ${output.length.toLocaleString()}c`);
    } catch (err) {
      const dur = Math.round((Date.now() - start) / 1000);
      results.push({ stepNumber: step.stepNumber, name: step.name, duration: dur, output: err.message, outputLen: 0, status: 'error' });
      console.log(`  ❌ ${dur}s — ${err.message}`);
    }
  }

  // Rapport
  const totalTime = results.reduce((a, r) => a + r.duration, 0);
  const totalOutput = results.reduce((a, r) => a + r.outputLen, 0);
  const completed = results.filter(r => r.status === 'completed').length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  RAPPORT — TEST DIRECT PEK v4.1');
  console.log('═'.repeat(60));
  console.log(`  Status: ${completed}/7 étapes complétées`);
  console.log(`  Temps total: ${totalTime}s | Output: ${totalOutput.toLocaleString()}c`);
  for (const r of results) {
    const ic = r.status === 'completed' ? '✅' : '❌';
    const flag = r.outputLen > 0 && r.outputLen < 500 ? ' ⚠️COURT' : '';
    console.log(`  ${ic} ${r.stepNumber}. ${r.name}: ${r.duration}s — ${r.outputLen.toLocaleString()}c${flag}`);
  }

  // Truncation detection
  const outputs = results.map(r => r.outputLen);
  const unique = new Set(outputs);
  if (outputs.length > 1 && unique.size < outputs.length) {
    console.log(`  ⚠️ TRONCATURE: ${outputs.length - unique.size} étapes avec output identique`);
  } else {
    console.log('  ✅ AUCUNE TRONCATURE DÉTECTÉE');
  }

  writeFileSync('/home/z/my-project/robust-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n  📁 Résultats: /home/z/my-project/robust-test-results.json');
  await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });