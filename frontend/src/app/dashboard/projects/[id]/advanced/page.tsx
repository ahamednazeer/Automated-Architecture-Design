'use client';

import React, { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    api,
    CostHeatmapResponse,
    InterviewEvaluationResponse,
    InterviewQuestion,
    InterviewQuestionsResponse,
    RiskRadarResponse,
    ScorecardResponse,
    StudentSimplifyResponse,
    SwapPreviewResponse,
    TimeMachineDiffResponse,
    TimeMachineTimelineResponse,
} from '@/lib/api';
import {
    ArrowLeft,
    ChartLineUp,
    ClockCounterClockwise,
    Sparkle,
    Target,
    CurrencyDollar,
    ArrowsLeftRight,
    Student,
    ChatCircleDots,
    Pulse,
    Lightning,
} from '@phosphor-icons/react';
import mermaid from 'mermaid';

interface Project {
    id: number;
    name: string;
    description: string | null;
    status: string;
}

const metricOrder = [
    'security',
    'scalability',
    'performance',
    'cost_efficiency',
    'maintainability',
    'reliability',
];

function prettyMetric(metric: string) {
    return metric.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function svgToPng(svg: string, scale: number = 2): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
            const width = Math.max(img.width, 600);
            const height = Math.max(img.height, 400);
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                URL.revokeObjectURL(url);
                reject(new Error('Canvas not supported'));
                return;
            }
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (!blob) {
                    reject(new Error('Failed to export PNG'));
                    return;
                }
                resolve(blob);
            }, 'image/png');
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load SVG'));
        };
        img.src = url;
    });
}

