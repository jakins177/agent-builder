/**
 * Chat API Route
 * POST /api/chat - Send a message to an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { callLLMWithSkills } from '@/lib/llm';
import { log } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  log('POST /api/chat - Processing chat message...', 'INFO');
  
  try {
    const body = await request.json();
    log('Request body: ' + JSON.stringify(body, null, 2), 'DEBUG');
    
    const { agentId, message, history, sessionId } = body;

    // Validate required fields
    if (!agentId || !message) {
      log('Missing required fields: agentId, message', 'ERROR');
      return NextResponse.json(
        { error: 'Missing required fields: agentId, message' },
        { status: 400 }
      );
    }

    const pool = getPool();
    
    // Get agent details with provider info
    log('Fetching agent details: ' + agentId, 'INFO');
    const [agentRows] = await pool.execute(
      `SELECT 
        a.id, a.system_prompt, a.model, a.provider_id,
        p.provider_type, p.api_key_encrypted
       FROM agents a
       JOIN providers p ON a.provider_id = p.id
       WHERE a.id = ?`,
      [agentId]
    );
    
    if ((agentRows as any[]).length === 0) {
      log('Agent not found: ' + agentId, 'ERROR');
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = (agentRows as any[])[0];
    
    // Save User Message to DB
    const userMsgId = uuidv4();
    await pool.execute(
      'INSERT INTO chat_messages (id, agent_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, agentId, sessionId || 'default', 'user', message]
    );

    // Call the appropriate LLM provider with skills
    log('Calling LLM provider with skills...', 'INFO');
    const llmResult = await callLLMWithSkills({
      providerId: agent.provider_id,
      model: agent.model,
      systemPrompt: agent.system_prompt,
      userMessage: message,
      agentId: agent.id,
      history: history // Pass chat history if available
    });

    if (!llmResult.success) {
      log('LLM call failed: ' + llmResult.error, 'ERROR');
      return NextResponse.json(
        { error: llmResult.error },
        { status: 500 }
      );
    }

    // Save Assistant Response to DB
    const assistantMsgId = uuidv4();
    await pool.execute(
      'INSERT INTO chat_messages (id, agent_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)',
      [assistantMsgId, agentId, sessionId || 'default', 'assistant', llmResult.response]
    );

    log('Chat processing successful', 'INFO');
    return NextResponse.json({
      success: true,
      response: llmResult.response
    });

  } catch (error) {
    log('Error processing chat: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to process chat: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  log('GET /api/chat - Fetching chat history...', 'INFO');
  
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      log('Missing agent ID', 'ERROR');
      return NextResponse.json(
        { error: 'Missing agent ID' },
        { status: 400 }
      );
    }

    const pool = getPool();
    
    // Fetch messages grouped by session
    const [rows] = await pool.execute(
      `SELECT session_id, role, content, created_at 
       FROM chat_messages 
       WHERE agent_id = ? 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [agentId]
    );

    log('Chat history fetched: ' + (rows as any[]).length + ' messages', 'INFO');
    return NextResponse.json({
      success: true,
      data: rows
    });

  } catch (error) {
    log('Error fetching chat history: ' + (error as Error).message, 'ERROR');
    return NextResponse.json(
      { error: 'Failed to fetch chat history: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
