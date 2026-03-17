'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
    BookOpenText,
    Pulse,
    ShoppingCart,
    Cloud,
    Cpu,
    Brain,
    ChatCircle,
    ChartBar,
    DeviceMobile,
    GridFour,
    ArrowRight,
} from '@phosphor-icons/react';

interface Template {
    id: number;
    name: string;
    category: string;
    description: string;
    icon: string;
    default_requirements: Record<string, any>;
}

const iconMap: Record<string, React.ElementType> = {
    ShoppingCart,
    Cloud,
    Cpu,
    Brain,
    ChatCircle,
    ChartBar,
    DeviceMobile,
    GridFour,
};

const categoryColors: Record<string, { gradient: string; border: string; text: string }> = {
    'Web Application': { gradient: 'from-blue-900/40 to-blue-950/60', border: 'border-blue-700/30', text: 'text-blue-300' },
    'IoT System': { gradient: 'from-cyan-900/40 to-cyan-950/60', border: 'border-cyan-700/30', text: 'text-cyan-300' },
    'Data Platform': { gradient: 'from-purple-900/40 to-purple-950/60', border: 'border-purple-700/30', text: 'text-purple-300' },
    'Mobile Application': { gradient: 'from-green-900/40 to-green-950/60', border: 'border-green-700/30', text: 'text-green-300' },
};

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [creating, setCreating] = useState<number | null>(null);

    useEffect(() => {
        async function fetchTemplates() {
            try {
                const data = await api.listTemplates();
                setTemplates(data);
            } catch (error) {
                console.error('Failed to fetch templates:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchTemplates();
    }, []);

    const filteredTemplates = selectedCategory
        ? templates.filter(t => t.category === selectedCategory)
        : templates;

    const categories = Array.from(new Set(templates.map(t => t.category)));

    const handleUseTemplate = async (template: Template) => {
        setCreating(template.id);
        try {
            const project = await api.createProject({
                name: `${template.name} Project`,
                description: template.description,
                requirements: template.default_requirements as any,
            });
            await api.generateArchitecture(project.id);
            router.push(`/dashboard/projects/${project.id}`);
        } catch (error) {
            console.error('Failed to create from template:', error);
            setCreating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                    Loading Templates...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <BookOpenText size={28} weight="duotone" className="text-blue-400" />
                    Architecture Templates
                </h1>
                <p className="text-slate-500 mt-1">Pre-built architecture templates to accelerate your design</p>
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider border transition-all ${!selectedCategory
                        ? 'bg-blue-950/50 text-blue-400 border-blue-800'
                        : 'text-slate-500 border-slate-800 hover:border-slate-600'
                        }`}
                >
                    All ({templates.length})
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider border transition-all ${selectedCategory === cat
                            ? 'bg-blue-950/50 text-blue-400 border-blue-800'
                            : 'text-slate-500 border-slate-800 hover:border-slate-600'
                            }`}
                    >
                        {cat} ({templates.filter(t => t.category === cat).length})
                    </button>
                ))}
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => {
                    const colors = categoryColors[template.category] || categoryColors['Web Application'];
                    const Icon = iconMap[template.icon] || Cloud;
                    const isCreating = creating === template.id;

                    return (
                        <div
                            key={template.id}
                            className={`bg-gradient-to-br ${colors.gradient} border ${colors.border} rounded-xl p-6 hover:scale-[1.02] transition-all duration-200 flex flex-col`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <Icon size={32} weight="duotone" className={colors.text} />
                                <span className={`text-xs font-mono uppercase tracking-wider ${colors.text} opacity-70`}>
                                    {template.category}
                                </span>
                            </div>
                            <h3 className={`font-bold text-base ${colors.text} mb-2`}>{template.name}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4 flex-1">{template.description}</p>
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                    {template.default_requirements.cloud_provider && (
                                        <span className="text-xs font-mono text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded">
                                            {template.default_requirements.cloud_provider}
                                        </span>
                                    )}
                                    {template.default_requirements.expected_users && (
                                        <span className="text-xs font-mono text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded">
                                            {template.default_requirements.expected_users} users
                                        </span>
                                    )}
                                    {template.default_requirements.availability_requirements && (
                                        <span className="text-xs font-mono text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded">
                                            {template.default_requirements.availability_requirements}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleUseTemplate(template)}
                                    disabled={isCreating || creating !== null}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-xs font-mono uppercase tracking-wider transition-all ${isCreating
                                        ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                                        : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/50 hover:border-slate-600/50'
                                        } disabled:opacity-50`}
                                >
                                    {isCreating ? (
                                        <>
                                            <div className="w-3 h-3 rounded-full border border-blue-400 border-t-transparent animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            Use Template <ArrowRight size={14} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