function MermaidDiagram({
    code,
    id,
    onSvg,
    className,
}: {
    code: string;
    id: string;
    onSvg?: (svg: string) => void;
    className?: string;
}) {
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
                fontSize: '12px',
            },
        });

        const render = async () => {
            try {
                const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '') || 'diagram';
                const uniqueId = `mermaid-tm-${safeId}-${Date.now()}`;
                const { svg } = await mermaid.render(uniqueId, code);
                setSvg(svg);
                onSvg?.(svg);
            } catch (e: any) {
                setError(e.message || 'Failed to render diagram');
            }
        };
        render();
    }, [code, id]);

    if (error) {
        return (
            <div className="bg-red-950/30 border border-red-800/50 rounded-sm p-3">
                <p className="text-red-400 text-xs font-mono">Diagram render error: {error}</p>
                <pre className="text-slate-500 text-[10px] mt-2 overflow-auto">{code}</pre>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`mermaid-container ${className || ''}`}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

function DiagramModal({
    open,
    title,
    code,
    onClose,
}: {
    open: boolean;
    title: string;
    code: string;
    onClose: () => void;
}) {
    const [svg, setSvg] = useState('');
    const [downloading, setDownloading] = useState(false);

    if (!open) return null;

    const handleDownloadSvg = () => {
        if (!svg) return;
        downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${title || 'diagram'}.svg`);
    };

    const handleDownloadPng = async () => {
        if (!svg) return;
        setDownloading(true);
        try {
            const blob = await svgToPng(svg, 2);
            downloadBlob(blob, `${title || 'diagram'}.png`);
        } catch {
            // Swallow and allow retry
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Diagram Preview</p>
                        <h3 className="text-sm font-chivo uppercase tracking-wider text-slate-100">{title || 'Diagram'}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadSvg}
                            disabled={!svg}
                            className="btn-secondary text-xs"
                        >
                            Download SVG
                        </button>
                        <button
                            onClick={handleDownloadPng}
                            disabled={!svg || downloading}
                            className="btn-secondary text-xs"
                        >
                            {downloading ? 'Exporting...' : 'Download PNG'}
                        </button>
                        <button
                            onClick={onClose}
                            className="btn-primary text-xs"
                        >
                            Close
                        </button>
                    </div>
                </div>
                <div className="p-4 overflow-auto max-h-[75vh]">
                    <MermaidDiagram code={code} id={`modal-${title}`} onSvg={setSvg} className="max-h-[70vh]" />
                </div>
            </div>
        </div>
    );
}

export default function AdvancedProjectFeaturesPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const projectId = Number(resolvedParams.id);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState<Project | null>(null);
    const [error, setError] = useState('');

    const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null);
    const [riskRadar, setRiskRadar] = useState<RiskRadarResponse | null>(null);
    const [costHeatmap, setCostHeatmap] = useState<CostHeatmapResponse | null>(null);
    const [timeMachine, setTimeMachine] = useState<TimeMachineTimelineResponse | null>(null);
    const [timeDiff, setTimeDiff] = useState<TimeMachineDiffResponse | null>(null);
    const [studentSimplify, setStudentSimplify] = useState<StudentSimplifyResponse | null>(null);
    const [swapPreview, setSwapPreview] = useState<SwapPreviewResponse | null>(null);
    const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestionsResponse | null>(null);
    const [interviewAnswers, setInterviewAnswers] = useState<string[]>([]);
    const [interviewEvaluation, setInterviewEvaluation] = useState<InterviewEvaluationResponse | null>(null);

    const [targetProvider, setTargetProvider] = useState('AWS');
    const [questionCount, setQuestionCount] = useState(5);
    const [answerStyle, setAnswerStyle] = useState<'concise' | 'detailed'>('concise');
    const [fromVersion, setFromVersion] = useState<number | null>(null);
    const [toVersion, setToVersion] = useState<number | null>(null);
    const [busy, setBusy] = useState<string>('');
    const [diagramModal, setDiagramModal] = useState<{ title: string; code: string } | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError('');
            try {
                const projectData = await api.getProject(projectId);
                if (!mounted) return;
                setProject(projectData);

                const results = await Promise.allSettled([
                    api.getProjectScorecard(projectId),
                    api.getProjectRiskRadar(projectId),
                    api.getProjectCostHeatmap(projectId),
                    api.getProjectTimeMachine(projectId),
                ]);
                if (!mounted) return;

                const [scoreRes, riskRes, costRes, timeRes] = results;
                if (scoreRes.status === 'fulfilled') setScorecard(scoreRes.value);
                if (riskRes.status === 'fulfilled') setRiskRadar(riskRes.value);
                if (costRes.status === 'fulfilled') setCostHeatmap(costRes.value);
                if (timeRes.status === 'fulfilled') {
                    setTimeMachine(timeRes.value);
                    const versions = timeRes.value.versions;
                    if (versions.length >= 2) {
                        setFromVersion(versions[versions.length - 2].version);
                        setToVersion(versions[versions.length - 1].version);
                    } else if (versions.length === 1) {
                        setFromVersion(versions[0].version);
                        setToVersion(versions[0].version);
                    }
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load project';
                if (mounted) setError(message);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, [projectId]);

    useEffect(() => {
        if (!timeMachine?.versions?.length) return;
        const latest = timeMachine.versions[timeMachine.versions.length - 1].version;
        setSelectedVersion((prev) => {
            if (!prev) return latest;
            const exists = timeMachine.versions.some((v) => v.version === prev);
            return exists ? prev : latest;
        });
    }, [timeMachine]);

    const timelineVersions = useMemo(() => {
        return timeMachine?.versions?.slice().sort((a, b) => b.version - a.version) || [];
    }, [timeMachine]);

    const selectedVersionData = useMemo(() => {
        if (!timelineVersions.length) return null;
        if (selectedVersion === null) return timelineVersions[0];
        return timelineVersions.find((item) => item.version === selectedVersion) || timelineVersions[0];
    }, [timelineVersions, selectedVersion]);

    useEffect(() => {
        if (interviewQuestions?.questions) {
            setInterviewAnswers(interviewQuestions.questions.map(() => ''));
            setInterviewEvaluation(null);
        }
    }, [interviewQuestions]);

    const maxCost = useMemo(() => {
        if (!costHeatmap?.top_cost_drivers.length) return 1;
        return Math.max(...costHeatmap.top_cost_drivers.map((item) => item.estimated_monthly_usd), 1);
    }, [costHeatmap]);

    const handleGenerateSimplify = async () => {
        setBusy('simplify');
        try {
            setStudentSimplify(await api.getStudentSimplify(projectId));
        } catch (err) {
            console.error('Student simplify failed', err);
        } finally {
            setBusy('');
        }
    };

    const handleSwapPreview = async () => {
        setBusy('swap');
        try {
            setSwapPreview(await api.getSwapPreview(projectId, targetProvider));
        } catch (err) {
            console.error('Swap preview failed', err);
        } finally {
            setBusy('');
        }
    };

    const handleGenerateQuestions = async () => {
        setBusy('questions');
        try {
            setInterviewQuestions(await api.generateInterviewQuestions(projectId, questionCount));
        } catch (err) {
            console.error('Interview question generation failed', err);
        } finally {
            setBusy('');
        }
    };

    const handleEvaluateInterview = async () => {
        if (!interviewQuestions?.questions?.length) return;
        setBusy('evaluate');
        try {
            const evaluation = await api.evaluateInterviewAnswers(
                projectId,
                interviewQuestions.questions,
                interviewAnswers
            );
            setInterviewEvaluation(evaluation);
        } catch (err) {
            console.error('Interview evaluation failed', err);
        } finally {
            setBusy('');
        }
    };

    const handleGenerateAnswers = async () => {
        if (!interviewQuestions?.questions?.length) return;
        setBusy('genanswers');
        try {
            const generated = await api.generateInterviewAnswers(
                projectId,
                interviewQuestions.questions,
                answerStyle
            );

            const mapped = interviewQuestions.questions.map((question) => {
                const found = generated.answers.find((item) => item.id === question.id);
                return found?.suggested_answer || '';
            });
            setInterviewAnswers(mapped);
            setInterviewEvaluation(null);
        } catch (err) {
            console.error('Interview answer generation failed', err);
        } finally {
            setBusy('');
        }
    };

    const handleCompareVersions = async () => {
        if (!fromVersion || !toVersion) return;
        setBusy('compare');
        try {
            setTimeDiff(await api.getProjectTimeMachineDiff(projectId, fromVersion, toVersion));
        } catch (err) {
            console.error('Time machine diff failed', err);
        } finally {
            setBusy('');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-72 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <Pulse size={24} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                </div>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Loading Advanced Features...</p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="text-center py-20">
                <p className="text-red-400">{error || 'Project not found'}</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="text-blue-400 text-sm font-mono mt-4 hover:underline"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <button
                        onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                        className="text-slate-500 hover:text-slate-300 text-xs font-mono uppercase tracking-wider flex items-center gap-1 mb-2 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Project
                    </button>
                    <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                        <Sparkle size={26} className="text-cyan-400" weight="duotone" />
                        Advanced Features
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {project.name}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <section className="card rounded-xl">
                    <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                        <Target size={16} className="text-blue-400" /> Architecture Scorecard
                    </h2>
                    {scorecard ? (
                        <div className="space-y-3">
                            <div className="flex items-end justify-between">
                                <p className="text-4xl font-bold text-blue-300">{scorecard.overall}</p>
                                <p className="text-sm font-mono text-slate-400">Grade {scorecard.grade}</p>
                            </div>
                            {metricOrder.map((metric) => {
                                const value = scorecard.scores[metric] ?? 0;
                                return (
                                    <div key={metric}>
                                        <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                                            <span>{prettyMetric(metric)}</span>
                                            <span>{value}</span>
                                        </div>
                                        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${value}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="text-xs text-slate-500 font-mono pt-2">
                                Strengths: {scorecard.strengths.join(' • ')}
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No architecture score available yet.</p>
                    )}
                </section>

                <section className="card rounded-xl">
                    <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                        <ChartLineUp size={16} className="text-amber-400" /> Risk Radar Dashboard
                    </h2>
                    {riskRadar?.trend?.length ? (
                        <div className="space-y-3">
                            {riskRadar.trend.slice().reverse().slice(0, 4).map((point) => (
                                <div key={point.version} className="bg-slate-900/50 border border-slate-700/50 rounded-sm p-3">
                                    <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                                        <span>Version {point.version}</span>
                                        <span>Overall Risk {point.overall_risk}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                                        <span>Sec: {point.security}</span>
                                        <span>Scale: {point.scalability}</span>
                                        <span>Perf: {point.performance}</span>
                                        <span>Cost: {point.cost_efficiency}</span>
                                        <span>Main: {point.maintainability}</span>
                                        <span>Rel: {point.reliability}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No risk data available yet.</p>
                    )}
                </section>

                <section className="card rounded-xl">
                    <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                        <ClockCounterClockwise size={16} className="text-purple-400" /> Architecture Time Machine
                    </h2>
                    {timeMachine?.versions?.length ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="bg-slate-900/50 border border-slate-700/50 rounded-sm p-3">
                                    <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3">Version Timeline</p>
                                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                                        {timelineVersions.map((item) => {
                                            const isActive = selectedVersionData?.version === item.version;
                                            return (
                                                <button
                                                    key={`timeline-${item.version}`}
                                                    onClick={() => setSelectedVersion(item.version)}
                                                    className={`w-full text-left border rounded-sm px-3 py-2 transition-colors ${isActive
                                                        ? 'border-blue-500/70 bg-blue-950/40 text-slate-100'
                                                        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between text-xs font-mono">
                                                        <span>v{item.version}</span>
                                                        <span className="text-slate-500">
                                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                                                        {item.pattern || 'Pattern not specified'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500 mt-2">
                                                        <span>Score: <span className="text-slate-300">{item.overall_score ?? '—'} {item.grade ? `(${item.grade})` : ''}</span></span>
                                                        <span>Components: <span className="text-slate-300">{item.component_count}</span></span>
                                                        <span>Infra: <span className="text-slate-300">{item.infrastructure_count}</span></span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="lg:col-span-2 space-y-4">
                                    {selectedVersionData ? (
                                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-sm p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Selected Version</p>
                                                    <h3 className="text-sm font-chivo uppercase tracking-wider text-slate-100">
                                                        Version {selectedVersionData.version}
                                                    </h3>
                                                    {selectedVersionData.change_summary ? (
                                                        <p className="text-xs text-slate-400 mt-2">
                                                            {selectedVersionData.change_summary}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <div className="text-right text-[11px] font-mono text-slate-500 space-y-1">
                                                    <p>Model: <span className="text-slate-300">{selectedVersionData.ai_model_used || '—'}</span></p>
                                                    <p>Score: <span className="text-slate-300">{selectedVersionData.overall_score ?? '—'} {selectedVersionData.grade ? `(${selectedVersionData.grade})` : ''}</span></p>
                                                    <p>Complexity: <span className="text-slate-300">{selectedVersionData.complexity_score ?? '—'}</span></p>
                                                </div>
                                            </div>

                                            {selectedVersionData.architecture_description ? (
                                                <p className="text-xs text-slate-400">{selectedVersionData.architecture_description}</p>
                                            ) : null}

                                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                                                <span>Pattern: <span className="text-slate-200">{selectedVersionData.pattern || '—'}</span></span>
                                                <span>Components: <span className="text-slate-200">{selectedVersionData.component_count}</span></span>
                                                <span>Infrastructure: <span className="text-slate-200">{selectedVersionData.infrastructure_count}</span></span>
                                                <span>Optimizations: <span className="text-slate-200">{selectedVersionData.optimization_count ?? 0}</span></span>
                                                <span>Quality: <span className="text-slate-200">{selectedVersionData.quality_score ?? '—'}</span></span>
                                                <span>Created: <span className="text-slate-200">{selectedVersionData.created_at ? new Date(selectedVersionData.created_at).toLocaleString() : '—'}</span></span>
                                            </div>

                                            {selectedVersionData.components_preview?.length ? (
                                                <p className="text-[11px] text-slate-500">
                                                    Top Components: <span className="text-slate-300">{selectedVersionData.components_preview.join(', ')}</span>
                                                </p>
                                            ) : null}
                                            {selectedVersionData.infrastructure_preview?.length ? (
                                                <p className="text-[11px] text-slate-500">
                                                    Top Infra: <span className="text-slate-300">{selectedVersionData.infrastructure_preview.join(', ')}</span>
                                                </p>
                                            ) : null}

                                            {(selectedVersionData.components?.length || selectedVersionData.infrastructure?.length || selectedVersionData.optimization_suggestions?.length) ? (
                                                <details className="mt-2 border border-slate-800 rounded-sm px-3 py-2">
                                                    <summary className="cursor-pointer text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                                                        View Full Details
                                                    </summary>
                                                    <div className="mt-3 space-y-4">
                                                        {selectedVersionData.components?.length ? (
                                                            <div>
                                                                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                                                                    Components ({selectedVersionData.components.length})
                                                                </p>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                    {selectedVersionData.components.map((comp, idx) => (
                                                                        <div key={`comp-${selectedVersionData.version}-${idx}`} className="bg-slate-950/60 border border-slate-800 rounded-sm p-2">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <p className="text-slate-200 text-xs font-semibold">{comp.name || 'Unnamed'}</p>
                                                                                <span className="text-[10px] uppercase font-mono text-slate-500">
                                                                                    {comp.type || 'service'}
                                                                                </span>
                                                                            </div>
                                                                            {comp.description ? (
                                                                                <p className="text-[11px] text-slate-500 mt-1">{comp.description}</p>
                                                                            ) : null}
                                                                            <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500 mt-2">
                                                                                {comp.layer ? <span>Layer: <span className="text-slate-300">{comp.layer}</span></span> : null}
                                                                                {comp.technology ? <span>Tech: <span className="text-slate-300">{comp.technology}</span></span> : null}
                                                                            </div>
                                                                            {comp.connections?.length ? (
                                                                                <p className="text-[10px] text-slate-500 mt-2">
                                                                                    Connections: <span className="text-slate-300">{comp.connections.join(', ')}</span>
                                                                                </p>
                                                                            ) : null}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        {selectedVersionData.infrastructure?.length ? (
                                                            <div>
                                                                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                                                                    Infrastructure ({selectedVersionData.infrastructure.length})
                                                                </p>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                    {selectedVersionData.infrastructure.map((infra, idx) => (
                                                                        <div key={`infra-${selectedVersionData.version}-${idx}`} className="bg-slate-950/60 border border-slate-800 rounded-sm p-2">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <p className="text-slate-200 text-xs font-semibold">{infra.name || 'Unnamed'}</p>
                                                                                <span className="text-[10px] uppercase font-mono text-slate-500">
                                                                                    {infra.category || 'other'}
                                                                                </span>
                                                                            </div>
                                                                            {infra.description ? (
                                                                                <p className="text-[11px] text-slate-500 mt-1">{infra.description}</p>
                                                                            ) : null}
                                                                            {infra.specifications ? (
                                                                                <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                                                                                    {Object.entries(infra.specifications).map(([k, v]) => (
                                                                                        <div key={`${selectedVersionData.version}-${infra.name}-${k}`} className="flex justify-between gap-2">
                                                                                            <span className="uppercase font-mono">{k}:</span>
                                                                                            <span className="text-slate-300">{String(v)}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        {selectedVersionData.optimization_suggestions?.length ? (
                                                            <div>
                                                                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                                                                    Optimization Suggestions ({selectedVersionData.optimization_suggestions.length})
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {selectedVersionData.optimization_suggestions.map((opt, idx) => (
                                                                        <div key={`opt-${selectedVersionData.version}-${idx}`} className="bg-slate-950/60 border border-slate-800 rounded-sm p-2">
                                                                            <div className="flex items-center justify-between">
                                                                                <p className="text-slate-200 text-xs font-semibold">{opt.title || 'Suggestion'}</p>
                                                                                {opt.priority ? (
                                                                                    <span className="text-[10px] uppercase font-mono text-slate-500">{opt.priority}</span>
                                                                                ) : null}
                                                                            </div>
                                                                            {opt.description ? (
                                                                                <p className="text-[11px] text-slate-500 mt-1">{opt.description}</p>
                                                                            ) : null}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        {selectedVersionData.documentation_excerpt ? (
                                                            <div>
                                                                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                                                                    Documentation Excerpt ({selectedVersionData.documentation_length ?? 0} chars)
                                                                </p>
                                                                <div className="bg-slate-950/60 border border-slate-800 rounded-sm p-2">
                                                                    <p className="text-[11px] text-slate-400 whitespace-pre-wrap">
                                                                        {selectedVersionData.documentation_excerpt}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : null}

                                                        {selectedVersionData.diagrams?.length ? (
                                                            <div>
                                                                <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                                                                    Diagrams ({selectedVersionData.diagrams_count ?? selectedVersionData.diagrams.length})
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {selectedVersionData.diagrams.map((diagram, idx) => (
                                                                        <details key={`diag-${selectedVersionData.version}-${idx}`} className="bg-slate-950/60 border border-slate-800 rounded-sm p-2">
                                                                            <summary className="cursor-pointer text-slate-300 text-[11px] font-mono uppercase tracking-wider">
                                                                                {diagram.title || `Diagram ${idx + 1}`} {diagram.type ? `(${diagram.type})` : ''}
                                                                            </summary>
                                                                            {diagram.mermaid_code ? (
                                                                                <div className="mt-2 space-y-2">
                                                                                    <div className="flex items-center justify-end">
                                                                                        <button
                                                                                            onClick={() => setDiagramModal({
                                                                                                title: diagram.title || `Diagram ${idx + 1}`,
                                                                                                code: diagram.mermaid_code,
                                                                                            })}
                                                                                            className="btn-secondary text-[10px]"
                                                                                        >
                                                                                            Open Large View
                                                                                        </button>
                                                                                    </div>
                                                                                    <MermaidDiagram code={diagram.mermaid_code} id={`tm-${selectedVersionData.version}-${idx}`} />
                                                                                    <details className="border border-slate-800 rounded-sm px-2 py-1">
                                                                                        <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                                                                            View Mermaid Code
                                                                                        </summary>
                                                                                        <pre className="text-[10px] text-cyan-300 overflow-auto mt-2">{diagram.mermaid_code}</pre>
                                                                                    </details>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-[11px] text-slate-500 mt-2">No mermaid code available.</p>
                                                                            )}
                                                                        </details>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </details>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-sm p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Compare Versions</p>
                                            <p className="text-[11px] font-mono text-slate-500">Pick two versions and compare changes</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <select
                                                value={fromVersion || ''}
                                                onChange={(e) => setFromVersion(Number(e.target.value))}
                                                className="select-modern"
                                            >
                                                {timeMachine.versions.map((item) => (
                                                    <option key={`from-${item.version}`} value={item.version}>
                                                        From v{item.version}
                                                    </option>
                                                ))}
                                            </select>
                                            <select
                                                value={toVersion || ''}
                                                onChange={(e) => setToVersion(Number(e.target.value))}
                                                className="select-modern"
                                            >
                                                {timeMachine.versions.map((item) => (
                                                    <option key={`to-${item.version}`} value={item.version}>
                                                        To v{item.version}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <button onClick={handleCompareVersions} className="btn-secondary" disabled={busy === 'compare'}>
                                            {busy === 'compare' ? 'Comparing...' : 'Compare Versions'}
                                        </button>
                                        {timeDiff && (
                                            <div className="bg-slate-950/60 border border-slate-800 rounded-sm p-3 text-xs text-slate-400 space-y-2">
                                                <p className="font-mono text-slate-300">
                                                    v{timeDiff.from_version} → v{timeDiff.to_version} | Score Δ {timeDiff.overall_score_delta}
                                                </p>
                                                <p>Added Components: {timeDiff.components_added.join(', ') || 'None'}</p>
                                                <p>Removed Components: {timeDiff.components_removed.join(', ') || 'None'}</p>
                                                <p>Added Infra: {timeDiff.infrastructure_added.join(', ') || 'None'}</p>
                                                <p>Removed Infra: {timeDiff.infrastructure_removed.join(', ') || 'None'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No versions available yet.</p>
                    )}
                </section>

                <section className="card rounded-xl">
                    <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                        <CurrencyDollar size={16} className="text-green-400" /> Cost-to-Design Heatmap
                    </h2>
                    {costHeatmap?.top_cost_drivers?.length ? (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-300 font-mono">
                                Estimated Monthly Total: ${costHeatmap.total_estimated_monthly_usd.toLocaleString()}
                            </p>
                            {costHeatmap.top_cost_drivers.slice(0, 8).map((item) => (
                                <div key={`${item.bucket}-${item.name}`} className="space-y-1">
                                    <div className="flex justify-between text-xs font-mono text-slate-400">
                                        <span className="truncate">{item.name}</span>
                                        <span>${item.estimated_monthly_usd.toFixed(2)}</span>
                                    </div>
                                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-300"
                                            style={{ width: `${(item.estimated_monthly_usd / maxCost) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">No cost estimate available yet.</p>
                    )}
                </section>

                <section className="card rounded-xl">
                    <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                        <ArrowsLeftRight size={16} className="text-cyan-400" /> Tech Stack Swap Preview
                    </h2>
                    <div className="space-y-3">
                        <select
                            value={targetProvider}
                            onChange={(e) => setTargetProvider(e.target.value)}
                            className="select-modern"
                        >
                            <option value="AWS">AWS</option>
                            <option value="Azure">Azure</option>
                            <option value="GCP">GCP</option>
                        </select>
                        <button onClick={handleSwapPreview} className="btn-secondary" disabled={busy === 'swap'}>
                            {busy === 'swap' ? 'Generating Preview...' : 'Generate Swap Preview'}
                        </button>
                        {swapPreview && (
                            <div className="space-y-2">
                                <p className="text-xs font-mono text-slate-400">
                                    Effort: <span className="text-slate-200">{swapPreview.estimated_migration_effort}</span>
                                </p>
                                <div className="max-h-44 overflow-y-auto border border-slate-700/50 rounded-sm">
                                    {swapPreview.changes.map((change, idx) => (
                                        <div key={`${change.existing}-${idx}`} className="p-2 border-b last:border-b-0 border-slate-800 text-xs">
                                            <p className="text-slate-500 uppercase font-mono">{change.category}</p>
                                            <p className="text-slate-200">{change.existing}</p>
                                            <p className="text-cyan-300">→ {change.suggested}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="card rounded-xl">
                    <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                        <Student size={16} className="text-yellow-400" /> Student Simplify Mode
                    </h2>
                    <div className="space-y-3">
                        <button onClick={handleGenerateSimplify} className="btn-secondary" disabled={busy === 'simplify'}>
                            {busy === 'simplify' ? 'Preparing...' : 'Generate Simplified Notes'}
                        </button>
                        {studentSimplify && (
                            <div className="space-y-3 text-sm">
                                <div className="bg-slate-900/50 border border-slate-700/50 rounded-sm p-3">
                                    <p className="text-xs font-mono uppercase text-slate-500 mb-2">Simple Explanation</p>
                                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                        {studentSimplify.simple_explanation_points.map((item, idx) => (
                                            <li key={`simple-${idx}`}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-700/50 rounded-sm p-3">
                                    <p className="text-xs font-mono uppercase text-slate-500 mb-2">Exam-Ready Notes</p>
                                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                        {studentSimplify.exam_ready_notes.map((item, idx) => (
                                            <li key={`exam-${idx}`}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-slate-950 border border-slate-700/50 rounded-sm p-3">
                                    <p className="text-xs font-mono uppercase text-slate-500 mb-2">Simple Mermaid</p>
                                    <pre className="text-xs text-cyan-300 overflow-auto">{studentSimplify.simple_mermaid}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <section className="card rounded-xl">
                <h2 className="text-sm font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
                    <ChatCircleDots size={16} className="text-pink-400" /> Architecture Interview Mode
                </h2>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            className="select-modern max-w-44"
                        >
                            <option value={3}>3 Questions</option>
                            <option value={5}>5 Questions</option>
                            <option value={7}>7 Questions</option>
                        </select>
                        <button onClick={handleGenerateQuestions} className="btn-secondary" disabled={busy === 'questions'}>
                            {busy === 'questions' ? 'Generating...' : 'Generate Questions'}
                        </button>
                        {interviewQuestions?.questions?.length ? (
                            <>
                                <select
                                    value={answerStyle}
                                    onChange={(e) => setAnswerStyle(e.target.value as 'concise' | 'detailed')}
                                    className="select-modern max-w-44"
                                >
                                    <option value="concise">Concise Answers</option>
                                    <option value="detailed">Detailed Answers</option>
                                </select>
                                <button onClick={handleGenerateAnswers} className="btn-secondary" disabled={busy === 'genanswers'}>
                                    {busy === 'genanswers' ? 'Generating Answers...' : 'Generate Answers'}
                                </button>
                            </>
                        ) : null}
                        {interviewQuestions?.questions?.length ? (
                            <button onClick={handleEvaluateInterview} className="btn-primary" disabled={busy === 'evaluate'}>
                                {busy === 'evaluate' ? 'Evaluating...' : 'Evaluate Answers'}
                            </button>
                        ) : null}
                    </div>

                    {interviewQuestions?.questions?.length ? (
                        <div className="space-y-3">
                            {interviewQuestions.questions.map((question: InterviewQuestion, idx: number) => (
                                <div key={question.id} className="bg-slate-900/50 border border-slate-700/50 rounded-sm p-3">
                                    <p className="text-slate-300 text-sm font-medium">{question.id}. {question.question}</p>
                                    <textarea
                                        value={interviewAnswers[idx] || ''}
                                        onChange={(e) => {
                                            const updated = [...interviewAnswers];
                                            updated[idx] = e.target.value;
                                            setInterviewAnswers(updated);
                                        }}
                                        className="input-modern mt-2 min-h-[88px] resize-y"
                                        placeholder="Write your answer..."
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">Generate questions to start interview practice.</p>
                    )}

                    {interviewEvaluation && (
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-sm p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <Lightning size={18} className="text-yellow-400" weight="fill" />
                                <p className="text-slate-200 font-mono">
                                    Score: {interviewEvaluation.overall_score} ({interviewEvaluation.level})
                                </p>
                            </div>
                            <p className="text-slate-400 text-sm mb-3">{interviewEvaluation.summary}</p>
                            <div className="space-y-2">
                                {interviewEvaluation.results.map((result) => (
                                    <div key={result.id} className="text-xs text-slate-400 border border-slate-800 rounded-sm p-2">
                                        <p className="text-slate-300">{result.id}: {result.score}</p>
                                        <p>{result.feedback}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <DiagramModal
                open={Boolean(diagramModal)}
                title={diagramModal?.title || 'Diagram'}
                code={diagramModal?.code || ''}
                onClose={() => setDiagramModal(null)}
            />
        </div>
    );
}
