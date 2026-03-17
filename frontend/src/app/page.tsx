'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Blueprint, Lightning, Cube, ArrowRight, ChartLineUp, Stack, ShieldCheck } from '@phosphor-icons/react';

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: Lightning,
      title: 'AI-Powered Design',
      description: 'Groq AI analyzes requirements and recommends optimal architecture patterns in seconds.',
      color: 'from-blue-900/40 to-blue-950/60',
      border: 'border-blue-700/30',
      text: 'text-blue-300',
    },
    {
      icon: Cube,
      title: 'Component Generation',
      description: 'Automatically generates system components, services, databases, and infrastructure.',
      color: 'from-purple-900/40 to-purple-950/60',
      border: 'border-purple-700/30',
      text: 'text-purple-300',
    },
    {
      icon: ChartLineUp,
      title: 'Visual Diagrams',
      description: 'Creates architecture diagrams, infrastructure layouts, and interaction flows.',
      color: 'from-cyan-900/40 to-cyan-950/60',
      border: 'border-cyan-700/30',
      text: 'text-cyan-300',
    },
    {
      icon: Stack,
      title: 'Infrastructure Blueprints',
      description: 'Generates deployment plans with compute, networking, storage, and security.',
      color: 'from-green-900/40 to-green-950/60',
      border: 'border-green-700/30',
      text: 'text-green-300',
    },
    {
      icon: ShieldCheck,
      title: 'AI Optimization',
      description: 'Evaluates architecture quality and suggests improvements for scalability and security.',
      color: 'from-amber-900/40 to-amber-950/60',
      border: 'border-amber-700/30',
      text: 'text-amber-300',
    },
    {
      icon: Blueprint,
      title: 'Documentation',
      description: 'Auto-generates comprehensive architecture documents ready for stakeholders.',
      color: 'from-rose-900/40 to-rose-950/60',
      border: 'border-rose-700/30',
      text: 'text-rose-300',
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center relative px-4"
      style={{ backgroundImage: 'linear-gradient(to bottom right, #0f172a, #1e293b)' }}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div className="scanlines" />

      <div className="relative z-10 w-full max-w-5xl mx-auto text-center space-y-12">
        {/* Hero */}
        <div className="space-y-6 animate-slide-up">
          <div className="flex justify-center">
            <div className="relative">
              <Blueprint size={64} weight="duotone" className="text-blue-400 animate-float" />
              <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-chivo font-bold uppercase tracking-wider">
            <span className="text-gradient">ArchDesign</span>{' '}
            <span className="text-slate-100">AI</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Transform your system requirements into production-grade architecture blueprints
            powered by <span className="text-cyan-400 font-semibold">Groq AI</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-sm font-medium tracking-wide uppercase text-sm px-8 py-3.5 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-150 flex items-center gap-2 justify-center hover:scale-[1.02]"
            >
              Get Started <ArrowRight size={18} weight="bold" />
            </button>
            <button
              onClick={() => router.push('/dashboard/templates')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-sm font-medium tracking-wide uppercase text-sm px-8 py-3.5 border border-slate-700 transition-all duration-150 hover:scale-[1.02]"
            >
              View Templates
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className={`bg-gradient-to-br ${feature.color} border ${feature.border} rounded-xl p-6 text-left hover:scale-[1.02] transition-all duration-200 animate-slide-up`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <Icon size={32} weight="duotone" className={`${feature.text} mb-3`} />
                <h3 className={`${feature.text} font-bold text-sm uppercase tracking-wider mb-2`}>
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Tech Stack */}
        <div className="pt-8 pb-12">
          <p className="text-xs text-slate-600 uppercase tracking-widest font-mono mb-4">Built With</p>
          <div className="flex flex-wrap justify-center gap-6 text-slate-500 text-xs font-mono uppercase tracking-wider">
            <span className="hover:text-blue-400 transition-colors">Next.js</span>
            <span className="text-slate-700">•</span>
            <span className="hover:text-green-400 transition-colors">FastAPI</span>
            <span className="text-slate-700">•</span>
            <span className="hover:text-cyan-400 transition-colors">Groq AI</span>
            <span className="text-slate-700">•</span>
            <span className="hover:text-purple-400 transition-colors">Mermaid</span>
            <span className="text-slate-700">•</span>
            <span className="hover:text-amber-400 transition-colors">SQLite</span>
          </div>
        </div>
      </div>
    </div>
  );
}
