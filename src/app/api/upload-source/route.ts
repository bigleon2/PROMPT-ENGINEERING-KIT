import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.json', '.yaml', '.yml',
  '.js', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go', '.rs',
  '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
  '.html', '.htm', '.css', '.scss', '.less', '.xml',
  '.sql', '.sh', '.bash', '.zsh', '.ps1',
  '.toml', '.ini', '.cfg', '.conf', '.env', '.gitignore',
  '.csv', '.log', '.vue', '.svelte', '.astro',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\r?\n?/, '');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum 5 Mo.` },
        { status: 400 }
      );
    }

    const ext = getExtension(file.name);
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Format non supporte: "${ext}". Formats acceptes: ${ALLOWED_EXTENSIONS.filter(e => e.length <= 5).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const rawContent = await file.text();
    const content = stripFrontmatter(rawContent).trim();

    if (content.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Le fichier est vide ou ne contient que des metadonnees.' },
        { status: 400 }
      );
    }

    let detectedFormat = 'text';
    if (ext === '.json') detectedFormat = 'json';
    else if (ext === '.yaml' || ext === '.yml') detectedFormat = 'yaml';
    else if (ext === '.md' || ext === '.markdown') detectedFormat = 'markdown';
    else if (['.js', '.ts', '.tsx', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.vue', '.svelte', '.astro'].includes(ext)) detectedFormat = 'code';

    return NextResponse.json({
      success: true,
      data: {
        content,
        filename: file.name,
        size: file.size,
        format: detectedFormat,
        lines: content.split('\n').length,
        chars: content.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors du chargement du fichier';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}