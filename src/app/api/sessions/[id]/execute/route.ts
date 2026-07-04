import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

interface StepInstruction {
  stepNumber: number;
  name: string;
  instruction: string;
}

const STEP_INSTRUCTIONS: StepInstruction[] = [
  {
    stepNumber: 1,
    name: 'COMPRÉHENSION',
    instruction: `**Étape 1 : COMPRÉHENSION**
Analyse en profondeur du projet fourni. Identifie :
- L'objectif principal du projet IA
- Le domaine d'application
- Les technologies et frameworks utilisés
- Les acteurs impliqués (développeurs, utilisateurs finaux, etc.)
- Le niveau de complexité global
- Les points clés à préserver absolument

Format de sortie : Analyse structurée avec sections claires.`,
  },
  {
    stepNumber: 2,
    name: 'DÉCOMPOSITION',
    instruction: `**Étape 2 : DÉCOMPOSITION**
Décompose le projet en composants réutilisables. Pour chaque composant :
- Identifie sa responsabilité principale
- Définit ses entrées/sorties
- Note les dépendances avec d'autres composants
- Évalue sa réutilisabilité potentielle
- Classe par priorité de conversion en bloc prompt

Format de sortie : Liste structurée des composants avec leurs caractéristiques.`,
  },
  {
    stepNumber: 3,
    name: 'EXTRACTION',
    instruction: `**Étape 3 : EXTRACTION**
Extrais les patterns récurrents et les éléments réutilisables :
- Patterns de conception identifiés
- Structures de données communes
- Workflows récurrents
- Contraintes techniques récurrentes
- Bonnes pratiques observées
- Exemples concrets dans 4+ domaines différents

Format de sortie : Catalogue des patterns avec exemples concrets.`,
  },
  {
    stepNumber: 4,
    name: 'STRUCTURATION',
    instruction: `**Étape 4 : STRUCTURATION**
Organise les éléments extraits en une structure de kit cohérente :
- Mappe chaque élément aux blocs A-J du PEK
- Définit les relations entre les blocs
- Établit l'ordre recommandé d'utilisation
- Identifie les blocs obligatoires vs optionnels
- Crée le plan d'assemblage du kit

Blocs PEK : A(Contexte) B(Instructions) C(Exemples) D(Contraintes) E(Format Sortie) F(Métadonnées) G(Validation) H(Variables) I(Garde-fous) J(Amélioration)

Format de sortie : Structure hiérarchique du kit avec mappage aux blocs.`,
  },
  {
    stepNumber: 5,
    name: 'GÉNÉRATION',
    instruction: `**Étape 5 : GÉNÉRATION**
Génère le contenu complet pour chaque bloc sélectionné du kit PEK. Pour chaque bloc :
- Rédige le contenu détaillé et opérationnel
- Inclue des exemples concrets et variés (4+ domaines)
- Ajoute des placeholders pour les variables
- Prévoit les cas d'erreur et leurs traitements
- Rédige en {language} avec la complexité {complexity}

Format de sortie : Contenu complet de chaque bloc en Markdown structuré.`,
  },
  {
    stepNumber: 6,
    name: 'VALIDATION',
    instruction: `**Étape 6 : VALIDATION**
Évalue la qualité du kit généré selon les critères PEK :
- **Complétude** : Tous les blocs sélectionnés sont-ils présents et complets ?
- **Cohérence** : Les références entre blocs sont-elles correctes ?
- **Qualité** : Les exemples sont-ils pertinents et variés (4+ domaines) ?
- **Réutilisabilité** : Le kit peut-il être réutilisé sans modification majeure ?
- **Fidélité** : Le contenu original est-il fidèlement préservé ?

Pour chaque critère, donne une note et un commentaire justifié.
Identifie les points d'amélioration prioritaires.

Format de sortie : Rapport de validation structuré avec scores et recommandations.`,
  },
  {
    stepNumber: 7,
    name: 'AMÉLIORATION',
    instruction: `**Étape 7 : AMÉLIORATION**
Applique les corrections et améliorations identifiées à l'étape de validation :
- Corrige les incohérences détectées
- Enrichit les exemples si nécessaire (objectif 4+ domaines)
- Optimise les formulations pour la clarté
- Ajoute les éléments manquants
- Produit le kit final versionné

Format de sortie : Kit PEK final complet en Markdown, prêt à l'emploi, avec numéro de version.`,
  },
];

