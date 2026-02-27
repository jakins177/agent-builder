
import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/test-connection';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  log('POST /api/providers/test - Testing provider connection...', 'INFO');
  
  try {
    const body = await request.json();
    const { providerType, apiKey } = body;

    if (!providerType || !apiKey) {
      return NextResponse.json(
        { error: 'Missing providerType or apiKey' },
        { status: 400 }
      );
    }

    const result = await testConnection(providerType, apiKey);
    
    if (result.success) {
      log('Provider test successful', 'INFO');
      return NextResponse.json({ success: true, message: 'Connection successful!' });
    } else {
      log('Provider test failed: ' + result.error, 'ERROR');
      return NextResponse.json({ success: false, error: result.error });
    }
  } catch (error) {
    log('Provider test error: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Test failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
