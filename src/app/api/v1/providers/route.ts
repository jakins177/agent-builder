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
    // NEVER return api_key_encrypted in the API!
    const [rows] = await pool.execute('SELECT id, name, provider_type, is_active FROM providers ORDER BY created_at DESC');
    return NextResponse.json({ success: true, providers: rows });
  } catch (error) {
    log('API GET /providers error: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