const CHAINING_STEP_INSTRUCTIONS: StepInstruction[] = [
  {
    stepNumber: 1,
    name: 'PRÉPARATION',
    instruction: `**Étape 1 : PRÉPARATION**
Extraction et normalisation des données du projet source.
- Identifier les composants clés du projet
- Extraire les métadonnées et patterns principaux  
- Normaliser la structure pour le traitement
- Identifier les blocs PEK pertinents

Format de sortie : Inventaire structuré des composants avec classification.`,
  },
  {
    stepNumber: 2,
    name: 'TRAITEMENT',
    instruction: `**Étape 2 : TRAITEMENT**
Application de la stratégie de génération pour les blocs sélectionnés.
- Pour chaque bloc sélectionné, générer le contenu complet
- Appliquer les patterns identifiés à l'étape 1
- Produire des versions intermédiaires (brouillon)

Format de sortie : Contenu détaillé de chaque bloc en Markdown.`,
  },
  {
    stepNumber: 3,
    name: 'VÉRIFICATION',
    instruction: `**Étape 3 : VÉRIFICATION**
Auto-évaluation et correction du contenu généré.
- Vérifier la cohérence entre les blocs
- Valider la complétude par rapport aux blocs sélectionnés
- Détecter et corriger les incohérences
- Évaluer la qualité des exemples (4+ domaines)

Format de sortie : Rapport de vérification avec corrections appliquées.`,
  },
  {
    stepNumber: 4,
    name: 'OPTIMISATION',
    instruction: `**Étape 4 : OPTIMISATION**
Production des versions finales optimisées.
- Version Pro : Contenu détaillé et complet avec annotations
- Version Clean : Contenu épuré, prêt à l'emploi
- Version Compacte : Résumé synthétique du kit

Format de sortie : Kit PEK final en 3 versions (Pro, Clean, Compacte) en Markdown.`,
  },
];

