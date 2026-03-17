'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
    Gauge,
    Folder,
    PlusCircle,
    Pulse,
    Sparkle,
    ArrowSquareOut,
    CheckCircle,
    Clock,
    Warning,
    FileText,
} from '@phosphor-icons/react';

interface Stats {
    total_projects: number;
    completed_projects: number;
    processing_projects: number;
    draft_projects: number;
    total_architectures: number;
}

interface Project {
    id: number;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

function DataCard({ title, value, icon: Icon, className = '' }: { title: string; value: string | number; icon?: React.ElementType; className?: string }) {
    return (
        <div className={`bg-slate-800/40 border border-slate-700/60 rounded-sm p-6 transition-all duration-200 hover:border-slate-500 ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider font-mono mb-2">{title}</p>
                    <p className="text-3xl font-bold font-mono text-slate-100">{value}</p>
                </div>
                {Icon && (
                    <div className="text-blue-400">
                        <Icon size={28} weight="duotone" />
                    </div>
                )}
            </div>
        </div>
    );
}

const statusConfig: Record<string, { icon: React.ElementType; class: string; label: string }> = {
    completed: { icon: CheckCircle, class: 'status-completed', label: 'Completed' },
    processing: { icon: Clock, class: 'status-processing', label: 'Processing' },
    draft: { icon: FileText, class: 'status-draft', label: 'Draft' },
    failed: { icon: Warning, class: 'status-failed', label: 'Failed' },
};

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsData, projectsData] = await Promise.all([
                    api.getStats(),
                    api.listProjects(),
                ]);
                setStats(statsData);
                setProjects(projectsData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Dashboard...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Gauge size={28} weight="duotone" className="text-blue-400" />
                    Dashboard
                </h1>
                <p className="text-slate-500 mt-1">Overview of your architecture projects</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard title="Total Projects" value={stats?.total_projects || 0} icon={Folder} />
                <DataCard title="Completed" value={stats?.completed_projects || 0} icon={CheckCircle} />
                <DataCard title="Processing" value={stats?.processing_projects || 0} icon={Clock} />
                <DataCard title="Architectures" value={stats?.total_architectures || 0} icon={Sparkle} />
            </div>

            {/* Quick Actions + Recent Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <ArrowSquareOut size={16} weight="duotone" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <button
                            onClick={() => router.push('/dashboard/new')}
                            className="bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-700/30 hover:border-blue-600/50 rounded-xl px-4 py-4 text-blue-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] flex flex-col items-center gap-2"
                        >
                            <PlusCircle size={24} weight="duotone" />
                            New Project
                        </button>
                        <button
                            onClick={() => router.push('/dashboard/templates')}
                            className="bg-gradient-to-br from-purple-900/40 to-purple-950/60 border border-purple-700/30 hover:border-purple-600/50 rounded-xl px-4 py-4 text-purple-300 font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] flex flex-col items-center gap-2"
                        >
                            <Sparkle size={24} weight="duotone" />
                            Templates
                        </button>
                    </div>
                </div>

                {/* Recent Projects */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 relative overflow-hidden">
                    <Sparkle size={80} weight="duotone" className="absolute -right-4 -top-4 text-slate-700/20" />
                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                        <Folder size={16} weight="duotone" />
                        Recent Projects
                    </h3>
                    <div className="space-y-2 relative z-10">
                        {projects.length === 0 ? (
                            <div className="text-center py-8">
                                <Folder size={48} weight="duotone" className="text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">No projects yet</p>
                                <button
                                    onClick={() => router.push('/dashboard/new')}
                                    className="text-blue-400 text-sm font-mono mt-2 hover:underline"
                                >
                                    + Create your first project
                                </button>
                            </div>
                        ) : (
                            projects.slice(0, 5).map((project) => {
                                const status = statusConfig[project.status] || statusConfig.draft;
                                const StatusIcon = status.icon;
                                return (
                                    <button
                                        key={project.id}
                                        onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                                        className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 hover:bg-slate-800/50 transition-colors text-left"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-200 text-sm font-medium truncate">{project.name}</p>
                                            <p className="text-slate-500 text-xs font-mono">
                                                {new Date(project.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-2 py-1 rounded border ${status.class}`}>
                                            <StatusIcon size={14} />
                                            {status.label}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
