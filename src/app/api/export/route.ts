import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ success: false, error: 'L\'ID de session est requis' }, { status: 400 });
    }

    // Load session with steps and validations
    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        project: true,
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        validations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session non trouvée' }, { status: 404 });
    }

    // Build markdown export
    const lines: string[] = [];

    // Header
    lines.push('# Prompt-Engineering-Kit v4.0 — ' + session.title);
    lines.push('');
    lines.push('> Généré le ' + new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' }));
    lines.push('> Projet : ' + (session.project?.name || 'N/A'));
    lines.push('> Complexité : ' + session.complexity + ' | Langue : ' + session.language);
    lines.push('> Blocs sélectionnés : ' + session.selectedBlocks);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Table of contents
    lines.push('## Table des matières');
    lines.push('');
    for (const step of session.steps) {
      lines.push('- [Étape ' + step.stepNumber + ' : ' + step.name + '](#étape-' + step.stepNumber + '---' + step.name.toLowerCase().replace(/\s+/g, '-'));
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Session context
    if (session.context) {
      lines.push('## Contexte de la session');
      lines.push('');
      lines.push(session.context);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Steps
    for (const step of session.steps) {
      lines.push('## Étape ' + step.stepNumber + ' — ' + step.name);
      lines.push('');
      lines.push('> Statut : ' + step.status);
      if (step.duration > 0) {
        lines.push('> Durée : ' + step.duration + 's');
      }
      lines.push('');

      if (step.output) {
        lines.push(step.output);
      } else {
        lines.push('*Aucune sortie pour cette étape.*');
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Validation report
    if (session.validations.length > 0) {
      const validation = session.validations[0];
      lines.push('## Rapport de validation');
      lines.push('');
      lines.push('### Score global');
      lines.push('');
      lines.push('| Critère | Score | Maximum |');
      lines.push('|---------|-------|---------|');
      lines.push('| Complétude | ' + validation.completeness + ' | 10 |');
      lines.push('| Cohérence | ' + validation.coherence + ' | 8 |');
      lines.push('| Qualité | ' + validation.quality + ' | 7 |');
      lines.push('| **Total** | **' + validation.totalScore + '** | **' + validation.maxScore + '** |');
      lines.push('');

      const grade = validation.totalScore >= 22 ? 'A (Excellent)' : validation.totalScore >= 20 ? 'B (Bon)' : validation.totalScore >= 16 ? 'C (Moyen)' : 'D (Insuffisant)';
      lines.push('**Note : ' + grade + '** — ' + (validation.passed ? '✅ Validé' : '❌ Non validé'));
      lines.push('');

      // Checks
      try {
        const checks = JSON.parse(validation.checks) as Array<{ label: string; passed: boolean }>;
        if (checks.length > 0) {
          lines.push('### Vérifications détaillées');
          lines.push('');
          for (const check of checks) {
            lines.push('- ' + (check.passed ? '✅' : '❌') + ' ' + check.label);
          }
          lines.push('');
        }
      } catch {
        // Checks JSON parse error, skip
      }
    } else {
      lines.push('## Rapport de validation');
      lines.push('');
      lines.push('*Aucune validation effectuée.*');
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Généré par Prompt-Engineering-Kit v4.0 — Méthodologie Chain-of-Thought en 7 étapes*');

    const markdown = lines.join('\n');

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        title: session.title,
        markdown,
        filename: session.title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-]/g, '').replace(/\s+/g, '_') + '_PEK.md',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'export';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}