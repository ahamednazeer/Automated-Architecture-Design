'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Blueprint, ArrowRight, UserCircle, LockKey, EnvelopeSimple } from '@phosphor-icons/react';
import { api, getAuthToken, setAuthToken } from '@/lib/api';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (getAuthToken()) {
            router.replace('/dashboard');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = mode === 'register'
                ? await api.register(email, password, displayName)
                : await api.login(email, password);
            setAuthToken(response.access_token);
            router.replace('/dashboard');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
            <div className="scanlines" />
            <div className="w-full max-w-md bg-slate-900/80 border border-slate-700/60 rounded-xl p-8 relative z-10">
                <div className="text-center mb-8">
                    <Blueprint size={40} weight="duotone" className="mx-auto text-blue-400 mb-3" />
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider">ArchDesign AI</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace account'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <div>
                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                Display Name
                            </label>
                            <div className="relative">
                                <UserCircle
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                                />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="input-modern"
                                    style={{ paddingLeft: '2.75rem' }}
                                    placeholder="Your name"
                                    maxLength={255}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Email
                        </label>
                        <div className="relative">
                            <EnvelopeSimple
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-modern"
                                style={{ paddingLeft: '2.75rem' }}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                            Password
                        </label>
                        <div className="relative">
                            <LockKey
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-modern"
                                style={{ paddingLeft: '2.75rem' }}
                                placeholder="At least 8 characters"
                                minLength={8}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-300 bg-red-950/40 border border-red-800/50 rounded-sm px-3 py-2 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                        {!loading && <ArrowRight size={16} weight="bold" />}
                    </button>
                </form>

                <div className="mt-5 text-center">
                    <button
                        onClick={() => {
                            setMode(mode === 'login' ? 'register' : 'login');
                            setError('');
                        }}
                        className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        {mode === 'login'
                            ? "Don't have an account? Create one"
                            : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
