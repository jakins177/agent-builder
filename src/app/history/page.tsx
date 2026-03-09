'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

interface Message {
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get('agentId');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat?agentId=${agentId}`);
        const data = await res.json();
        if (data.success) {
          setMessages(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [agentId]);

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

  // Group messages by session
  const groupedMessages = messages.reduce((acc, msg) => {
    if (!acc[msg.session_id]) {
      acc[msg.session_id] = [];
    }
    acc[msg.session_id].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const sessions = Object.keys(groupedMessages).sort((a, b) => 
    new Date(groupedMessages[b][0].created_at).getTime() - new Date(groupedMessages[a][0].created_at).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-12 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href={`/projects`} className="text-gray-500 hover:text-gray-700 mb-4 inline-block">
              ← Back to Projects
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Chat History</h1>
            <p className="text-gray-600">Agent ID: {agentId}</p>
          </div>
          <Link 
            href={`/chat?agentId=${agentId}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Start New Chat
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading history...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <p className="text-gray-500">No chat history found for this agent.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sessions.map((sessionId) => (
              <div key={sessionId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600 uppercase">Session</span>
                    <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded text-gray-700">
                      {sessionId.slice(0, 8)}...
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Started: {new Date(groupedMessages[sessionId][0].created_at).toLocaleString()}
                  </span>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {groupedMessages[sessionId].map((msg, idx) => (
                    <div key={idx} className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                          msg.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {msg.role}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-800 whitespace-pre-wrap text-sm mt-1">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
