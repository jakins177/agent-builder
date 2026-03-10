import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { authenticateApi } from '@/lib/auth-api';

export async function GET(req: NextRequest) {
  if (!authenticateApi(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT id, name, description, created_at FROM projects ORDER BY created_at DESC');
    return NextResponse.json({ success: true, projects: rows });
  } catch (error) {
    log('API GET /projects error: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authenticateApi(req)) {
    return NextResponse.json({ error: 'Unauthorized. Invalid API Key.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const id = uuidv4();
    const pool = getPool();
    
    await pool.execute(
      'INSERT INTO projects (id, name, description) VALUES (?, ?, ?)',
      [id, name, description || null]
    );

    const [rows] = await pool.execute('SELECT * FROM projects WHERE id = ?', [id]);
    const project = (rows as any[])[0];

    log(`API POST /projects: Created project ${id}`, 'INFO');
    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    log('API POST /projects error: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
