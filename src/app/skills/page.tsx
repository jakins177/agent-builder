'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';

interface Skill {
  id: string;
  name: string;
  description: string;
  skill_key: string;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch('/api/skills');
        const data = await res.json();
        setSkills(data.data || []);
      } catch (error) {
        console.error('Failed to fetch skills:', error);
      }
      setLoading(false);
    };
    fetchSkills();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-8">🧩 Skills Registry</h1>
        <p className="text-gray-600 mb-8 max-w-2xl">
          Skills extend the capabilities of your agents. Enable these skills in your agent's configuration to give them superpowers like sending emails, browsing the web, or querying databases.
        </p>

        {loading ? (
          <div className="text-gray-500">Loading skills...</div>
        ) : skills.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <p>No skills found. Check your database setup.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill) => (
              <div key={skill.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl mb-4">
                  ⚡
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{skill.name}</h3>
                <p className="text-gray-600 text-sm mb-4 min-h-[40px]">{skill.description}</p>
                <div className="text-xs font-mono bg-gray-50 p-2 rounded text-gray-500">
                  Key: {skill.skill_key}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
