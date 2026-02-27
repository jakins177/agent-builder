'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';

interface Provider {
  id: string;
  name: string;
  provider_type: string;
  is_active: boolean;
  created_at: string;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    providerType: 'openai',
    apiKey: ''
  });

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data.data || []);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      setMessage({ type: 'error', text: 'Failed to fetch providers' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const resetForm = () => {
    setForm({ name: '', providerType: 'openai', apiKey: '' });
    setEditingProvider(null);
    setMessage(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (provider: Provider) => {
    setEditingProvider(provider);
    setForm({
      name: provider.name,
      providerType: provider.provider_type,
      apiKey: '' // Don't pre-fill password for security
    });
    setMessage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      let res;
      if (editingProvider) {
        // Update
        res = await fetch('/api/providers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProvider.id,
            ...form
          })
        });
      } else {
        // Create
        res = await fetch('/api/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
      }

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: editingProvider ? 'Provider updated!' : 'Provider created!' });
        setShowModal(false);
        resetForm();
        fetchProviders();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: (error as Error).message });
    }
    setSubmitting(false);
  };

  const testConnection = async () => {
    if (!form.apiKey && !editingProvider) {
      setMessage({ type: 'error', text: 'Please enter an API key to test' });
      return;
    }

    setTestingConnection(true);
    setMessage(null);

    try {
      // If editing and no new key entered, we can't test without the old key (which we don't have)
      // For simplicity, require key entry to test or assume existing is valid
      const keyToTest = form.apiKey;
      
      if (!keyToTest) {
        setMessage({ type: 'error', text: 'Enter API key to test connection' });
        setTestingConnection(false);
        return;
      }

      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerType: form.providerType,
          apiKey: keyToTest
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: '✅ Connection Successful!' });
      } else {
        setMessage({ type: 'error', text: '❌ ' + (data.error || 'Connection Failed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    }

    setTestingConnection(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-4xl mx-auto py-12 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">📦 Provider Management</h1>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span className="text-xl">+</span> Add Provider
          </button>
        </div>

        {/* Provider List */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Your Providers</h2>
          
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No providers yet.</p>
              <button onClick={openCreateModal} className="text-blue-600 hover:underline">
                Add your first provider
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((provider) => (
                <div key={provider.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{provider.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{provider.provider_type}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {new Date(provider.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${provider.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {provider.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => openEditModal(provider)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {editingProvider ? 'Edit Provider' : 'New Provider'}
                </h2>
                <button 
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {message && (
                <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="My OpenAI Key"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type</label>
                  <select
                    value={form.providerType}
                    onChange={(e) => setForm({ ...form, providerType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="google">Google Gemini</option>
                    <option value="minimax">Minimax</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingProvider ? 'New API Key (leave blank to keep current)' : 'API Key'}
                  </label>
                  <input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder={editingProvider ? "••••••••••••" : "sk-..."}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required={!editingProvider}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={testingConnection || !form.apiKey}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingProvider ? 'Update' : 'Create'}
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
