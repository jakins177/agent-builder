import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { authenticateApi } from '@/lib/auth-api';

// GET all agents
export async function GET(req: NextRequest) {
  if (!authenticateApi(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM agents ORDER BY created_at DESC');
    return NextResponse.json({ success: true, agents: rows });
  } catch (error) {
    log('API GET /agents error: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST new agent
export async function POST(req: NextRequest) {
  if (!authenticateApi(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      project_id, 
      provider_id, 
      name, 
      system_prompt, 
      model = 'gpt-3.5-turbo', 
      primary_color = '#2563EB', 
      rate_limit_enabled = true, 
      is_active = true 
    } = body;

    if (!project_id || !provider_id || !name || !system_prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, provider_id, name, system_prompt' }, 
        { status: 400 }
      );
    }

    const id = uuidv4();
    const pool = getPool();
    
    await pool.execute(
      `INSERT INTO agents (
        id, project_id, provider_id, name, system_prompt, model, primary_color, rate_limit_enabled, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project_id, provider_id, name, system_prompt, model, primary_color, rate_limit_enabled ? 1 : 0, is_active ? 1 : 0]
    );

    const [newAgentRows] = await pool.execute('SELECT * FROM agents WHERE id = ?', [id]);
    const newAgent = (newAgentRows as any[])[0];

    log(`API POST /agents: Created agent ${id}`, 'INFO');
    return NextResponse.json({ success: true, agent: newAgent }, { status: 201 });
  } catch (error) {
    log('API POST /agents error: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
