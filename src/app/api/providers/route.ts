/**
 * Providers API Route
 * POST /api/providers - Create a new provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  log('POST /api/providers - Creating new provider...', 'INFO');
  
  try {
    const body = await request.json();
    log('Request body: ' + JSON.stringify(body, null, 2), 'DEBUG');
    
    const { name, providerType, apiKey } = body;

    // Validate required fields
    if (!name || !providerType || !apiKey) {
      log('Missing required fields: name, providerType, apiKey', 'ERROR');
      return NextResponse.json(
        { error: 'Missing required fields: name, providerType, apiKey' },
        { status: 400 }
      );
    }

    // Validate provider type
    const validTypes = ['google', 'openai', 'minimax'];
    if (!validTypes.includes(providerType)) {
      log('Invalid provider type: ' + providerType, 'ERROR');
      return NextResponse.json(
        { error: 'Invalid provider type. Must be one of: google, openai, minimax' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    log('Generated provider ID: ' + id, 'INFO');

    // Encrypt API key
    log('Encrypting API key...', 'INFO');
    const apiKeyEncrypted = encrypt(apiKey);
    log('API key encrypted successfully', 'INFO');

    const pool = getPool();
    
    // Insert provider into database
    log('Inserting provider into database...', 'INFO');
    await pool.execute(
      'INSERT INTO providers (id, name, provider_type, api_key_encrypted, is_active) VALUES (?, ?, ?, ?, TRUE)',
      [id, name, providerType, apiKeyEncrypted]
    );
    log('Provider inserted successfully', 'INFO');

    return NextResponse.json({
      success: true,
      data: {
        id,
        name,
        providerType,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    }, { status: 201 });
  } catch (error) {
    log('Error creating provider: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to create provider: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  log('GET /api/providers - Fetching all providers...', 'INFO');
  
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, name, provider_type, is_active, created_at, updated_at FROM providers ORDER BY created_at DESC'
    );
    log('Fetched ' + (rows as any[]).length + ' providers', 'INFO');

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    log('Error fetching providers: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to fetch providers: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  log('PUT /api/providers - Updating provider...', 'INFO');
  
  try {
    const body = await request.json();
    const { id, name, providerType, apiKey } = body;

    if (!id || !name || !providerType) {
      log('Missing required fields: id, name, providerType', 'ERROR');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pool = getPool();
    
    // Validate provider type
    const validTypes = ['google', 'openai', 'minimax'];
    if (!validTypes.includes(providerType)) {
      log('Invalid provider type: ' + providerType, 'ERROR');
      return NextResponse.json(
        { error: 'Invalid provider type' },
        { status: 400 }
      );
    }

    // If API key is provided, update it. Otherwise keep existing.
    if (apiKey) {
      log('Encrypting new API key...', 'INFO');
      const apiKeyEncrypted = encrypt(apiKey);
      await pool.execute(
        'UPDATE providers SET name = ?, provider_type = ?, api_key_encrypted = ?, updated_at = NOW() WHERE id = ?',
        [name, providerType, apiKeyEncrypted, id]
      );
    } else {
      await pool.execute(
        'UPDATE providers SET name = ?, provider_type = ?, updated_at = NOW() WHERE id = ?',
        [name, providerType, id]
      );
    }
    
    log('Provider updated successfully', 'INFO');

    return NextResponse.json({
      success: true,
      message: 'Provider updated successfully'
    });
  } catch (error) {
    log('Error updating provider: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to update provider: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
