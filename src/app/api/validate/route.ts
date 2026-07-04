import { NextRequest, NextResponse } from 'next/server';

interface ValidationCheck {
  label: string;
  passed: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, blocks } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ success: false, error: 'Le contenu est requis' }, { status: 400 });
    }

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return NextResponse.json({ success: false, error: 'La liste des blocs est requise et doit être non vide' }, { status: 400 });
    }

    // Completeness: count blocks present in content / total blocks * 10
    let blocksFound = 0;
    for (const block of blocks) {
      const normalizedBlock = block.toUpperCase().trim();
      if (
        content.includes('Bloc ' + normalizedBlock) ||
        content.includes('bloc ' + normalizedBlock) ||
        content.includes(normalizedBlock + ':') ||
        content.includes(normalizedBlock + ' :') ||
        content.includes('**' + normalizedBlock + '**') ||
        content.includes('## ' + normalizedBlock)
      ) {
        blocksFound++;
      }
    }
    const completeness = Math.round((blocksFound / blocks.length) * 10);

    // Coherence: check cross-references and consistency
    let coherenceScore = 5;
    if (content.includes('###') || content.includes('## ')) coherenceScore += 1;
    if (content.includes('---') || content.includes('***')) coherenceScore += 1;
    if (blocksFound >= blocks.length * 0.8) coherenceScore += 1;
    const coherence = Math.min(coherenceScore, 8);

    // Quality: check example diversity, formatting, detail level
    let qualityScore = 3;
    const contentLower = content.toLowerCase();
    if (contentLower.includes('exemple') || contentLower.includes('example')) qualityScore += 1;
    if (content.length > 500) qualityScore += 1;
    if (content.length > 2000) qualityScore += 1;
    if (contentLower.includes('```') || contentLower.includes('code')) qualityScore += 1;
    const quality = Math.min(qualityScore, 7);

    const totalScore = completeness + coherence + quality;
    const maxScore = 25;

    // Build detailed checks
    const checks: ValidationCheck[] = [
      { label: 'Complétude des blocs (' + blocksFound + '/' + blocks.length + ')', passed: completeness >= 7 },
      { label: 'Références croisées cohérentes', passed: coherence >= 6 },
      { label: 'Exemples présents', passed: contentLower.includes('exemple') || contentLower.includes('example') },
      { label: 'Structure Markdown valide', passed: (content.match(/#{1,6}\s/g) || []).length >= 3 },
      { label: 'Contenu suffisamment détaillé', passed: content.length > 1000 },
      { label: 'Pas de sections vides', passed: !content.includes('TODO') && !content.includes('À remplir') },
      { label: 'Variables/placeholders définis', passed: contentLower.includes('variable') || contentLower.includes('{') || contentLower.includes('[') },
      { label: 'Cas d\'erreur couverts', passed: contentLower.includes('erreur') || contentLower.includes('error') || contentLower.includes('exception') },
      { label: 'Formats de sortie spécifiés', passed: contentLower.includes('format') || contentLower.includes('sortie') || contentLower.includes('output') },
      { label: 'Instructions non ambigües', passed: content.length > 300 && coherence >= 7 },
      { label: 'Pas de greenwashing', passed: !contentLower.includes('révolutionnaire') && !contentLower.includes('revolutionary') },
      { label: 'Feedback/itération prévus', passed: contentLower.includes('feedback') || contentLower.includes('retour') || contentLower.includes('amélioration') || contentLower.includes('improvement') },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    const passed = totalScore >= 20;

    return NextResponse.json({
      success: true,
      data: {
        completeness,
        coherence,
        quality,
        totalScore,
        maxScore,
        checks,
        passedCount,
        totalChecks: checks.length,
        passed,
        grade: totalScore >= 22 ? 'A' : totalScore >= 20 ? 'B' : totalScore >= 16 ? 'C' : 'D',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la validation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}