'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, getAuthToken, ProjectChatMessage } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import {
    Cube,
    TreeStructure,
    FileText,
    Lightning,
    ArrowLeft,
    Pulse,
    Warning,
    ShieldCheck,
    Sparkle,
    Stack,
    CloudArrowUp,
    Download,
    CaretDown,
    ChatCircleDots,
    PaperPlaneTilt,
    LockSimple,
} from '@phosphor-icons/react';

interface Architecture {
    id: number;
    project_id: number;
    version: number;
    architecture_pattern: string | null;
    architecture_description: string | null;
    components: any[] | null;
    infrastructure: any[] | null;
    diagrams: any[] | null;
    optimization_suggestions: any[] | null;
    documentation: string | null;
    ai_model_used: string | null;
    complexity_score: number | null;
    quality_score: number | null;
    created_at: string;
}

interface Project {
    id: number;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

type TabKey = 'overview' | 'diagrams' | 'components' | 'infrastructure' | 'optimizations' | 'documentation' | 'assistant';
type ChatRole = 'user' | 'assistant';

interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
}

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Cube },
    { key: 'diagrams', label: 'Diagrams', icon: TreeStructure },
    { key: 'components', label: 'Components', icon: Stack },
    { key: 'infrastructure', label: 'Infrastructure', icon: CloudArrowUp },
    { key: 'optimizations', label: 'Optimizations', icon: Lightning },
    { key: 'documentation', label: 'Documentation', icon: FileText },
    { key: 'assistant', label: 'Assistant', icon: ChatCircleDots },
];

