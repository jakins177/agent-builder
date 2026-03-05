
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { callLLMWithSkills } from '@/lib/llm';
import { log } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  log('POST /api/chat - Processing chat message...', 'INFO');
  
  try {
    const body = await request.json();
    const { agentId, message, history, sessionId } = body;

    if (!agentId || !message) {
      return NextResponse.json({ error: 'Missing required fields: agentId, message' }, { status: 400 });
    }

    const pool = getPool();
    
    // Get agent details
    const [agentRows] = await pool.execute(
      `SELECT a.id, a.system_prompt, a.model, a.provider_id, a.rate_limit_enabled, a.is_active, p.provider_type, p.api_key_encrypted FROM agents a JOIN providers p ON a.provider_id = p.id WHERE a.id = ?`,
      [agentId]
    );
    
    if ((agentRows as any[]).length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = (agentRows as any[])[0];

    // Check if agent is active
    if (agent.is_active === 0) { // MySQL boolean returns 0/1
      return NextResponse.json({ error: 'This agent is currently disabled.' }, { status: 403 });
    }
    
    // Rate Limiting Check
    if (agent.rate_limit_enabled) {
      const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
      if (!checkRateLimit(clientIp)) {
        return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
      }
    }

    // Save User Message
    await pool.execute('INSERT INTO chat_messages (id, agent_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)', [uuidv4(), agentId, sessionId || 'default', 'user', message]);

    // Call LLM
    const llmResult = await callLLMWithSkills({
      providerId: agent.provider_id,
      model: agent.model,
      systemPrompt: agent.system_prompt,
      userMessage: message,
      agentId: agent.id,
      history: history
    });

    if (!llmResult.success) {
      return NextResponse.json({ error: llmResult.error }, { status: 500 });
    }

    // Save Assistant Response
    await pool.execute('INSERT INTO chat_messages (id, agent_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)', [uuidv4(), agentId, sessionId || 'default', 'assistant', llmResult.response]);

    return NextResponse.json({ success: true, response: llmResult.response });

  } catch (error) {
    log('Error processing chat: ' + (error as Error).message, 'ERROR');
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) return NextResponse.json({ error: 'Missing agent ID' }, { status: 400 });

    const pool = getPool();
    const [rows] = await pool.execute('SELECT session_id, role, content, created_at FROM chat_messages WHERE agent_id = ? ORDER BY created_at DESC LIMIT 100', [agentId]);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
