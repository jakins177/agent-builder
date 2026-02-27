/**
 * Database setup API route
 * GET /api/setup - Initialize database schema
 */

import { NextResponse } from 'next/server';
import { setupDatabase } from '@/lib/schema';
import { testConnection } from '@/lib/db';
import { log } from '@/lib/logger';

export async function GET() {
  log('GET /api/setup - Setting up database...', 'INFO');
  
  try {
    log('Testing database connection...', 'INFO');
    const connected = await testConnection();
    
    if (!connected) {
      log('Database connection failed', 'ERROR');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed. Please check your MySQL configuration.' 
        },
        { status: 500 }
      );
    }

    log('Connection successful, setting up schema...', 'INFO');
    await setupDatabase();
    log('Database setup completed successfully', 'INFO');

    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully',
      tables: ['providers', 'projects', 'agents']
    });

  } catch (error) {
    log('Database setup failed: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database setup failed: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}
