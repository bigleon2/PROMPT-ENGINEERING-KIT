import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await db.template.findUnique({ where: { id } });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Modèle non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la récupération du modèle';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await db.template.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ success: false, error: 'Modèle non trouvé' }, { status: 404 });
    }

    if (template.isDefault) {
      return NextResponse.json({ success: false, error: 'Impossible de supprimer un modèle par défaut' }, { status: 403 });
    }

    await db.template.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression du modèle';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}