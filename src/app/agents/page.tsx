'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import ChatInterface from '@/components/ChatInterface';

interface Provider {
  id: string;
  name: string;
  provider_type: string;
}

interface Project {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  project_id: string;
  provider_id: string;
  name: string;
  system_prompt: string;
  model: string;
  created_at: string;
  provider_name?: string;
  project_name?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    projectId: '',
    providerId: '',
    systemPrompt: '',
    model: 'gpt-3.5-turbo'
  });

  const fetchProviders = async () => {
    console.log('[AGENTS] Fetching providers...');
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data.data || []);
    } catch (error) {
      console.error('[AGENTS] Error fetching providers:', error);
    }
  };

  const fetchProjects = async () => {
    console.log('[AGENTS] Fetching projects...');
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.data || []);
    } catch (error) {
      console.error('[AGENTS] Error fetching projects:', error);
    }
  };

  const fetchAgents = async (projectId?: string) => {
    console.log('[AGENTS] Fetching agents...');
    try {
      const url = projectId ? `/api/agents?projectId=${projectId}` : '/api/agents';
      const res = await fetch(url);
      const data = await res.json();
      console.log('[AGENTS] Fetched agents:', data.data);
      setAgents(data.data || []);
    } catch (error) {
      console.error('[AGENTS] Error fetching agents:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    if (projectId) {
      setSelectedProjectId(projectId);
      setForm({ ...form, projectId });
    }
    fetchProviders();
    fetchProjects();
    fetchAgents(projectId || undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AGENTS] Submitting new agent...');
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      console.log('[AGENTS] Response:', data);

      if (data.success) {
        setMessage({ type: 'success', text: 'Agent created successfully!' });
        setForm({
          name: '',
          projectId: form.projectId,
          providerId: '',
          systemPrompt: '',
          model: 'gpt-3.5-turbo'
        });
        fetchAgents(selectedProjectId || undefined);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create agent' });
      }
    } catch (error) {
      console.error('[AGENTS] Error creating agent:', error);
      setMessage({ type: 'error', text: (error as Error).message });
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    console.log('[AGENTS] Deleting agent:', id);
    try {
      const res = await fetch(`/api/agents?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Agent deleted successfully!' });
        fetchAgents(selectedProjectId || undefined);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete agent' });
      }
    } catch (error) {
      console.error('[AGENTS] Error deleting agent:', error);
      setMessage({ type: 'error', text: (error as Error).message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      
      <main className="max-w-6xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8">🤖 Agent Management</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column: Create Agent */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Create New Agent</h2>
              
              {message && (
                <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Customer Support Bot"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {projects.length === 0 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      No projects available. Create a project first!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <select
                    value={form.providerId}
                    onChange={(e) => setForm({ ...form, providerId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a provider</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider_type})
                      </option>
                    ))}
                  </select>
                  {providers.length === 0 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      No providers available. Add a provider first!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="gpt-3.5-turbo"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    value={form.systemPrompt}
                    onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                    placeholder="You are a helpful customer support assistant..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={5}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || projects.length === 0 || providers.length === 0}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Agent'}
                </button>
              </form>
            </div>
          </div>

          {/* Right column: Agents List & Chat */}
          <div className="space-y-6">
            {/* Agents List */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Your Agents</h2>
              
              {loading ? (
                <p className="text-gray-500">Loading agents...</p>
              ) : agents.length === 0 ? (
                <p className="text-gray-500">No agents yet. Create your first one!</p>
              ) : (
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedAgent?.id === agent.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{agent.name}</h3>
                          <p className="text-sm text-gray-500">
                            {agent.provider_name} • {agent.model}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {agent.project_name}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(agent.id);
                          }}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Interface */}
            {selectedAgent && (
              <ChatInterface agent={selectedAgent} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
