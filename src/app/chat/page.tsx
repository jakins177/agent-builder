'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>('Agent');
  const [sessionId, setSessionId] = useState<string>('');

  // Generate or retrieve session ID (Session Storage - resets on tab close)
  useEffect(() => {
    if (!agentId) return;

    // Check sessionStorage for existing session (resets on refresh/close)
    const stored = sessionStorage.getItem(`chat_session_${agentId}`);
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = crypto.randomUUID();
      sessionStorage.setItem(`chat_session_${agentId}`, newId);
      setSessionId(newId);
    }

    setMessages([]);
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

    // Add user message to UI immediately
    const newMessages = [
      ...messages, 
      { role: 'user' as const, content: userMessage, timestamp: Date.now() }
    ];
    setMessages(newMessages);
    setLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          message: userMessage,
          history: history,
          sessionId: sessionId
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [
          ...prev, // Use functional update to ensure correct state
          { role: 'assistant', content: data.response, timestamp: Date.now() }
        ]);
      } else {
        setError(data.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!agentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Agent Selected</h1>
          <Link href="/projects" className="text-blue-600 hover:underline">
            Go to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navigation />
      
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col h-[calc(100vh-64px)]">
        <div className="bg-white rounded-t-xl shadow-sm p-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Chat Interface</h1>
            <p className="text-xs text-gray-500">Agent ID: {agentId.substring(0, 8)}...</p>
          </div>
          <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
            Exit Chat
          </Link>
        </div>

        <div className="flex-1 bg-white shadow-sm overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-2">💬</div>
              <p>Start a conversation with your agent.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">
                Error: {error}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white rounded-b-xl shadow-sm p-4 border-t border-gray-100">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              autoFocus
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
export default function Page() { return <Suspense fallback={<div>Loading...</div>}><ChatContent /></Suspense> }
