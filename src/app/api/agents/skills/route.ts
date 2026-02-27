
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';
import { encrypt, decrypt } from '@/lib/encryption';
import { v4 as uuidv4 } from 'uuid';

// GET /api/agents/skills?agentId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
    }

    const pool = getPool();
    
    // Get all available skills
    const [allSkills] = await pool.execute('SELECT * FROM skills');
    
    // Get enabled skills for this agent
    const [agentSkills] = await pool.execute(
      'SELECT skill_id, config_encrypted, enabled FROM agent_skills WHERE agent_id = ?',
      [agentId]
    );

    const agentSkillMap = new Map();
    (agentSkills as any[]).forEach(ask => {
      agentSkillMap.set(ask.skill_id, ask);
    });

    const result = (allSkills as any[]).map(skill => {
      const agentSkill = agentSkillMap.get(skill.id);
      let config = {};
      
      // Parse config_schema JSON string from DB
      let parsedSchema = {};
      try {
        if (skill.config_schema) {
          parsedSchema = typeof skill.config_schema === 'string' 
            ? JSON.parse(skill.config_schema) 
            : skill.config_schema;
        }
      } catch (e) {
        log('Failed to parse skill config_schema', 'ERROR');
      }
      
      if (agentSkill && agentSkill.config_encrypted) {
        try {
          const decrypted = decrypt(agentSkill.config_encrypted);
          config = JSON.parse(decrypted);
        } catch (e) {
          log('Failed to decrypt config for skill ' + skill.name, 'ERROR');
        }
      }

      return {
        ...skill,
        config_schema: parsedSchema,
        enabled: agentSkill ? !!agentSkill.enabled : false,
        config: config
      };
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    log('Error fetching agent skills: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/agents/skills
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, skillId, enabled, config } = body;

    if (!agentId || !skillId) {
      return NextResponse.json({ error: 'Missing agentId or skillId' }, { status: 400 });
    }

    const pool = getPool();
    
    // Encrypt config
    const configStr = JSON.stringify(config || {});
    const configEncrypted = encrypt(configStr);

    // Check if entry exists
    const [existing] = await pool.execute(
      'SELECT id FROM agent_skills WHERE agent_id = ? AND skill_id = ?',
      [agentId, skillId]
    );

    if ((existing as any[]).length > 0) {
      // Update
      await pool.execute(
        'UPDATE agent_skills SET enabled = ?, config_encrypted = ?, updated_at = NOW() WHERE agent_id = ? AND skill_id = ?',
        [enabled, configEncrypted, agentId, skillId]
      );
    } else {
      // Insert
      const id = uuidv4();
      await pool.execute(
        'INSERT INTO agent_skills (id, agent_id, skill_id, enabled, config_encrypted) VALUES (?, ?, ?, ?, ?)',
        [id, agentId, skillId, enabled, configEncrypted]
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    log('Error saving agent skill: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
