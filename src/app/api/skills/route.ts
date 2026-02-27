
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';

export async function GET() {
  log('GET /api/skills - Fetching all skills...', 'INFO');
  
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, name, description, skill_key, config_schema, created_at FROM skills ORDER BY name ASC'
    );
    
    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    log('Error fetching skills: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to fetch skills: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