function MermaidDiagram({ code, id }: { code: string; id: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                darkMode: true,
                background: '#0f172a',
                primaryColor: '#1e3a5f',
                primaryTextColor: '#f8fafc',
                primaryBorderColor: '#3b82f6',
                lineColor: '#475569',
                secondaryColor: '#334155',
                tertiaryColor: '#1e293b',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '14px',
            },
        });

        const render = async () => {
            try {
                const uniqueId = `mermaid-${id}-${Date.now()}`;
                const { svg } = await mermaid.render(uniqueId, code);
                setSvg(svg);
            } catch (e: any) {
                setError(e.message || 'Failed to render diagram');
            }
        };
        render();
    }, [code, id]);

    if (error) {
        return (
            <div className="bg-red-950/30 border border-red-800/50 rounded-sm p-4">
                <p className="text-red-400 text-sm font-mono">Diagram render error: {error}</p>
                <pre className="text-slate-500 text-xs mt-2 overflow-auto">{code}</pre>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="mermaid-container"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

const layerColors: Record<string, { bg: string; border: string; text: string }> = {
    client: { bg: 'from-blue-900/40 to-blue-950/60', border: 'border-blue-700/30', text: 'text-blue-300' },
    api: { bg: 'from-purple-900/40 to-purple-950/60', border: 'border-purple-700/30', text: 'text-purple-300' },
    service: { bg: 'from-green-900/40 to-green-950/60', border: 'border-green-700/30', text: 'text-green-300' },
    data: { bg: 'from-amber-900/40 to-amber-950/60', border: 'border-amber-700/30', text: 'text-amber-300' },
    infrastructure: { bg: 'from-red-900/40 to-red-950/60', border: 'border-red-700/30', text: 'text-red-300' },
};

const catColors: Record<string, { bg: string; border: string; text: string }> = {
    compute: { bg: 'from-blue-900/40 to-blue-950/60', border: 'border-blue-700/30', text: 'text-blue-300' },
    networking: { bg: 'from-purple-900/40 to-purple-950/60', border: 'border-purple-700/30', text: 'text-purple-300' },
    storage: { bg: 'from-amber-900/40 to-amber-950/60', border: 'border-amber-700/30', text: 'text-amber-300' },
    security: { bg: 'from-red-900/40 to-red-950/60', border: 'border-red-700/30', text: 'text-red-300' },
    monitoring: { bg: 'from-green-900/40 to-green-950/60', border: 'border-green-700/30', text: 'text-green-300' },
};

const priorityColors: Record<string, string> = {
    high: 'text-red-400 bg-red-950/50 border-red-800',
    medium: 'text-amber-400 bg-amber-950/50 border-amber-800',
    low: 'text-green-400 bg-green-950/50 border-green-800',
};

const INITIAL_CHAT_MESSAGE =
    'I can help only with this project. I do not have access to any other project data.';

const markdownComponents = {
    table: ({ children }: { children?: React.ReactNode }) => (
        <div className="w-full overflow-auto">
            <table className="w-full border-collapse text-xs">{children}</table>
        </div>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
        <th className="border border-slate-700 bg-slate-900/70 px-2 py-1 text-left text-[10px] font-mono uppercase tracking-wider text-slate-300">
            {children}
        </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
        <td className="border border-slate-800 px-2 py-1 text-[11px] text-slate-300">
            {children}
        </td>
    ),
};

function ExportMenu({
    label,
    onDownloadMd,
    onDownloadDocx,
    onCopyLink,
    onOpenDocx,
    variant = 'button',
}: {
    label: string;
    onDownloadMd: () => void;
    onDownloadDocx: () => void;
    onCopyLink: () => void;
    onOpenDocx: () => void;
    variant?: 'button' | 'link';
}) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const buttonClass =
        variant === 'button'
            ? 'btn-secondary flex items-center gap-2 text-xs'
            : 'text-blue-400 text-xs font-mono hover:underline flex items-center gap-1';

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setOpen((prev) => !prev)}
                className={buttonClass}
            >
                <Download size={variant === 'button' ? 16 : 14} />
                {label}
                <CaretDown size={12} />
            </button>
            {open && (
                <div className="absolute right-0 mt-2 bg-slate-900 border border-slate-700 rounded-sm shadow-lg z-30 min-w-[160px]">
                    <button
                        onClick={() => {
                            setOpen(false);
                            onDownloadMd();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-300 hover:bg-slate-800"
                    >
                        Download .md
                    </button>
                    <button
                        onClick={() => {
                            setOpen(false);
                            onDownloadDocx();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-300 hover:bg-slate-800"
                    >
                        Download .docx
                    </button>
                    <button
                        onClick={() => {
                            setOpen(false);
                            onOpenDocx();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-300 hover:bg-slate-800"
                    >
                        Open DOCX
                    </button>
                    <button
                        onClick={() => {
                            setOpen(false);
                            onCopyLink();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-300 hover:bg-slate-800"
                    >
                        Copy DOCX Link
                    </button>
                </div>
            )}
        </div>
    );
}

const createMessageId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [architecture, setArchitecture] = useState<Architecture | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [regenerating, setRegenerating] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { id: createMessageId(), role: 'assistant', content: INITIAL_CHAT_MESSAGE },
    ]);
    const [chatInput, setChatInput] = useState('');
    const [sendingChat, setSendingChat] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const projectId = parseInt(resolvedParams.id);
                const [projData, archData] = await Promise.all([
                    api.getProject(projectId),
                    api.getProjectArchitectures(projectId),
                ]);
                setProject(projData);
                if (archData.length > 0) {
                    setArchitecture(archData[0]);
                    setActiveTab('overview');
                } else {
                    setArchitecture(null);
                    setActiveTab('assistant');
                }
            } catch (error) {
                console.error('Failed to fetch project:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [resolvedParams.id]);

    useEffect(() => {
        setChatMessages([{ id: createMessageId(), role: 'assistant', content: INITIAL_CHAT_MESSAGE }]);
        setChatInput('');
        setSendingChat(false);
    }, [resolvedParams.id]);

    useEffect(() => {
        if (activeTab === 'assistant') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, activeTab]);

    const handleRegenerate = async () => {
        if (!project) return;
        setRegenerating(true);
        try {
            const arch = await api.generateArchitecture(project.id);
            setArchitecture(arch);
        } catch (error) {
            console.error('Regeneration failed:', error);
        } finally {
            setRegenerating(false);
        }
    };

    const handleDownloadDocs = () => {
        if (!architecture?.documentation) return;
        const blob = new Blob([architecture.documentation], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project?.name || 'architecture'}-docs.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadDocx = async () => {
        if (!architecture) return;
        const token = getAuthToken();
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/architecture/${architecture.id}/docx`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
            console.error('DOCX download failed', res.status);
            return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project?.name || 'architecture'}-docs.docx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getDocxUrl = () => {
        if (!architecture) return '';
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        return `${baseUrl}/api/architecture/${architecture.id}/docx`;
    };

    const getSignedDocxUrl = async () => {
        if (!architecture) return '';
        const token = getAuthToken();
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseUrl}/api/architecture/${architecture.id}/docx-link`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
            console.error('DOCX link generation failed', res.status);
            return '';
        }
        const payload = await res.json();
        return payload.url as string;
    };

    const handleOpenDocx = async () => {
        const url = await getSignedDocxUrl();
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleCopyDocxLink = async () => {
        const url = await getSignedDocxUrl();
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // Ignore clipboard errors in restricted contexts.
        }
    };

    const handleSendChat = async () => {
        if (!project || sendingChat) return;
        const message = chatInput.trim();
        if (!message) return;

        const historyPayload: ProjectChatMessage[] = chatMessages
            .slice(-12)
            .map((item) => ({ role: item.role, content: item.content }));

        setChatMessages((prev) => [
            ...prev,
            { id: createMessageId(), role: 'user', content: message },
        ]);
        setChatInput('');
        setSendingChat(true);

        try {
            const response = await api.chatWithProject(project.id, message, historyPayload);
            setChatMessages((prev) => [
                ...prev,
                {
                    id: createMessageId(),
                    role: 'assistant',
                    content: response.reply || 'No response generated.',
                },
            ]);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : '';
            setChatMessages((prev) => [
                ...prev,
                {
                    id: createMessageId(),
                    role: 'assistant',
                    content: `I could not process that request. ${errorMessage}`.trim(),
                },
            ]);
        } finally {
            setSendingChat(false);
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
                    Loading Project...
                </p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="text-center py-20">
                <Warning size={48} weight="duotone" className="text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Project not found</p>
                <button onClick={() => router.push('/dashboard')} className="text-blue-400 text-sm font-mono mt-4 hover:underline">
                    ← Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-slate-500 hover:text-slate-300 text-xs font-mono uppercase tracking-wider flex items-center gap-1 mb-2 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back
                    </button>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Cube size={28} weight="duotone" className="text-blue-400" />
                        {project.name}
                    </h1>
                    {architecture?.architecture_pattern && (
                        <p className="text-cyan-400 font-mono text-sm mt-1">
                            Pattern: {architecture.architecture_pattern}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/dashboard/projects/${project.id}/advanced`)}
                        className="btn-secondary flex items-center gap-2 text-xs"
                    >
                        <Sparkle size={16} weight="duotone" /> Advanced
                    </button>
                    {architecture?.documentation && (
                        <ExportMenu
                            label="Export Docs"
                            onDownloadMd={handleDownloadDocs}
                            onDownloadDocx={handleDownloadDocx}
                            onOpenDocx={handleOpenDocx}
                            onCopyLink={handleCopyDocxLink}
                        />
                    )}
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="btn-primary flex items-center gap-2 text-xs"
                    >
                        <Lightning size={16} weight="fill" />
                        {regenerating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            {(architecture || activeTab === 'assistant') && (
                <>
                    <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-px">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isDisabled = !architecture && tab.key !== 'assistant';
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => !isDisabled && setActiveTab(tab.key)}
                                    disabled={isDisabled}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === tab.key
                                        ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-950/20'
                                        : 'text-slate-500 hover:text-slate-300'
                                        } ${isDisabled ? 'opacity-40 cursor-not-allowed hover:text-slate-500' : ''
                                        }`}
                                >
                                    <Icon size={16} weight="duotone" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="animate-scale-in">
                        {activeTab === 'overview' && architecture && (
                            <div className="space-y-6">
                                {/* Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-5">
                                        <p className="text-slate-500 text-xs uppercase font-mono mb-1">Pattern</p>
                                        <p className="text-lg font-bold text-blue-400">{architecture.architecture_pattern}</p>
                                    </div>
                                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-5">
                                        <p className="text-slate-500 text-xs uppercase font-mono mb-1">Components</p>
                                        <p className="text-lg font-bold text-slate-100 font-mono">{architecture.components?.length || 0}</p>
                                    </div>
                                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-5">
                                        <p className="text-slate-500 text-xs uppercase font-mono mb-1">Complexity</p>
                                        <p className="text-lg font-bold text-amber-400 font-mono">{architecture.complexity_score || '—'}/10</p>
                                    </div>
                                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-5">
                                        <p className="text-slate-500 text-xs uppercase font-mono mb-1">AI Model</p>
                                        <p className="text-sm font-mono text-cyan-400 truncate">{architecture.ai_model_used}</p>
                                    </div>
                                </div>
                                {/* Description */}
                                {architecture.architecture_description && (
                                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6">
                                        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Sparkle size={16} weight="duotone" /> Architecture Overview
                                        </h3>
                                        <p className="text-slate-300 leading-relaxed">{architecture.architecture_description}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'diagrams' && architecture && (
                            <div className="space-y-6">
                                {architecture.diagrams?.map((diagram, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <TreeStructure size={16} weight="duotone" />
                                            {diagram.title}
                                        </h3>
                                        <MermaidDiagram code={diagram.mermaid_code} id={`diagram-${idx}`} />
                                    </div>
                                ))}
                                {(!architecture.diagrams || architecture.diagrams.length === 0) && (
                                    <p className="text-slate-500 text-center py-12">No diagrams generated</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'components' && architecture && (
                            <div className="space-y-4">
                                {(() => {
                                    const grouped: Record<string, any[]> = {};
                                    architecture.components?.forEach(c => {
                                        const layer = c.layer || 'other';
                                        if (!grouped[layer]) grouped[layer] = [];
                                        grouped[layer].push(c);
                                    });
                                    return Object.entries(grouped).map(([layer, comps]) => {
                                        const colors = layerColors[layer] || layerColors.service;
                                        return (
                                            <div key={layer}>
                                                <h3 className={`text-sm font-mono uppercase tracking-widest mb-3 ${colors.text}`}>
                                                    {layer} Layer ({comps.length})
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {comps.map((comp, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-4 hover:scale-[1.01] transition-all`}
                                                        >
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h4 className={`font-bold text-sm ${colors.text}`}>{comp.name}</h4>
                                                                <span className="text-xs font-mono text-slate-500 uppercase">{comp.type}</span>
                                                            </div>
                                                            <p className="text-slate-400 text-sm mb-2">{comp.description}</p>
                                                            {comp.technology && (
                                                                <p className="text-xs font-mono text-slate-500">
                                                                    Tech: <span className="text-slate-300">{comp.technology}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}

                        {activeTab === 'infrastructure' && architecture && (
                            <div className="space-y-4">
                                {(() => {
                                    const grouped: Record<string, any[]> = {};
                                    architecture.infrastructure?.forEach(i => {
                                        const cat = i.category || 'other';
                                        if (!grouped[cat]) grouped[cat] = [];
                                        grouped[cat].push(i);
                                    });
                                    return Object.entries(grouped).map(([cat, items]) => {
                                        const colors = catColors[cat] || catColors.compute;
                                        return (
                                            <div key={cat}>
                                                <h3 className={`text-sm font-mono uppercase tracking-widest mb-3 ${colors.text}`}>
                                                    {cat} ({items.length})
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {items.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-4`}
                                                        >
                                                            <h4 className={`font-bold text-sm ${colors.text} mb-2`}>{item.name}</h4>
                                                            <p className="text-slate-400 text-sm mb-3">{item.description}</p>
                                                            {item.specifications && Object.keys(item.specifications).length > 0 && (
                                                                <div className="space-y-1">
                                                                    {Object.entries(item.specifications).map(([k, v]) => (
                                                                        <div key={k} className="flex justify-between text-xs">
                                                                            <span className="text-slate-500 font-mono uppercase">{k}:</span>
                                                                            <span className="text-slate-300 font-mono">{String(v)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}

                        {activeTab === 'optimizations' && architecture && (
                            <div className="space-y-3">
                                {architecture.optimization_suggestions?.map((opt, idx) => (
                                    <div key={idx} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck size={18} weight="duotone" className="text-blue-400" />
                                                <h4 className="font-bold text-sm text-slate-200">{opt.title}</h4>
                                            </div>
                                            <span className={`text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${priorityColors[opt.priority] || priorityColors.medium}`}>
                                                {opt.priority}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-2">{opt.description}</p>
                                        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                                            <span>Category: <span className="text-slate-300 uppercase">{opt.category}</span></span>
                                            <span>Impact: <span className="text-slate-300">{opt.impact}</span></span>
                                        </div>
                                    </div>
                                ))}
                                {(!architecture.optimization_suggestions || architecture.optimization_suggestions.length === 0) && (
                                    <p className="text-slate-500 text-center py-12">No optimizations generated</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'documentation' && architecture && (
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-8">
                                <div className="flex items-center justify-between mb-6 gap-3">
                                    <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={16} weight="duotone" /> Generated Documentation
                                    </h3>
                                    <ExportMenu
                                        label="Export Docs"
                                        onDownloadMd={handleDownloadDocs}
                                        onDownloadDocx={handleDownloadDocx}
                                        onOpenDocx={handleOpenDocx}
                                        onCopyLink={handleCopyDocxLink}
                                        variant="link"
                                    />
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none prose-headings:font-chivo prose-headings:uppercase prose-headings:tracking-wider prose-code:text-cyan-400 prose-code:bg-slate-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900/80 prose-pre:border prose-pre:border-slate-700/60">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                        {architecture.documentation || 'No documentation generated.'}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {activeTab === 'assistant' && (
                            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden flex flex-col h-[65vh] min-h-[460px]">
                                <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ChatCircleDots size={18} className="text-blue-400" weight="duotone" />
                                        <p className="text-xs font-mono text-slate-300 uppercase tracking-wider">Project Assistant</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300">
                                        <LockSimple size={12} />
                                        Scoped to project #{project.id}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {chatMessages.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`max-w-[85%] rounded-xl border px-4 py-3 ${item.role === 'user'
                                                ? 'ml-auto bg-blue-950/40 border-blue-800/60 text-slate-100'
                                                : 'bg-slate-900/70 border-slate-700/60 text-slate-200'
                                                }`}
                                        >
                                            <p className="text-[10px] font-mono uppercase tracking-wider mb-2 text-slate-500">
                                                {item.role === 'user' ? 'You' : 'Assistant'}
                                            </p>
                                            {item.role === 'assistant' ? (
                                                <div className="prose prose-invert prose-sm max-w-none prose-p:my-0 prose-ul:my-1 prose-li:my-0">
                                                    <ReactMarkdown>{item.content}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                            )}
                                        </div>
                                    ))}

                                    {sendingChat && (
                                        <div className="max-w-[85%] rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3">
                                            <p className="text-xs font-mono uppercase tracking-wider text-slate-500">Assistant</p>
                                            <p className="text-sm text-slate-400 mt-2">Thinking...</p>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className="border-t border-slate-700/60 p-3 bg-slate-900/40">
                                    <div className="flex gap-2">
                                        <textarea
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendChat();
                                                }
                                            }}
                                            className="input-modern min-h-[44px] max-h-[140px] resize-y"
                                            placeholder={`Ask about ${project.name} architecture...`}
                                        />
                                        <button
                                            onClick={handleSendChat}
                                            disabled={sendingChat || !chatInput.trim()}
                                            className="btn-primary flex items-center justify-center px-3"
                                            title="Send"
                                        >
                                            <PaperPlaneTilt size={16} weight="fill" />
                                        </button>
                                    </div>
                                    <p className="text-[11px] font-mono text-slate-500 mt-2">
                                        The assistant is restricted to this project context only.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!architecture && project.status !== 'processing' && (
                <div className="text-center py-16 space-y-4">
                    <Cube size={64} weight="duotone" className="text-slate-700 mx-auto" />
                    <p className="text-slate-400">No architecture generated yet</p>
                    <button onClick={handleRegenerate} className="btn-primary flex items-center gap-2 mx-auto">
                        <Lightning size={16} weight="fill" /> Generate Now
                    </button>
                </div>
            )}
        </div>
    );
}
