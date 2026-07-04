import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.session.findUnique({
      where: { id },
      include: {
        project: true,
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        validations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la récupération de la session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.session.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session non trouvée' }, { status: 404 });
    }

    // Cascade delete is handled by Prisma schema (onDelete: Cascade on steps, validations)
    await db.session.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression de la session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}