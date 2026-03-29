'use client';

import { useState } from 'react';
import { GhOSTfaceBrain } from '@/components/ghostface/GhOSTfaceBrain';

export default function Home() {
  const [launched, setLaunched] = useState(false);

  if (launched) {
    return (
      <div className="min-h-screen bg-bg">
        <GhOSTfaceBrain />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan/5 blur-[120px] pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 text-center">
        <div className="text-8xl mb-6 animate-pulse">🧠</div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-3">
          <span className="text-cyan">Gh</span>
          <span className="text-muted">.</span>
          <span className="text-lime">O</span>
          <span className="text-muted">.</span>
          <span className="text-gold">K</span>
          <span className="text-muted">.</span>
          <span className="text-rip">U</span>
          <span className="text-muted">.</span>
        </h1>
        <p className="text-lg text-muted max-w-md mx-auto mb-2">
          GitHub Omniscient Knowledge Utility
        </p>
        <p className="text-sm text-muted2 max-w-lg mx-auto mb-10">
          AI-powered code intelligence • Search repos • Analyze codebases • Chat with Claude •
          Run HuggingFace models • Neural interface • Persistent memory
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-10">
          {[
            { icon: '🔍', label: 'Search', desc: 'GitHub repos' },
            { icon: '📊', label: 'Intel', desc: 'Deep analysis' },
            { icon: '🧠', label: 'Oracle', desc: 'AI chat' },
            { icon: '⚡', label: 'Brain', desc: 'Code gen' },
            { icon: '🤗', label: 'Models', desc: 'HuggingFace' },
            { icon: '🧬', label: 'Neural', desc: 'Bio interface' },
            { icon: '💾', label: 'Memory', desc: 'Persistent' },
            { icon: '🚀', label: 'Launch', desc: 'Get started' },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-bg2 border border-border rounded-xl p-3 text-center hover:border-cyan/30 transition"
            >
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs font-bold text-white">{f.label}</div>
              <div className="text-[10px] text-muted">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Launch button */}
        <button
          onClick={() => setLaunched(true)}
          className="px-8 py-3 rounded-2xl text-lg font-bold text-black bg-gradient-to-r from-cyan via-lime to-gold hover:brightness-110 transition-all hover:scale-105 shadow-lg shadow-cyan/20"
        >
          ⚡ Launch Gh.O.K.U.
        </button>

        <p className="text-[10px] text-muted2 mt-6">
          Built for <span className="text-cyan">RemixIP</span> • Powered by Claude + HuggingFace
        </p>
      </div>
    </div>
  );
}
