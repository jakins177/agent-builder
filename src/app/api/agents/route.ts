/**
 * Agents API Route
 * POST /api/agents - Create a new agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  log('POST /api/agents - Creating new agent...', 'INFO');
  
  try {
    const body = await request.json();
    log('Request body: ' + JSON.stringify(body, null, 2), 'DEBUG');
    
    const { projectId, providerId, name, systemPrompt, model } = body;

    // Validate required fields
    if (!projectId || !providerId || !name || !systemPrompt) {
      log('Missing required fields: projectId, providerId, name, systemPrompt', 'ERROR');
      return NextResponse.json(
        { error: 'Missing required fields: projectId, providerId, name, systemPrompt' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    log('Generated agent ID: ' + id, 'INFO');

    const pool = getPool();
    
    // Verify project exists
    log('Verifying project exists: ' + projectId, 'INFO');
    const [projectRows] = await pool.execute('SELECT id FROM projects WHERE id = ?', [projectId]);
    if ((projectRows as any[]).length === 0) {
      log('Project not found: ' + projectId, 'ERROR');
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify provider exists
    log('Verifying provider exists: ' + providerId, 'INFO');
    const [providerRows] = await pool.execute('SELECT id FROM providers WHERE id = ?', [providerId]);
    if ((providerRows as any[]).length === 0) {
      log('Provider not found: ' + providerId, 'ERROR');
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Insert agent into database
    log('Inserting agent into database...', 'INFO');
    await pool.execute(
      'INSERT INTO agents (id, project_id, provider_id, name, system_prompt, model) VALUES (?, ?, ?, ?, ?, ?)',
      [id, projectId, providerId, name, systemPrompt, model || 'gpt-3.5-turbo']
    );
    log('Agent inserted successfully', 'INFO');

    return NextResponse.json({
      success: true,
      data: {
        id,
        projectId,
        providerId,
        name,
        systemPrompt,
        model: model || 'gpt-3.5-turbo',
        createdAt: new Date().toISOString()
      }
    }, { status: 201 });
  } catch (error) {
    log('Error creating agent: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to create agent: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  log('GET /api/agents - Fetching agents...', 'INFO');
  
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const pool = getPool();
    
    let query = `
      SELECT 
        a.id, a.project_id, a.provider_id, a.name, a.system_prompt, a.model, a.created_at, a.updated_at, a.primary_color,
        p.name as provider_name, p.provider_type,
        pr.name as project_name
      FROM agents a
      JOIN providers p ON a.provider_id = p.id
      JOIN projects pr ON a.project_id = pr.id
    `;
    
    const params: string[] = [];
    
    if (projectId) {
      query += ' WHERE a.project_id = ?';
      params.push(projectId);
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    log('Fetching agents with query...', 'INFO');
    const [rows] = await pool.execute(query, params);
    log('Fetched ' + (rows as any[]).length + ' agents', 'INFO');

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    log('Error fetching agents: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to fetch agents: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  log('DELETE /api/agents - Deleting agent...', 'INFO');
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      log('Missing agent ID', 'ERROR');
      return NextResponse.json(
        { error: 'Missing agent ID' },
        { status: 400 }
      );
    }

    const pool = getPool();
    log('Deleting agent with ID: ' + id, 'INFO');
    
    await pool.execute('DELETE FROM agents WHERE id = ?', [id]);
    log('Agent deleted successfully', 'INFO');

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    log('Error deleting agent: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to delete agent: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  log('PUT /api/agents - Updating agent...', 'INFO');
  
  try {
    const body = await request.json();
    const { id, name, systemPrompt, model, providerId, primaryColor } = body;

    if (!id || !name || !systemPrompt) {
      log('Missing required fields: id, name, systemPrompt', 'ERROR');
      return NextResponse.json(
        { error: 'Missing required fields: id, name, systemPrompt' },
        { status: 400 }
      );
    }

    const pool = getPool();
    
    // Update agent
    await pool.execute(
      'UPDATE agents SET name = ?, system_prompt = ?, model = ?, provider_id = ?, primary_color = ?, updated_at = NOW() WHERE id = ?',
      [name, systemPrompt, model, providerId, primaryColor || '#2563EB', id]
    );
    
    log('Agent updated successfully: ' + id, 'INFO');
    return NextResponse.json({ success: true });
  } catch (error) {
    log('Error updating agent: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to update agent: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
