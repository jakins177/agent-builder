/**
 * Provider Models API Route
 * GET /api/providers/models - List available models for a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchProviderModels } from '@/lib/llm';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  log('GET /api/providers/models - Fetching models...', 'INFO');
  
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      log('Missing provider ID', 'ERROR');
      return NextResponse.json(
        { error: 'Missing provider ID' },
        { status: 400 }
      );
    }

    const models = await fetchProviderModels(providerId);
    
    return NextResponse.json({
      success: true,
      data: models
    });
  } catch (error) {
    log('Error fetching models: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to fetch models: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
