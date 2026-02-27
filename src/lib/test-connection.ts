
import { log } from '@/lib/logger';

export async function testConnection(providerType: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  log(`Testing connection for ${providerType}...`, 'INFO');

  try {
    switch (providerType) {
      case 'openai':
        return await testOpenAI(apiKey);
      case 'google':
        return await testGemini(apiKey);
      case 'minimax':
        return await testMinimax(apiKey);
      default:
        return { success: false, error: 'Unknown provider type' };
    }
  } catch (error) {
    log(`Connection test failed: ${(error as Error).message}`, 'ERROR');
    return { success: false, error: (error as Error).message };
  }
}

async function testOpenAI(apiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const code = errorData.error?.code;
      const msg = errorData.error?.message || '';

      if (response.status === 429 || code === 'insufficient_quota') {
        return { success: false, error: '⚠️ Quota Exceeded / Out of Credits' };
      }
      if (response.status === 401) {
        return { success: false, error: '❌ Invalid API Key' };
      }
      return { success: false, error: msg || `Status: ${response.status}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function testGemini(apiKey: string) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      const msg = errorData.error?.message || JSON.stringify(errorData);
      
      if (response.status === 429 || msg.includes('quota') || msg.includes('Resource has been exhausted')) {
        return { success: false, error: '⚠️ Quota Exceeded / Rate Limit Hit' };
      }
      if (response.status === 400 && msg.includes('API key')) {
        return { success: false, error: '❌ Invalid API Key' };
      }
      return { success: false, error: msg || `Status: ${response.status}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

async function testMinimax(apiKey: string) {
  try {
    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'abab6.5-chat',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1
      })
    });

    // Minimax often returns 200 even for logic errors, check body first
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const msg = data?.base_resp?.status_msg || JSON.stringify(data) || `Status: ${response.status}`;
      return { success: false, error: `Minimax Error: ${msg}` };
    }

    if (data && data.base_resp && data.base_resp.status_code !== 0) {
       const code = data.base_resp.status_code;
       const msg = data.base_resp.status_msg;

       // Common Minimax codes: 2049 (Invalid Key), 1004/1008 (Balance/Quota)
       if (code === 2049 || code === 2013) return { success: false, error: '❌ Invalid API Key' };
       if (code === 1002 || code === 1004 || code === 1008 || code === 1027) return { success: false, error: '⚠️ Quota Exceeded / Insufficient Balance' };
       
       return { success: false, error: `Minimax Error: ${msg} (Code: ${code})` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
