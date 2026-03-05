
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  log('POST /api/agents - Creating new agent...', 'INFO');
  
  try {
    const body = await request.json();
    const { projectId, providerId, name, systemPrompt, model, primaryColor, rateLimitEnabled, isActive } = body;

    if (!projectId || !providerId || !name || !systemPrompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = uuidv4();
    const pool = getPool();
    
    await pool.execute(
      'INSERT INTO agents (id, project_id, provider_id, name, system_prompt, model, primary_color, rate_limit_enabled, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, projectId, providerId, name, systemPrompt, model || 'gpt-3.5-turbo', primaryColor || '#2563EB', rateLimitEnabled !== false, isActive !== false]
    );

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    log('Error creating agent: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const id = searchParams.get('id');

    const pool = getPool();
    
    let query = `SELECT a.*, p.name as provider_name, p.provider_type, pr.name as project_name FROM agents a JOIN providers p ON a.provider_id = p.id JOIN projects pr ON a.project_id = pr.id`;
    const params: string[] = [];
    
    if (id) {
      query += ' WHERE a.id = ?';
      params.push(id);
    } else if (projectId) {
      query += ' WHERE a.project_id = ?';
      params.push(projectId);
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    const [rows] = await pool.execute(query, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    log('Error fetching agents: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, systemPrompt, model, providerId, primaryColor, rateLimitEnabled, isActive } = body;

    if (!id || !name || !systemPrompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const pool = getPool();
    
    await pool.execute(
      'UPDATE agents SET name = ?, system_prompt = ?, model = ?, provider_id = ?, primary_color = ?, rate_limit_enabled = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [name, systemPrompt, model, providerId, primaryColor || '#2563EB', rateLimitEnabled !== false, isActive !== false, id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    log('Error updating agent: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const pool = getPool();
    await pool.execute('DELETE FROM agents WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
