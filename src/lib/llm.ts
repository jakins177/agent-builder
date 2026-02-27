/**
 * LLM Provider utilities
 * Handles API calls to different LLM providers (Google Gemini, OpenAI, Minimax)
 */

import { decrypt } from './encryption';
import { getPool } from './db';
import { log } from '@/lib/logger';
import { executeSkill, getSkillTools } from './skills';

export interface LLMRequest {
  providerId: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  agentId?: string; // Optional for skills
  history?: any[]; // Full message history for context
  tools?: any[]; // Tools definition for the provider
}

export interface LLMResponse {
  success: boolean;
  response?: string;
  error?: string;
  toolCalls?: any[]; // If the model wants to call a tool
}

// In-memory cache for model lists
interface ModelCacheEntry {
  models: string[];
  timestamp: number;
}
const modelCache = new Map<string, ModelCacheEntry>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function fetchProviderModels(providerId: string): Promise<string[]> {
  // ... (Same implementation as before, abbreviated for clarity)
  // Re-implementing fully to avoid losing code
  log('Fetching models for provider: ' + providerId, 'INFO');

  const cached = modelCache.get(providerId);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.models;
  }

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, provider_type, api_key_encrypted FROM providers WHERE id = ? AND is_active = TRUE',
      [providerId]
    );
    
    if ((rows as any[]).length === 0) return [];

    const provider = (rows as any[])[0];
    const apiKey = decrypt(provider.api_key_encrypted);
    let models: string[] = [];

    if (provider.provider_type === 'openai') {
      models = await fetchOpenAIModels(apiKey);
    } else if (provider.provider_type === 'google') {
      models = await fetchGeminiModels(apiKey);
    } else if (provider.provider_type === 'minimax') {
      models = await fetchMinimaxModels(apiKey);
    }

    modelCache.set(providerId, { models, timestamp: Date.now() });
    return models;
  } catch (error) {
    log('Error fetching models: ' + (error as Error).message, 'ERROR');
    return [];
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await response.json();
    return data.data
      .filter((m: any) => m.id.startsWith('gpt-'))
      .map((m: any) => m.id)
      .sort();
  } catch (e) { return []; }
}

async function fetchGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    const data = await response.json();
    return data.models
      .map((m: any) => m.name.replace('models/', ''))
      .filter((name: string) => name.includes('gemini'))
      .sort();
  } catch (e) { return []; }
}

async function fetchMinimaxModels(apiKey: string): Promise<string[]> {
  return [
    'MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2.1',
    'MiniMax-M2.1-highspeed', 'MiniMax-M2', 'abab6.5-chat', 'abab6-chat', 'minimax-chat'
  ];
}

// --- CORE LLM CALL ---

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  log('Starting LLM call...', 'INFO');
  
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT id, provider_type, api_key_encrypted FROM providers WHERE id = ? AND is_active = TRUE',
      [request.providerId]
    );
    
    if ((rows as any[]).length === 0) {
      return { success: false, error: 'Provider not found or inactive' };
    }

    const provider = (rows as any[])[0];
    const apiKey = decrypt(provider.api_key_encrypted);

    switch (provider.provider_type) {
      case 'openai':
        return await callOpenAI(apiKey, request);
      case 'google':
        // For MVP, Gemini doesn't support tools yet in this impl
        const geminiResp = await callGoogleGemini(apiKey, request.model, request.systemPrompt, request.userMessage);
        return { success: true, response: geminiResp };
      case 'minimax':
        const minimaxResp = await callMinimax(apiKey, request.model, request.systemPrompt, request.userMessage);
        return { success: true, response: minimaxResp };
      default:
        return { success: false, error: 'Unknown provider type: ' + provider.provider_type };
    }
  } catch (error) {
    log('LLM call failed: ' + (error as Error).message, 'ERROR');
    return { success: false, error: (error as Error).message };
  }
}