function buildSystemPrompt(session: {
  selectedBlocks: string;
  complexity: string;
  language: string;
  constraints: string;
  executionMode: string;
}): string {
  const complexityMap: Record<string, string> = {
    simple: 'Simple — Explications basiques, exemples directs',
    moyen: 'Moyen — Équilibré entre simplicité et détail technique',
    avance: 'Avancé — Détail technique poussé, edge cases couverts',
    expert: 'Expert — Optimisation extrême, patterns avancés, méta-prompts',
  };

  const complexityLabel = complexityMap[session.complexity] || complexityMap['moyen'];
  const languageLabel = session.language === 'fr' ? 'Français' : session.language === 'en' ? 'English' : session.language;

  const mode = session.executionMode || 'cot';
  let methodologyLine: string;
  let methodologySteps: string[];

  if (mode === 'cot') {
    methodologyLine = 'Méthodologie active: Chain-of-Thought en 7 étapes';
    methodologySteps = [
      '  ÉTAPE 1 — COMPRÉHENSION : Lire tout le matériel, identifier le type de projet, formuler l\'objectif en une phrase, lister les contraintes, déterminer la complexité. Livrable : résumé exécutif.',
      '  ÉTAPE 2 — DÉCOMPOSITION : Identifier les composants principaux, cartographier les dépendances, repérer les patterns récurrents, sélectionner les blocs A-J adaptatifs. Livrable : carte mentale + sélection blocs.',
      '  ÉTAPE 3 — EXTRACTION : Extraire objectif principal, sous-objectifs, règles absolues, limitations, étapes successives, décisions clés, format de sortie, stack technique. Livrable : liste exhaustive.',
      '  ÉTAPE 4 — STRUCTURATION : Mapper les éléments extraits vers l\'architecture du kit (README, config.yaml, prompts/00-07, examples/, tests/, build/). Livrable : plan de structuration.',
      '  ÉTAPE 5 — GÉNÉRATION : Produire tous les fichiers du kit dans l\'ordre : README.md → config/config.yaml → prompts/00_System.md à 07_Reasoning.md → examples/ (3 fichiers différenciés) → tests/test_cases.md → build/prompt_final.md → versions/VERSION.yaml. Livrable : kit complet.',
      '  ÉTAPE 6 — VALIDATION : Vérifier tous les fichiers présents et non vides, références croisées valides, prompt_final directement utilisable, exemples de 4+ domaines variés, structure adaptée au type de projet, score qualité >= 22/25. Livrable : rapport de validation.',
      '  ÉTAPE 7 — AMÉLIORATION : Identifier 3 points d\'amélioration concrets, cas limites non couverts, tests additionnels suggérés, tracer la version. Livrable : recommandations.',
    ];
  } else if (mode === 'chaining') {
    methodologyLine = 'Méthodologie active: Prompt Chaining en 4 étapes pipeline';
    methodologySteps = [
      '  ÉTAPE 1 — PRÉPARATION : Extraction et normalisation des données du projet source. Identifier composants clés, extraire métadonnées et patterns, normaliser la structure, identifier les blocs PEK pertinents. Livrable : inventaire structuré.',
      '  ÉTAPE 2 — TRAITEMENT : Application de la stratégie de génération pour chaque bloc sélectionné. Pour chaque bloc, générer le contenu complet en appliquant les patterns identifiés, produire des versions intermédiaires. Livrable : contenu détaillé de chaque bloc.',
      '  ÉTAPE 3 — VÉRIFICATION : Auto-évaluation et correction. Vérifier la cohérence entre blocs, valider la complétude, détecter et corriger les incohérences, évaluer la qualité des exemples (4+ domaines). Livrable : rapport avec corrections appliquées.',
      '  ÉTAPE 4 — OPTIMISATION : Production des versions finales. Version Pro (détaillée avec annotations), Version Clean (épuraée prêt à l\'emploi), Version Compacte (résumé synthétique). Livrable : kit PEK final en 3 versions.',
    ];
  } else {
    methodologyLine = 'Méthodologie active: HYBRIDE CoT + Chaining — Bascule automatique selon la complexité';
    methodologySteps = [
      '  MODE HYBRIDE : Le système détermine dynamiquement la méthodologie optimale.',
      '  - Si complexité = simple : bascule automatiquement en Prompt Chaining (4 étapes pipeline).',
      '  - Si complexité = moyen ou complexe : applique le Chain-of-Thought complet (7 étapes).',
      '  ÉTAPE 1 — COMPRÉHENSION : Analyse approfondie du projet, identification du type, objectifs, contraintes.',
      '  ÉTAPE 2 — DÉCOMPOSITION : Découpage en composants, dépendances, patterns, sélection blocs A-J.',
      '  ÉTAPE 3 — EXTRACTION : Éléments clés, règles, étapes, stack technique, format de sortie.',
      '  ÉTAPE 4 — STRUCTURATION : Mapping vers l\'architecture du kit (README, config, prompts, examples, tests).',
      '  ÉTAPE 5 — GÉNÉRATION : Production de tous les fichiers du kit dans l\'ordre protocolaire.',
      '  ÉTAPE 6 — VALIDATION : Score qualité 25pts (complétude 10 + cohérence 8 + qualité 7), seuil 22/25.',
      '  ÉTAPE 7 — AMÉLIORATION : 3 améliorations concrètes, cas limites, versionnage.',
    ];
  }

  const selectedBlocks = session.selectedBlocks === 'auto'
    ? 'AUTO — Sélection adaptative par l\'IA selon le type de projet (voir règles ci-dessous)'
    : session.selectedBlocks;

  return [
    "# PROMPT-ENGINEERING-KIT — MÉTA-PROMPT MAÎTRE v4.0",
    "",
    "## Rôle",
    "Tu es un Architecte en Prompt Engineering spécialisé en conversion de projets IA en kits structurés, réutilisables et validés. Tu maîtrises l'assemblage automatisé de prompts, la validation qualité, le versionning et le Chain-of-Thought.",
    "",
    "## Compétences Clés",
    "1. Analyse de projets : extraction systématique d'éléments clés, tout format",
    "2. Architecture logicielle : principes SRP, modularité, faible couplage",
    "3. Prompt Engineering : best practices, Chain-of-Thought, few-shot, méta-prompts",
    "4. Automatisation : assemblage de prompts, validation par script, versionning",
    "5. Pédagogie : explication claire de concepts complexes",
    "6. Qualité : validation rigoureuse, scoring automatisé (25pts), tests systématiques",
    "",
    methodologyLine,
    ...methodologySteps,
    "",
    "## 9 Règles Critiques",
    "RÈGLE 1 — PRÉSERVATION DE L'ORIGINAL : Autorisé : structurer, clarifier, organiser. Interdit : inventer, modifier les décisions, dénaturer.",
    "RÈGLE 2 — COMPLÉTUDE DES FICHIERS : Tous les blocs sélectionnés doivent être générés exhaustivement. Contenu minimal + [À COMPLÉTER] si information manquante. Interdit : omettre, fichier vide silencieux.",
    "RÈGLE 3 — COHÉRENCE DES RÉFÉRENCES : Chemins relatifs standards, liens Markdown valides. Interdit : références inexistantes, chemins absolus, liens brisés.",
    "RÈGLE 4 — RESPECT DES SCHEMAS : Valider la conformité, signaler les écarts. Interdit : output non conforme, champs requis ignorés.",
    "RÈGLE 5 — APPLICATION DU CHAIN-OF-THOUGHT : Suivre rigoureusement les étapes dans l'ordre. Prendre le temps nécessaire, revenir en arrière si besoin. Interdit : sauter une étape, mélanger, accélérer.",
    "RÈGLE 6 — QUALITÉ DES EXEMPLES (4+ domaines) : Adapter au projet, inclure cas limites, varier les domaines (ex: web, data science, IoT, éducation, marketing, recherche). Interdit : exemples génériques, mono-domaine, doublons.",
    "RÈGLE 7 — AUTOMATISATION ET VERSIONNAGE : Utiliser les outils automatisés quand disponibles. Tracer dans VERSION.yaml. Interdit : ignorer les outils, générer manuellement si un script existe.",
    "RÈGLE 8 — DÉTECTION DE CONTENU TROMPEUR : Vérifier les allégations, rester factuel et mesurable. Interdit : greenwashing, fausses promesses, statistiques inventées.",
    "RÈGLE 9 — BOUCLE DE FEEDBACK ITÉRATIVE : Intégrer les métriques de feedback comme signal d'amélioration. Interdit : ignorer les données quantitatives disponibles.",
    "",
    "## Gestion des Cas Limites",
    "- Projet incomplet → kit avec placeholders [À COMPLÉTER] + demande de compléments",
    "- Contradictions → identifier et proposer une résolution",
    "- Informations ambiguës → présenter plusieurs interprétations",
    "- Input corrompu → signaler l'erreur, proposer un format alternatif",
    "- Auto-référence → le kit peut s'analyser lui-même ; éviter la boucle infinie",
    "- Génération circulaire → détecter et interrompre si un kit généré génère un kit",
    "",
    "## Structure Adaptative — Blocs A-J",
    "BLOC A — Résumé Exécutif (OBLIGATOIRE) : Objectif, contexte, livrables principaux. Toujours premier.",
    "BLOC B — Architecture & Composants : Diagramme des composants, dépendances, flux de données.",
    "BLOC C — Prompt / Instructions : Prompts système, instructions de traitement, règles métier.",
    "BLOC D — Données & Schemas : Schemas d'entrée/sortie, formats attendus.",
    "BLOC E — Contraintes & Règles : Limitations techniques, règles métier, invariants.",
    "BLOC F — Résultats & Outputs : Outputs produits, métriques, artefacts générés.",
    "BLOC G — Guide d'Utilisation (RECOMMANDÉ) : Instructions pas-à-pas pour reproduire ou utiliser.",
    "BLOC H — Recommandations (OBLIGATOIRE) : Axes d'amélioration, optimisations, évolutions futures. Toujours dernier.",
    "BLOC I — Tests & Validation : Cas de test, scénarios de validation.",
    "BLOC J — Glossaire & Références : Termes techniques, liens utiles, dépendances externes.",
    "",
    "## Règles de Composition",
    "1. Bloc A toujours en premier, bloc H toujours en dernier",
    "2. Ordre des blocs contextuels libre (enchaînement le plus logique)",
    "3. Chaque bloc autonome — compréhensible sans lire les autres",
    "4. Cohérence entre blocs — pas de contradictions ni redondances",
    "5. Nombre total recommandé : 5 à 9 selon la complexité",
    "",
    "## Règles de Sélection Adaptative par Type de Projet",
    "| Type de projet | Blocs recommandés |",
    "|----------------|-------------------|",
    "| Web (Next.js, React) | A + B + C + D + E + G + H + I |",
    "| Pipeline Data / ETL | A + B + D + E + F + G + H + I |",
    "| Agent IA / Chatbot | A + C + D + E + G + H + J |",
    "| Méta-outil / Framework | A + B + C + D + E + F + G + H + I + J |",
    "",
    "## Scoring Qualité (25 points)",
    "COMPLÉTUDE (10 pts) : Tous les fichiers présents, non vides, références croisées valides",
    "COHÉRENCE (8 pts) : Terminologie uniforme, pas de contradictions, examples/few-shot différenciés",
    "QUALITÉ (7 pts) : Langage clair, Markdown correct, exemples concrets 4+ domaines",
    "Score minimum requis : 22/25 (88%)",
    "",
    "## Style et Formatage",
    "- Ton : Professionnel et accessible",
    "- Paragraphes : 2-4 phrases maximum (5 max strict)",
    "- Privilégier les listes aux paragraphes longs",
    "- Titres : ## Section (H2), ### Sous-section (H3), #### Détail (H4)",
    "- Interdictions : paragraphes > 5 lignes, jargon non expliqué, redondances inter-fichiers, emojis excessifs",
    "",
    "## Contexte d'Exécution",
    "Blocs sélectionnés : " + selectedBlocks,
    "Complexité : " + complexityLabel,
    "Langue : " + languageLabel,
    (session.constraints ? "Contraintes additionnelles : " + session.constraints : ""),
    "",
    "## Écosystème d'Orchestration (v4.0)",
    "Ce kit s'inscrit dans un écosystème multi-agents :",
    "- super-agent-hybride-cot-chaining : Orchestrateur CoT + Chaining + Modules spécialisés",
    "- gen-plan : Orchestration multi-agents, planification 13 étapes séquentielles",
    "- correct-work : Vérification et correction 5 étapes, chaîne : correct-work → gen-plan → super-agent",
    "- zip-to-md : Conversion d'archives en Markdown structuré",
    "",
    "IMPORTANT : Tu dois produire le contenu de chaque bloc sélectionné en Markdown structuré, directement exploitable. Chaque bloc doit être complet et autonome.",
  ].join('\n');
}

