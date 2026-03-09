import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';
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