async function callOpenAI(apiKey: string, request: LLMRequest): Promise<LLMResponse> {
  log('Calling OpenAI API with tools...', 'INFO');
  
  const messages = request.history || [
    { role: 'system', content: request.systemPrompt },
    { role: 'user', content: request.userMessage }
  ];

  const body: any = {
    model: request.model || 'gpt-3.5-turbo',
    messages: messages,
    max_tokens: 1000,
    temperature: 0.7
  };

  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  
  if (!message) throw new Error('OpenAI returned empty response');

  if (message.tool_calls) {
    log('OpenAI requested tool calls: ' + message.tool_calls.length, 'INFO');
    return { success: true, toolCalls: message.tool_calls, response: message.content }; // Content might be null
  }

  return { success: true, response: message.content };
}

async function callGoogleGemini(apiKey: string, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  // Existing Gemini implementation
  const geminiModel = model || 'gemini-pro';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents: [{ parts: [{ text: userMessage }], role: 'user' }],
    generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
  };

  if (systemPrompt) {
    requestBody.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callMinimax(apiKey: string, model: string, systemPrompt: string, userMessage: string): Promise<string> {
  // Existing Minimax implementation
  const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'minimax-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Minimax API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// --- SKILL EXECUTION ENGINE ---

export async function callLLMWithSkills(request: LLMRequest): Promise<LLMResponse> {
  const { providerId, model, systemPrompt, userMessage, agentId } = request;
  
  // 1. Get Enabled Tools
  let tools: any[] = [];
  let enabledSkillKeys: Set<string> = new Set();
  
  if (agentId) {
    try {
      const pool = getPool();
      const [rows] = await pool.execute(
        `SELECT s.skill_key 
         FROM agent_skills as as_table
         JOIN skills s ON as_table.skill_id = s.id 
         WHERE as_table.agent_id = ? AND as_table.enabled = TRUE`,
        [agentId]
      );
      
      (rows as any[]).forEach(row => enabledSkillKeys.add(row.skill_key));
    } catch (e) {
      log('Error fetching agent skills: ' + (e as Error).message, 'ERROR');
    }
  }

  // Filter tools based on enabled skills
  // Mapping function names to skill keys
  const FUNCTION_MAP: Record<string, string> = {
    'send_email': 'email_sender'
  };

  if (enabledSkillKeys.size > 0) {
    const allTools = getSkillTools();
    tools = allTools.filter(t => {
      const skillKey = FUNCTION_MAP[t.function.name];
      return skillKey && enabledSkillKeys.has(skillKey);
    });
    log(`Injecting ${tools.length} tools for agent ${agentId}`, 'INFO');
  }

  // 2. Prepare History for Loop
  let history: any[] = [
    { role: 'system', content: systemPrompt },
    ...(request.history || []), // Inject previous messages if available
    { role: 'user', content: userMessage }
  ];

  // 3. First Call
  let response = await callLLM({ ...request, history, tools });

  // 4. Handle Tool Calls (Loop)
  // We limit loop to 5 turns to prevent infinite loops
  let turns = 0;
  while (response.success && response.toolCalls && turns < 5) {
    turns++;
    log(`Processing tool calls (Turn ${turns})...`, 'INFO');
    
    // Append Assistant Message with Tool Calls
    history.push({
      role: 'assistant',
      content: response.response || null,
      tool_calls: response.toolCalls
    });

    // Execute each tool call
    for (const toolCall of response.toolCalls) {
      const functionName = toolCall.function.name;
      const argsString = toolCall.function.arguments;
      const callId = toolCall.id;
      
      log(`Executing tool: ${functionName}`, 'INFO');
      
      let result = '';
      try {
        const args = JSON.parse(argsString);
        const skillKey = FUNCTION_MAP[functionName];
        
        if (!skillKey) {
          result = JSON.stringify({ error: `Unknown tool function: ${functionName}` });
        } else {
          // Execute Skill
          const execution = await executeSkill(skillKey, functionName, args, agentId || '');
          result = JSON.stringify(execution);
        }
      } catch (e) {
        result = JSON.stringify({ error: `Failed to execute tool: ${(e as Error).message}` });
      }

      // Append Tool Result
      history.push({
        role: 'tool',
        tool_call_id: callId,
        content: result
      });
    }

    // Call LLM again with updated history
    response = await callLLM({ ...request, history, tools });
  }

  return response;
}
