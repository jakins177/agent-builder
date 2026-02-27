'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function EmbedChatPage() {
  const params = useParams();
  const agentId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB'); // Default blue-600

  // Fetch Agent Details (Color)
  useEffect(() => {
    if (!agentId) return;
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/agents?id=${agentId}`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          const agent = data.data[0];
          if (agent.primary_color) setPrimaryColor(agent.primary_color);
        }
      } catch (e) {
        console.error('Failed to fetch agent details', e);
      }
    };
    fetchAgent();
  }, [agentId]);

  // Generate or retrieve session ID (Local Storage - persistent across closes)
  useEffect(() => {
    if (!agentId) return;

    // Check localStorage for existing session
    const stored = localStorage.getItem(`embed_session_${agentId}`);
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem(`embed_session_${agentId}`, newId);
      setSessionId(newId);
    }
  }, [agentId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agentId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    const newMessages = [
      ...messages, 
      { role: 'user' as const, content: userMessage, timestamp: Date.now() }
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          message: userMessage,
          sessionId: sessionId
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: data.response, timestamp: Date.now() }
        ]);
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  if (!agentId) return null;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            <p>How can I help you today?</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
              }`}
              style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-2 flex items-center space-x-1 shadow-sm">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded">
              {error}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-full focus:ring-2 outline-none text-sm"
            style={{ '--tw-ring-color': primaryColor } as any}
            autoFocus
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
        <div className="text-center mt-2">
           <span className="text-[10px] text-gray-300 font-medium tracking-wide">POWERED BY OPENCLAW</span>
        </div>
      </div>
    </div>
  );
}
