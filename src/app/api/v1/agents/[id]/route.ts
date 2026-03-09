import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';
import { authenticateApi } from '@/lib/auth-api';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticateApi(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM agents WHERE id = ?', [id]);
    const agent = (rows as any[])[0];

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    log(`API GET /agents error: ` + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticateApi(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const pool = getPool();
    
    // Check if agent exists
    const [existingRows] = await pool.execute('SELECT * FROM agents WHERE id = ?', [id]);
    const existing = (existingRows as any[])[0];
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Merge old with new (ensure no undefined gets passed to mysql2)
    const project_id = body.project_id !== undefined ? body.project_id : (existing.project_id ?? null);
    const provider_id = body.provider_id !== undefined ? body.provider_id : (existing.provider_id ?? null);
    const name = body.name !== undefined ? body.name : (existing.name ?? null);
    const system_prompt = body.system_prompt !== undefined ? body.system_prompt : (existing.system_prompt ?? null);
    const model = body.model !== undefined ? body.model : (existing.model ?? null);
    const primary_color = body.primary_color !== undefined ? body.primary_color : (existing.primary_color ?? null);
    const rate_limit_enabled = body.rate_limit_enabled !== undefined ? (body.rate_limit_enabled ? 1 : 0) : existing.rate_limit_enabled;
    const is_active = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;

    await pool.execute(
      `UPDATE agents SET 
        project_id = ?, 
        provider_id = ?, 
        name = ?, 
        system_prompt = ?, 
        model = ?, 
        primary_color = ?, 
        rate_limit_enabled = ?, 
        is_active = ?
      WHERE id = ?`,
      [project_id, provider_id, name, system_prompt, model, primary_color, rate_limit_enabled, is_active, id]
    );

    const [updatedRows] = await pool.execute('SELECT * FROM agents WHERE id = ?', [id]);
    const updated = (updatedRows as any[])[0];

    log(`API PUT /agents/${id}: Updated agent`, 'INFO');
    return NextResponse.json({ success: true, agent: updated });
  } catch (error) {
    log(`API PUT /agents error: ` + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authenticateApi(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM agents WHERE id = ?', [id]);
    
    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    log(`API DELETE /agents/${id}: Deleted agent`, 'INFO');
    return NextResponse.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    log(`API DELETE /agents error: ` + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
