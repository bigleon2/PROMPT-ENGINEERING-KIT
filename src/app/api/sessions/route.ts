import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const COT_STEP_NAMES = [
  'COMPRÉHENSION',
  'DÉCOMPOSITION',
  'EXTRACTION',
  'STRUCTURATION',
  'GÉNÉRATION',
  'VALIDATION',
  'AMÉLIORATION',
];

const CHAINING_STEP_NAMES = [
  'PRÉPARATION',
  'TRAITEMENT',
  'VÉRIFICATION',
  'OPTIMISATION',
];

export async function GET() {
  try {
    const sessions = await db.session.findMany({
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la récupération des sessions';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      projectId,
      context,
      sourceMaterial,
      results,
      constraints,
      inputFormat,
      selectedBlocks,
      complexity,
      language,
      executionMode,
    } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ success: false, error: 'Le titre est requis' }, { status: 400 });
    }

    // If no projectId provided, create a default project
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const project = await db.project.create({
        data: {
          name: title,
          description: 'Projet créé automatiquement pour la session: ' + title,
          projectType: 'web',
          status: 'active',
        },
      });
      targetProjectId = project.id;
    } else {
      // Verify project exists
      const existingProject = await db.project.findUnique({ where: { id: targetProjectId } });
      if (!existingProject) {
        return NextResponse.json({ success: false, error: 'Projet non trouvé' }, { status: 404 });
      }
    }

    // Determine step names based on execution mode
    const mode = executionMode || 'cot';
    const stepNames = (mode === 'chaining') ? CHAINING_STEP_NAMES : COT_STEP_NAMES;

    // Create session with default steps
    const session = await db.session.create({
      data: {
        title,
        projectId: targetProjectId,
        context: context || '',
        sourceMaterial: sourceMaterial || '',
        results: results || '',
        constraints: constraints || '',
        inputFormat: inputFormat || 'markdown',
        selectedBlocks: selectedBlocks || 'A,C,E,G,H',
        complexity: complexity || 'moyen',
        language: language || 'fr',
        executionMode: mode,
        status: 'in_progress',
        currentStep: 1,
        steps: {
          create: stepNames.map((name, index) => ({
            stepNumber: index + 1,
            name,
            status: 'pending',
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création de la session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}