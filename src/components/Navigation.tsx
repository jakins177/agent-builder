'use client';

import { useState } from 'react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold">🤖 Agent Builder</a>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="/" className="hover:text-gray-300">Home</a>
            <a href="/projects" className="hover:text-gray-300">Projects</a>
            <a href="/skills" className="hover:text-gray-300">Skills</a>
            <a href="/providers" className="hover:text-gray-300">Providers</a>
            <a href="/logs" className="hover:text-gray-300 text-sm bg-gray-800 px-3 py-1 rounded-full">Logs</a>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4">
            <a href="/" className="block py-2 hover:text-gray-300">Home</a>
            <a href="/projects" className="block py-2 hover:text-gray-300">Projects</a>
            <a href="/skills" className="block py-2 hover:text-gray-300">Skills</a>
            <a href="/providers" className="block py-2 hover:text-gray-300">Providers</a>
            <a href="/logs" className="block py-2 hover:text-gray-300">Logs</a>
          </div>
        )}
      </div>
    </nav>
  );
}
