import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'upload', 'knowledge_extracted_new', 'KNOWLEDGE.md');
    const content = await readFile(filePath, 'utf-8');

    // Parse agents (sections #### `name`)
    const agents: { name: string; description: string; type: string }[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const agentMatch = lines[i].match(/^#### `([^`]+)`/);
      if (agentMatch) {
        const name = agentMatch[1];
        let description = '';
        let type = 'générique';

        if (i + 1 < lines.length) {
          const specMatch = lines[i + 1].match(/- \*\*Spécialisation\*\* : (.+)/);
          if (specMatch) description = specMatch[1];
        }

        if (
          name.includes('tsi-expert') ||
          name.includes('kontrol') ||
          name.includes('python-executor') ||
          name.includes('pdf-expert') ||
          name.includes('image-analyst') ||
          name.includes('auto-tagger') ||
          name.includes('coding-agent') ||
          name.includes('buildSystemPrompt')
        ) {
          type = 'spécialisé';
        }

        agents.push({ name, description, type });
      }
    }

    // Parse skills from section 5.3
    const skills: { name: string; description: string; category: string }[] = [];
    const skillCategoryRegex = /^\d+\.\s+\*\*([^*]+)\*\*\s*—\s*\d+ skill\w*\s*:\s*`([^`]+)`/gm;
    let match;

    while ((match = skillCategoryRegex.exec(content)) !== null) {
      const category = match[1].trim();
      const skillNames = match[2].split(',').map((s) => s.trim().replace(/`/g, ''));
      for (const skillName of skillNames) {
        skills.push({ name: skillName, description: '', category });
      }
    }

    return NextResponse.json({ success: true, data: { agents, skills } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Knowledge non disponible' },
      { status: 500 }
    );
  }
}