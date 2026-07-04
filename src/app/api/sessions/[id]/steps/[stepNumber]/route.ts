import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stepNumber: string }> }
) {
  try {
    const { id, stepNumber } = await params;
    const stepNum = parseInt(stepNumber, 10);

    if (isNaN(stepNum) || stepNum < 1 || stepNum > 7) {
      return NextResponse.json({ success: false, error: 'Numéro d\'étape invalide (1-7)' }, { status: 400 });
    }

    const step = await db.step.findFirst({
      where: {
        sessionId: id,
        stepNumber: stepNum,
      },
    });

    if (!step) {
      return NextResponse.json({ success: false, error: 'Étape non trouvée pour cette session' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la récupération de l\'étape';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepNumber: string }> }
) {
  try {
    const { id, stepNumber } = await params;
    const stepNum = parseInt(stepNumber, 10);

    if (isNaN(stepNum) || stepNum < 1 || stepNum > 7) {
      return NextResponse.json({ success: false, error: 'Numéro d\'étape invalide (1-7)' }, { status: 400 });
    }

    const body = await request.json();
    const { status, output, duration } = body;

    const step = await db.step.findFirst({
      where: {
        sessionId: id,
        stepNumber: stepNum,
      },
    });

    if (!step) {
      return NextResponse.json({ success: false, error: 'Étape non trouvée pour cette session' }, { status: 404 });
    }

    const validStatuses = ['pending', 'running', 'completed', 'error', 'skipped'];
    const updateData: { status?: string; output?: string; duration?: number } = {};

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Statut invalide. Valeurs acceptées: ' + validStatuses.join(', ') },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (output !== undefined) {
      updateData.output = output;
    }

    if (duration !== undefined) {
      updateData.duration = typeof duration === 'number' ? duration : parseInt(duration, 10) || 0;
    }

    const updatedStep = await db.step.update({
      where: { id: step.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedStep });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'étape';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}