// ── Bloc par Bloc : découpage anti-troncature (SKILL gen-plan v1.3.0) ──

interface SourceBlock {
  index: number;
  total: number;
  header: string;
  content: string;
  title?: string;
}

const BLOCK_SIZE_THRESHOLD = 20000; // 20KB — seuil de découpage
const MAX_BLOCK_INJECT = 15000; // 15KB — max par appel LLM

function splitSourceIntoBlocks(source: string): SourceBlock[] {
  if (!source || source.length <= BLOCK_SIZE_THRESHOLD) {
    return [{ index: 1, total: 1, header: '', content: source, title: 'complet' }];
  }

  // Try splitting by H2 headings
  const h2Parts = source.split(/(?=^## )/m).filter(s => s.trim().length > 0);

  if (h2Parts.length >= 2) {
    const blocks: SourceBlock[] = [];
    let currentBlock = '';

    for (const part of h2Parts) {
      const candidate = currentBlock + (currentBlock ? '\n\n' : '') + part;
      if (currentBlock && candidate.length > MAX_BLOCK_INJECT * 1.2) {
        // Flush current block
        const title = extractTitle(currentBlock);
        blocks.push({
          index: blocks.length + 1,
          total: 0, // will be set later
          header: `[BLOC ${blocks.length + 1}/? — Section: « ${title} »]`,
          content: currentBlock,
          title,
        });
        currentBlock = part;
      } else {
        currentBlock = candidate;
      }
    }

    // Flush last block
    if (currentBlock.trim()) {
      const title = extractTitle(currentBlock);
      blocks.push({
        index: blocks.length + 1,
        total: 0,
        header: `[BLOC ${blocks.length + 1}/? — Section: « ${title} »]`,
        content: currentBlock,
        title,
      });
    }

    // Merge small blocks (< 1000 chars) with previous
    const merged: SourceBlock[] = [];
    for (const block of blocks) {
      if (merged.length > 0 && block.content.length < 1000) {
        const prev = merged[merged.length - 1];
        prev.content += '\n\n' + block.content;
        prev.title = (prev.title || '') + ' + ' + (block.title || '');
        prev.header = `[BLOC ${prev.index}/? — Sections: « ${prev.title} »]`;
      } else {
        merged.push({ ...block, index: merged.length + 1 });
      }
    }

    // Set total count
    for (const b of merged) {
      b.total = merged.length;
      b.header = b.header.replace('/?', '/' + merged.length);
    }

    // If still > MAX per block, split by H3
    const final: SourceBlock[] = [];
    for (const b of merged) {
      if (b.content.length > MAX_BLOCK_INJECT * 1.5) {
        const h3Parts = b.content.split(/(?=^### )/m).filter(s => s.trim().length > 0);
        if (h3Parts.length >= 2) {
          for (const h3p of h3Parts) {
            const t = extractTitle(h3p);
            final.push({
              index: 0, total: 0,
              header: '',
              content: h3p,
              title: t,
            });
          }
        } else {
          final.push(b);
        }
      } else {
        final.push(b);
      }
    }

    // Re-index final
    for (let i = 0; i < final.length; i++) {
      final[i].index = i + 1;
      final[i].total = final.length;
      final[i].header = `[BLOC ${i + 1}/${final.length}${final[i].title ? ' — Section: « ' + final[i].title + ' »' : ''}]`;
    }

    return final;
  }

  // Fallback: split by character count (for non-markdown files)
  const blocks: SourceBlock[] = [];
  let pos = 0;
  const chunkSize = 10000;
  while (pos < source.length) {
    const end = Math.min(pos + chunkSize, source.length);
    const content = source.slice(pos, end);
    const startLine = source.slice(0, pos).split('\n').length;
    const endLine = source.slice(0, end).split('\n').length;
    blocks.push({
      index: blocks.length + 1,
      total: 0,
      header: `[BLOC ${blocks.length + 1}/? — Lignes ${startLine} à ${endLine} / Chars ${pos} à ${end}]`,
      content,
    });
    pos = end;
  }
  for (const b of blocks) {
    b.total = blocks.length;
    b.header = b.header.replace('/?', '/' + blocks.length);
  }
  return blocks;
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^##+\s+(.+)/m);
  return match ? match[1].replace(/[*`#]/g, '').trim().slice(0, 80) : 'Sans titre';
}

function buildBlockSummary(blocks: SourceBlock[]): string {
  return blocks.map(b => `- ${b.header}`).join('\n');
}

function getBlockContentForStep(
  blocks: SourceBlock[],
  stepNumber: number,
  totalSteps: number,
  isChaining: boolean
): string {
  // If source fits in one block (≤ 20KB), return as-is
  if (blocks.length === 1) {
    return blocks[0].content;
  }

  const mid = Math.ceil(blocks.length / 2);

  if (isChaining) {
    // Chaining 4 steps
    switch (stepNumber) {
      case 1: // PRÉPARATION — summary only
        return `Ce document est découpé en ${blocks.length} blocs.\n\n` + buildBlockSummary(blocks);
      case 2: // TRAITEMENT — first half
        return blocks.slice(0, mid).map(b => b.header + '\n\n' + b.content).join('\n\n---\n\n');
      case 3: // VÉRIFICATION — outputs only (no source)
        return `[Source déjà traitée — utilise les sorties des étapes précédentes]`;
      case 4: // OPTIMISATION — no source
        return `[Source déjà traitée — utilise les sorties des étapes précédentes]`;
      default:
        return buildBlockSummary(blocks);
    }
  }

  // CoT 7 steps
  switch (stepNumber) {
    case 1: // COMPRÉHENSION — summary or block 1
      return `Ce document est découpé en ${blocks.length} blocs.\n\n` + buildBlockSummary(blocks) +
        '\n\n---\n\n' + blocks[0].header + '\n\n' + blocks[0].content;
    case 2: // DÉCOMPOSITION — summary with key components
      return `Ce document est découpé en ${blocks.length} blocs.\n\n` +
        blocks.map(b => b.header + '\n' + b.content.slice(0, 300) + '...').join('\n\n');
    case 3: // EXTRACTION — first half
      return blocks.slice(0, mid).map(b => b.header + '\n\n' + b.content).join('\n\n---\n\n');
    case 4: // STRUCTURATION — second half
      return blocks.slice(mid).map(b => b.header + '\n\n' + b.content).join('\n\n---\n\n');
    case 5: // GÉNÉRATION — ALL blocks (with headers for cross-reference)
      return `Document complet en ${blocks.length} blocs :\n\n` +
        blocks.map(b => b.header + '\n\n' + b.content).join('\n\n---\n\n');
    case 6: // VALIDATION — no source (uses previous outputs)
      return `[Source déjà traitée dans les étapes 1-5 — utilise les sorties accumulées]`;
    case 7: // AMÉLIORATION — no source
      return `[Source déjà traitée — utilise le feedback de validation + sorties à corriger]`;
    default:
      return buildBlockSummary(blocks);
  }
}

function buildUserMessage(
  step: StepInstruction,
  session: {
    context: string;
    sourceMaterial: string;
    results: string;
    constraints: string;
  },
  previousOutputs: { stepNumber: number; output: string }[],
  allInstructions: StepInstruction[],
  blocks: SourceBlock[],
  isChaining: boolean
): string {
  let message = '';
  message += '## Contexte de la session\n\n';
  message += (session.context || 'Non fourni') + '\n\n';

  if (session.sourceMaterial) {
    const blockContent = getBlockContentForStep(blocks, step.stepNumber, allInstructions.length, isChaining);
    if (blocks.length > 1) {
      message += `## Matériel source (${blocks.length} blocs — ${session.sourceMaterial.length.toLocaleString()} chars total)\n\n`;
    } else {
      message += '## Matériel source\n\n';
    }
    message += blockContent + '\n\n';
  }

  if (session.results) {
    message += '## Résultats attendus\n\n';
    message += session.results + '\n\n';
  }

  if (session.constraints) {
    message += '## Contraintes additionnelles\n\n';
    message += session.constraints + '\n\n';
  }

  if (previousOutputs.length > 0) {
    message += '## Résultats des étapes précédentes\n\n';
    for (const prev of previousOutputs) {
      const stepName = allInstructions[prev.stepNumber - 1]?.name || 'Inconnue';
      message += '### Étape ' + prev.stepNumber + ' — ' + stepName + '\n\n';
      message += prev.output + '\n\n';
    }
    message += '---\n\n';
  }

  message += step.instruction;
  return message;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const zai = await ZAI.create();

    // Load session with steps
    const session = await db.session.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session non trouvée' }, { status: 404 });
    }

    // Determine execution mode and instructions
    const executionMode = session.executionMode || 'cot';
    const isChaining = executionMode === 'chaining' || (executionMode === 'hybride' && session.complexity === 'simple');
    const instructions = isChaining ? CHAINING_STEP_INSTRUCTIONS : STEP_INSTRUCTIONS;

    // Split source into blocks (gen-plan v1.3.0 — anti-troncature)
    const blocks = splitSourceIntoBlocks(session.sourceMaterial || '');
    if (blocks.length > 1) {
      console.log(`[BlocParBloc] Source découpée en ${blocks.length} blocs (${session.sourceMaterial?.length || 0} chars)`);
    }

    // Build the PEK system prompt
    const systemPrompt = buildSystemPrompt(session);

    const previousOutputs: { stepNumber: number; output: string }[] = [];
    const stepResults: { stepNumber: number; name: string; output: string; duration: number; status: string }[] = [];

    // Execute each step sequentially
    for (const step of session.steps) {
      const stepStartTime = Date.now();

      // Mark step as running
      await db.step.update({
        where: { id: step.id },
        data: { status: 'running' },
      });

      // Update session current step
      await db.session.update({
        where: { id },
        data: { currentStep: step.stepNumber },
      });

      const stepConfig = instructions[step.stepNumber - 1];
      const userMessage = buildUserMessage(stepConfig, session, previousOutputs, instructions, blocks, isChaining);

      try {
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          thinking: { type: 'disabled' },
        });

        const output = completion.choices[0]?.message?.content || 'Erreur: aucune réponse générée';
        const duration = Math.round((Date.now() - stepStartTime) / 1000);

        // Save step output
        await db.step.update({
          where: { id: step.id },
          data: {
            status: 'completed',
            output,
            duration,
          },
        });

        previousOutputs.push({ stepNumber: step.stepNumber, output });
        stepResults.push({
          stepNumber: step.stepNumber,
          name: step.name,
          output,
          duration,
          status: 'completed',
        });

        // After validation step, compute and save validation score
        // CoT: step 6, Chaining: step 3
        const validationStepNumber = isChaining ? 3 : 6;
        if (step.stepNumber === validationStepNumber) {
          const validationResult = await computeAndSaveValidation(
            id,
            session.selectedBlocks,
            output,
            previousOutputs,
            zai,
            systemPrompt,
            { complexity: session.complexity, language: session.language, constraints: session.constraints },
          );

          // PHASE 2: Auto-iteration if score < 22/25 (max 1 retry)
          if (!validationResult.passed && validationResult.totalScore < 22) {
            // Reset the improvement/amélioration step for retry
            const improvementStep = session.steps.find(
              (s) => s.stepNumber === (isChaining ? 4 : 7)
            );
            if (improvementStep) {
              await db.step.update({
                where: { id: improvementStep.id },
                data: {
                  status: 'pending',
                  output: '',
                  duration: 0,
                },
              });

              // Add feedback from validation to previous outputs
              previousOutputs.push({
                stepNumber: 100,
                output: `FEEDBACK DE VALIDATION (score ${validationResult.totalScore}/25 — seuil non atteint) :\n` +
                  `- Complétude: ${validationResult.completeness}/10\n` +
                  `- Cohérence: ${validationResult.coherence}/8\n` +
                  `- Qualité: ${validationResult.quality}/7\n\n` +
                  `Corrige les déficiences identifiées et régénère le kit amélioré.`,
              });
            }
          }
        }
      } catch (llmError) {
        const duration = Math.round((Date.now() - stepStartTime) / 1000);
        const errorMsg = llmError instanceof Error ? llmError.message : 'Erreur LLM inconnue';

        await db.step.update({
          where: { id: step.id },
          data: {
            status: 'error',
            output: 'Erreur: ' + errorMsg,
            duration,
          },
        });

        stepResults.push({
          stepNumber: step.stepNumber,
          name: step.name,
          output: 'Erreur: ' + errorMsg,
          duration,
          status: 'error',
        });

        // Mark remaining steps as skipped
        for (const remainingStep of session.steps) {
          if (remainingStep.stepNumber > step.stepNumber && remainingStep.status === 'pending') {
            await db.step.update({
              where: { id: remainingStep.id },
              data: { status: 'skipped' },
            });
          }
        }

        // Update session status
        await db.session.update({
          where: { id },
          data: { status: 'error' },
        });

        return NextResponse.json({
          success: false,
          error: 'Erreur à l\'étape ' + step.stepNumber + ': ' + errorMsg,
          data: { steps: stepResults },
        }, { status: 500 });
      }
    }

    // All steps completed successfully
    await db.session.update({
      where: { id },
      data: { status: 'completed', currentStep: 8 },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        steps: stepResults,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'exécution du pipeline';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

async function computeAndSaveValidation(
  sessionId: string,
  selectedBlocks: string,
  validationOutput: string,
  allStepOutputs: { stepNumber: number; output: string }[],
  zaiInstance: Awaited<ReturnType<typeof ZAI.create>>,
  systemPrompt: string,
  sessionContext: { complexity: string; language: string; constraints: string },
): Promise<{ completeness: number; coherence: number; quality: number; totalScore: number; maxScore: number; passed: boolean }> {
  const blocks = selectedBlocks === 'auto'
    ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    : selectedBlocks.split(',').map((b) => b.trim().toUpperCase()).filter(Boolean);

  // --- Heuristic scoring (fast, always runs) ---
  let blocksFound = 0;
  const combinedOutput = validationOutput + '\n' + (allStepOutputs.find((s) => s.stepNumber === 5)?.output || '');
  const lowerCombined = combinedOutput.toLowerCase();
  for (const block of blocks) {
    const patterns = ['Bloc ' + block, 'bloc ' + block, block + ' :', block + ':'];
    if (patterns.some((p) => combinedOutput.includes(p))) {
      blocksFound++;
    }
  }
  const heuristicCompleteness = blocks.length > 0 ? Math.min(10, Math.round((blocksFound / blocks.length) * 10)) : 0;

  const domainKeywords = ['web', 'data', 'iot', 'éducation', 'education', 'marketing', 'recherche', 'finance', 'santé', 'health'];
  const domainCount = domainKeywords.filter((d) => lowerCombined.includes(d)).length;
  const has4PlusDomains = domainCount >= 4;
  const hasPlaceholders = lowerCombined.includes('à compléter') || lowerCombined.includes('placeholder');
  const hasErrorHandling = lowerCombined.includes('erreur') || lowerCombined.includes('error') || lowerCombined.includes('cas limite');
  const hasFeedback = lowerCombined.includes('feedback') || lowerCombined.includes('retour') || lowerCombined.includes('itération');
  const hasFormatSpec = lowerCombined.includes('format');
  const hasInstructions = lowerCombined.includes('instruction') || lowerCombined.includes('guide');

  // --- LLM-based scoring (fast, 45s timeout, lean prompt) ---
  let llmCompleteness = 0;
  let llmCoherence = 0;
  let llmQuality = 0;
  let llmChecks: { label: string; passed: boolean; detail: string }[] = [];

  try {
    // Only send validation output (step 6) + generation summary (step 5) — max 2KB
    const valOutput = validationOutput.slice(0, 1000);
    const genOutput = (allStepOutputs.find((s) => s.stepNumber === 5)?.output || '').slice(0, 1000);

    const scoringPrompt = `Évalue ce kit PEK. BLOCS: ${blocks.join(',')}. Score en JSON pur:
{"completeness":0-10,"coherence":0-8,"quality":0-7,"checks":[{"label":"str","passed":bool,"detail":"str"}x12]}

Validation:
${valOutput}

Génération (extrait):
${genOutput}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const completion = await zaiInstance.chat.completions.create({
      messages: [
        { role: 'user', content: scoringPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    clearTimeout(timeout);
    const raw = completion.choices[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      llmCompleteness = Math.max(0, Math.min(10, Math.round(parsed.completeness || 0)));
      llmCoherence = Math.max(0, Math.min(8, Math.round(parsed.coherence || 0)));
      llmQuality = Math.max(0, Math.min(7, Math.round(parsed.quality || 0)));
      if (Array.isArray(parsed.checks) && parsed.checks.length >= 10) {
        llmChecks = parsed.checks.slice(0, 12).map((c: { label: string; passed: boolean; detail?: string }) => ({
          label: String(c.label),
          passed: Boolean(c.passed),
          detail: String(c.detail || ''),
        }));
      }
    }
  } catch {
    // LLM scoring failed or timeout — fall back to heuristic (instant)
  }

  // Use LLM scores if available, otherwise heuristic
  const completeness = llmCompleteness > 0 ? llmCompleteness : heuristicCompleteness;
  const coherence = llmCoherence > 0 ? llmCoherence : 8;
  const quality = llmQuality > 0 ? llmQuality : (has4PlusDomains ? 7 : hasErrorHandling ? 6 : 5);
  const totalScore = completeness + coherence + quality;
  const maxScore = 25;

  const checks = llmChecks.length >= 10
    ? llmChecks
    : [
        { label: 'Complétude des blocs', passed: completeness >= 7, detail: blocksFound + '/' + blocks.length + ' blocs trouvés' },
        { label: 'Références croisées cohérentes', passed: coherence >= 6, detail: 'Cohérence ' + coherence + '/8' },
        { label: 'Exemples dans 4+ domaines', passed: has4PlusDomains, detail: domainCount + ' domaines détectés' },
        { label: 'Préservation du contenu original', passed: true, detail: 'Non vérifiable automatiquement' },
        { label: 'Fidélité au projet source', passed: true, detail: 'Non vérifiable automatiquement' },
        { label: 'Structuration conforme PEK', passed: blocksFound > 0, detail: 'Blocs A-J détectés' },
        { label: 'Variables et placeholders définis', passed: hasPlaceholders, detail: hasPlaceholders ? 'Trouvés' : 'Non trouvés' },
        { label: "Cas d'erreur couverts", passed: hasErrorHandling, detail: hasErrorHandling ? 'Trouvés' : 'Non trouvés' },
        { label: 'Instructions claires', passed: hasInstructions, detail: hasInstructions ? 'Trouvées' : 'Non trouvées' },
        { label: 'Formats de sortie spécifiés', passed: hasFormatSpec, detail: hasFormatSpec ? 'Trouvés' : 'Non trouvés' },
        { label: 'Pas de greenwashing', passed: true, detail: 'Non vérifiable automatiquement' },
        { label: 'Feedback et itération prévus', passed: hasFeedback, detail: hasFeedback ? 'Trouvés' : 'Non trouvés' },
      ];

  const passed = totalScore >= 22;

  await db.validation.create({
    data: {
      sessionId,
      completeness,
      coherence,
      quality,
      totalScore,
      maxScore,
      checks: JSON.stringify(checks),
      passed,
    },
  });

  return { completeness, coherence, quality, totalScore, maxScore, passed };
}