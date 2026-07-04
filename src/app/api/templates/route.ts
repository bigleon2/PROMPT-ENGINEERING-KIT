import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const templates = await db.template.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la récupération des modèles';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, systemPrompt, blocks } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Le nom du modèle est requis' }, { status: 400 });
    }

    if (!systemPrompt || typeof systemPrompt !== 'string') {
      return NextResponse.json({ success: false, error: 'Le system prompt est requis' }, { status: 400 });
    }

    const template = await db.template.create({
      data: {
        name,
        description: description || '',
        systemPrompt,
        blocks: blocks || 'A,C,E,G,H',
        isDefault: false,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création du modèle';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}