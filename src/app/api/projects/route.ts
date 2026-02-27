/**
 * Projects API Route
 * POST /api/projects - Create a new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  log('POST /api/projects - Creating new project...', 'INFO');
  
  try {
    const body = await request.json();
    log('Request body: ' + JSON.stringify(body, null, 2), 'DEBUG');
    
    const { name, description } = body;

    // Validate required fields
    if (!name) {
      log('Missing required field: name', 'ERROR');
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    log('Generated project ID: ' + id, 'INFO');

    const pool = getPool();
    
    // Insert project into database
    log('Inserting project into database...', 'INFO');
    await pool.execute(
      'INSERT INTO projects (id, name, description) VALUES (?, ?, ?)',
      [id, name, description || null]
    );
    log('Project inserted successfully', 'INFO');

    return NextResponse.json({
      success: true,
      data: {
        id,
        name,
        description: description || null,
        createdAt: new Date().toISOString()
      }
    }, { status: 201 });
  } catch (error) {
    log('Error creating project: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to create project: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  log('GET /api/projects - Fetching projects...', 'INFO');
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const pool = getPool();

    if (id) {
      log('Fetching project with ID: ' + id, 'INFO');
      const [rows] = await pool.execute(
        'SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?',
        [id]
      );
      
      if ((rows as any[]).length === 0) {
        log('Project not found: ' + id, 'WARN');
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: (rows as any[])[0]
      });
    }

    log('Fetching all projects...', 'INFO');
    const [rows] = await pool.execute(
      'SELECT id, name, description, created_at, updated_at FROM projects ORDER BY created_at DESC'
    );
    log('Fetched ' + (rows as any[]).length + ' projects', 'INFO');

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    log('Error fetching projects: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to fetch projects: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  log('DELETE /api/projects - Deleting project...', 'INFO');
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      log('Missing project ID', 'ERROR');
      return NextResponse.json(
        { error: 'Missing project ID' },
        { status: 400 }
      );
    }

    const pool = getPool();
    log('Deleting project with ID: ' + id, 'INFO');
    
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
    log('Project deleted successfully', 'INFO');

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    log('Error deleting project: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to delete project: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
