'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';

interface SetupStatus {
  success?: boolean;
  error?: string;
  isSetup?: boolean;
}

export default function HomePage() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Automatically run database setup on mount
    runSetup();
  }, []);

  const runSetup = async () => {
    console.log('[HOME] Ensuring database setup...');
    try {
      const res = await fetch('/api/setup');
      const data = await res.json();
      console.log('[HOME] Setup response:', data);
      
      if (data.success) {
        setSetupStatus({ success: true, isSetup: true });
      } else {
        setSetupStatus({ error: data.error });
      }
    } catch (error) {
      console.error('[HOME] Setup error:', error);
      setSetupStatus({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-center mb-8">🤖 Agent Builder MVP</h1>
        
        {loading && (
          <div className="bg-blue-50 p-4 rounded-lg mb-8 text-center">
            <p className="text-blue-800">Initializing system...</p>
          </div>
        )}

        {setupStatus.error && (
          <div className="bg-red-50 p-4 rounded-lg mb-8">
            <h3 className="font-bold text-red-800">System Initialization Failed</h3>
            <p className="text-red-600">{setupStatus.error}</p>
            <button 
              onClick={runSetup}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry Setup
            </button>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-4">📦 Providers</h2>
            <p className="text-gray-600 mb-4">Add LLM providers like Google Gemini, OpenAI, and Minimax with encrypted API keys.</p>
            <a href="/providers" className="text-blue-600 hover:underline flex items-center">Manage Providers <span className="ml-1">→</span></a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-4">📁 Projects & Agents</h2>
            <p className="text-gray-600 mb-4">Create projects to organize your work and build AI agents within them.</p>
            <a href="/projects" className="text-blue-600 hover:underline flex items-center">View Projects <span className="ml-1">→</span></a>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">🚀 Quick Start</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">1</span>
              <div>
                <h3 className="font-medium">Add Provider</h3>
                <p className="text-gray-600">Create a provider with your LLM API key (keys are encrypted)</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">2</span>
              <div>
                <h3 className="font-medium">Create Project</h3>
                <p className="text-gray-600">Start a new project to organize your work</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">3</span>
              <div>
                <h3 className="font-medium">Build Agent</h3>
                <p className="text-gray-600">Create an agent with a system prompt and select a provider</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">4</span>
              <div>
                <h3 className="font-medium">Test Chat</h3>
                <p className="text-gray-600">Chat with your agent in the built-in interface</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-medium text-yellow-800">⚠️ Environment Variables Required</h3>
          <p className="text-sm text-yellow-700 mt-1">
            Create a <code>.env.local</code> file with:
          </p>
          <pre className="mt-2 bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`DB_HOST=localhost
DB_USER=admin
DB_PASSWORD=your_password
DB_NAME=agent_builder
ENCRYPTION_KEY=your-secure-encryption-key-min-32-chars`}
          </pre>
        </div>

        <div className="mt-8">
          <a href="/logs" className="text-blue-600 hover:underline">📋 View Application Logs →</a>
        </div>
      </main>
    </div>
  );
}
