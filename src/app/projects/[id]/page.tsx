'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  model: string;
  provider_type: string;
  created_at: string;
  system_prompt?: string;
  primary_color?: string;
  rate_limit_enabled?: boolean;
  is_active?: boolean;
}

interface Provider {
  id: string;
  name: string;
  provider_type: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  skill_key: string;
  config_schema: any;
  enabled: boolean;
  config: any;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Embed Modal State
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedAgentId, setEmbedAgentId] = useState<string | null>(null);
  const [embedTab, setEmbedTab] = useState<'popup' | 'inline' | 'full'>('popup');
  const [copied, setCopied] = useState(false);

  // Skills Modal State
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [skillAgentId, setSkillAgentId] = useState<string | null>(null);
  const [agentSkills, setAgentSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', systemPrompt: '', model: '', providerId: '', primaryColor: '#2563EB', rateLimitEnabled: true, isActive: true });
  
  // Model selection state
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // New Agent Form
  const [form, setForm] = useState({
    name: '',
    providerId: '',
    systemPrompt: '',
    model: 'gpt-3.5-turbo'
  });

  // Effect to fetch models when provider changes
  useEffect(() => {
    const fetchModels = async () => {
      const provider = providers.find(p => p.id === form.providerId);
      
      // Only fetch for supported providers
      if (['openai', 'google', 'minimax'].includes(provider?.provider_type || '')) {
        setLoadingModels(true);
        try {
          const res = await fetch(`/api/providers/models?providerId=${form.providerId}`);
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            setAvailableModels(data.data);
            // Default to first model if current is not in list
            if (!data.data.includes(form.model)) {
              setForm(prev => ({ ...prev, model: data.data[0] }));
            }
          } else {
            setAvailableModels([]);
          }
        } catch (error) {
          console.error('Failed to fetch models:', error);
          setAvailableModels([]);
        }
        setLoadingModels(false);
      } else {
        setAvailableModels([]);
      }
    };

    if (form.providerId) {
      fetchModels();
    } else {
      setAvailableModels([]);
    }
  }, [form.providerId, providers]);

  const fetchData = async () => {
    try {
      // Fetch Project
      const projectRes = await fetch(`/api/projects?id=${projectId}`);
      const projectData = await projectRes.json();
      
      if (projectData.success) {
        setProject(projectData.data);
      } else {
        console.error('Project not found');
      }

      // Fetch Agents
      const agentsRes = await fetch(`/api/agents?projectId=${projectId}`);
      const agentsData = await agentsRes.json();
      setAgents(agentsData.data || []);

      // Fetch Providers (for creation)
      const providersRes = await fetch('/api/providers');
      const providersData = await providersRes.json();
      setProviders(providersData.data || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          projectId
        })
      });

      const data = await res.json();

      if (data.success) {
        setForm({ name: '', providerId: '', systemPrompt: '', model: 'gpt-3.5-turbo' });
        setShowCreateModal(false);
        fetchData(); // Refresh list
      } else {
        alert(data.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
    }
    setSubmitting(false);
  };

  const handleEmbedClick = (agentId: string) => {
    setEmbedAgentId(agentId);
    setShowEmbedModal(true);
    setCopied(false);
  };

  const handleSkillsClick = async (agentId: string) => {
    setSkillAgentId(agentId);
    setShowSkillsModal(true);
    setLoadingSkills(true);
    
    try {
      const res = await fetch(`/api/agents/skills?agentId=${agentId}`);
      const data = await res.json();
      if (data.success) {
        setAgentSkills(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch agent skills:', error);
    }
    setLoadingSkills(false);
  };

  const handleSkillToggle = async (skillId: string, enabled: boolean) => {
    // Optimistic update
    setAgentSkills(prev => prev.map(s => 
      s.id === skillId ? { ...s, enabled } : s
    ));

    // We only save enabled state here if config is not required or already present
    // But for MVP, we let the user click "Save" on the form
  };

  const handleSkillConfigChange = (skillId: string, field: string, value: string) => {
    setAgentSkills(prev => prev.map(s => 
      s.id === skillId ? { 
        ...s, 
        config: { ...s.config, [field]: value } 
      } : s
    ));
  };

  const handleEditClick = (agent: any) => {
    setEditAgent(agent);
    setEditForm({
      name: agent.name,
      systemPrompt: agent.system_prompt || '',
      model: agent.model,
      providerId: agent.provider_id,
      primaryColor: agent.primary_color || '#2563EB',
      rateLimitEnabled: agent.rate_limit_enabled !== false,
      isActive: agent.is_active !== false
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editAgent.id,
          ...editForm
        })
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchData(); // Refresh list
      } else {
        alert('Failed to update agent');
      }
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const saveSkill = async (skill: Skill) => {
    try {
      const res = await fetch('/api/agents/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: skillAgentId,
          skillId: skill.id,
          enabled: skill.enabled,
          config: skill.config
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert('Skill saved!');
      } else {
        alert('Failed to save skill: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving skill:', error);
    }
  };

  const getEmbedCode = () => {
    if (!embedAgentId) return '';
    const host = window.location.origin;
    
    if (embedTab === 'popup') {
      return `<script src="${host}/widget.js" data-agent-id="${embedAgentId}"></script>`;
    } else if (embedTab === 'inline') {
      return `<iframe src="${host}/embed/${embedAgentId}" width="100%" height="600px" style="border:1px solid #e5e7eb; border-radius: 12px;"></iframe>`;
    } else {
      return `<iframe src="${host}/embed/${embedAgentId}" style="position:fixed; top:0; left:0; width:100%; height:100%; border:none; z-index:9999;" allow="microphone"></iframe>`;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-12 px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Project Not Found</h1>
          <Link href="/projects" className="text-blue-600 hover:underline mt-4 block">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/projects" className="text-gray-500 hover:text-gray-700 mb-4 inline-block">
            ← Back to Projects
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 mt-2 max-w-2xl">{project.description}</p>
              )}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
            >
              <span className="text-xl">+</span> New Agent
            </button>
          </div>
        </div>

        {/* Agents List */}
        {agents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No agents yet</h2>
            <p className="text-gray-500 mb-6">
              Add an AI agent to this project to start building!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Create Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className={`bg-white p-6 rounded-xl shadow-sm border ${agent.is_active === false ? 'border-red-200 bg-red-50' : 'border-gray-200'} hover:shadow-md transition-all relative overflow-hidden`}>
                {agent.is_active === false && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold uppercase tracking-wider">
                    Disabled
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-xl">
                    🤖
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
                    {agent.provider_type}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-1">{agent.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{agent.model}</p>
                
                <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                  <Link 
                    href={`/chat?agentId=${agent.id}`}
                    className="flex-1 bg-blue-50 text-blue-600 text-center py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    Chat
                  </Link>
                  <Link 
                    href={`/history?agentId=${agent.id}`}
                    className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                    title="View Chat History"
                  >
                    History
                  </Link>
                  <button
                    onClick={() => handleSkillsClick(agent.id)}
                    className="px-3 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors text-sm font-medium"
                    title="Configure Skills"
                  >
                    ⚡ Skills
                  </button>
                  <button
                    onClick={() => handleEditClick(agent)}
                    className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                    title="Edit Agent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleEmbedClick(agent.id)}
                    className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                    title="Embed Agent"
                  >
                    Embed
                  </button>
                  <button 
                    className="px-3 py-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete Agent"
                    onClick={async () => {
                      if(confirm('Delete this agent?')) {
                        await fetch(`/api/agents?id=${agent.id}`, { method: 'DELETE' });
                        fetchData();
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">New Agent</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Support Bot"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={form.providerId}
                    onChange={(e) => setForm({ ...form, providerId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">Select a Provider</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.provider_type})
                      </option>
                    ))}
                  </select>
                  {providers.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No providers found. <Link href="/providers" className="underline">Add one first.</Link>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                  {loadingModels ? (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      Fetching available models...
                    </div>
                  ) : availableModels.length > 0 ? (
                    <select
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {availableModels.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        placeholder="gpt-3.5-turbo"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {form.providerId && ['openai', 'google', 'minimax'].includes(providers.find(p => p.id === form.providerId)?.provider_type || '') 
                          ? 'Failed to fetch models. Type manually (e.g., gpt-4)' 
                          : 'e.g., gpt-4, gemini-pro, minimax-chat'}
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                  <textarea
                    value={form.systemPrompt}
                    onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                    placeholder="You are a helpful assistant..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                    rows={6}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Embed Modal */}
        {showEmbedModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Embed Agent</h2>
                <button 
                  onClick={() => setShowEmbedModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex gap-2 mb-4 border-b border-gray-100">
                <button 
                  onClick={() => setEmbedTab('popup')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${embedTab === 'popup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >Popup Bubble</button>
                <button 
                  onClick={() => setEmbedTab('inline')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${embedTab === 'inline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >Inline Frame</button>
                <button 
                  onClick={() => setEmbedTab('full')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${embedTab === 'full' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >Full Page</button>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm">
                {embedTab === 'popup' && "Add a floating chat bubble to your website."}
                {embedTab === 'inline' && "Embed the chat directly into a specific section of your page."}
                {embedTab === 'full' && "Share a direct link to the full-screen chat interface."}
              </p>

              <div className="bg-gray-900 rounded-lg p-4 mb-4 relative group">
                <code className="text-green-400 text-sm break-all block font-mono">
                  {getEmbedCode()}
                </code>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-lg text-white font-medium transition-all ${
                    copied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Skills Modal */}
        {showSkillsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Agent Skills</h2>
                <button 
                  onClick={() => setShowSkillsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {loadingSkills ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading skills...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {agentSkills.map((skill) => (
                    <div key={skill.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">⚡</div>
                          <div>
                            <h3 className="font-bold text-gray-900">{skill.name}</h3>
                            <p className="text-sm text-gray-500">{skill.description}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={skill.enabled}
                            onChange={(e) => handleSkillToggle(skill.id, e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {skill.enabled && (
                        <div className="bg-gray-50 p-4 rounded-lg mt-4 border border-gray-100">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Configuration</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {skill.config_schema?.fields?.map((field: any) => (
                              <div key={field.name} className={field.type === 'text' || field.type === 'password' ? 'col-span-2 md:col-span-1' : 'col-span-2'}>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <input
                                  type={field.type}
                                  value={skill.config?.[field.name] || ''}
                                  onChange={(e) => handleSkillConfigChange(skill.id, field.name, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                  placeholder={field.default ? `Default: ${field.default}` : ''}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={() => saveSkill(skill)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                            >
                              Save Config
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Agent Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Agent</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editForm.primaryColor}
                      onChange={(e) => setEditForm({ ...editForm, primaryColor: e.target.value })}
                      className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={editForm.primaryColor}
                      onChange={(e) => setEditForm({ ...editForm, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Agent Status</label>
                    <p className="text-xs text-gray-500">Enable or disable this agent</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rate Limiting</label>
                    <p className="text-xs text-gray-500">Limit to 10 msgs/min to prevent abuse</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={editForm.rateLimitEnabled}
                      onChange={(e) => setEditForm({ ...editForm, rateLimitEnabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
                  <textarea
                    value={editForm.systemPrompt}
                    onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                    rows={8}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
