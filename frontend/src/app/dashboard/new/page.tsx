'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
    PlusCircle,
    Lightning,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    Info,
} from '@phosphor-icons/react';

interface FormData {
    name: string;
    description: string;
    application_type: string;
    system_purpose: string;
    expected_users: string;
    traffic_load: string;
    performance_requirements: string;
    security_requirements: string;
    deployment_environment: string;
    cloud_provider: string;
    availability_requirements: string;
    budget_constraints: string;
    scaling_strategy: string;
    geographic_distribution: string;
}

const STEPS = [
    { title: 'Project Info', description: 'Name and describe your project' },
    { title: 'Application Details', description: 'Define your application type and purpose' },
    { title: 'Infrastructure', description: 'Set deployment and scaling preferences' },
    { title: 'Requirements', description: 'Define performance and security needs' },
];

export default function NewProjectPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');
    const [simpleStudentProject, setSimpleStudentProject] = useState(false);
    const [form, setForm] = useState<FormData>({
        name: '',
        description: '',
        application_type: 'Web Application',
        system_purpose: '',
        expected_users: '10,000',
        traffic_load: 'Medium',
        performance_requirements: '',
        security_requirements: '',
        deployment_environment: 'Cloud',
        cloud_provider: 'AWS',
        availability_requirements: 'High',
        budget_constraints: 'Medium',
        scaling_strategy: 'Horizontal',
        geographic_distribution: 'Single Region',
    });

    const updateField = (field: keyof FormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = async () => {
        if (!form.name || !form.system_purpose) return;

        setGenerating(true);
        try {
            setGenerationStatus('Creating project...');
            const requirementsPayload = {
                application_type: form.application_type,
                system_purpose: form.system_purpose,
                expected_users: form.expected_users,
                traffic_load: form.traffic_load,
                performance_requirements: form.performance_requirements,
                security_requirements: form.security_requirements,
                deployment_environment: form.deployment_environment,
                availability_requirements: form.availability_requirements,
                budget_constraints: form.budget_constraints,
                ...(simpleStudentProject
                    ? {}
                    : {
                        cloud_provider: form.cloud_provider,
                        scaling_strategy: form.scaling_strategy,
                        geographic_distribution: form.geographic_distribution,
                    }),
            };

            const project = await api.createProject({
                name: form.name,
                description: form.description,
                requirements: requirementsPayload,
            });

            setGenerationStatus('Analyzing requirements with Groq AI...');
            await api.generateArchitecture(project.id);

            setGenerationStatus('Architecture generated!');
            setTimeout(() => {
                router.push(`/dashboard/projects/${project.id}`);
            }, 500);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('Generation failed:', error);
            setGenerationStatus(`Error: ${message}`);
            setGenerating(false);
        }
    };

    const canAdvance = () => {
        switch (step) {
            case 0: return form.name.length > 0;
            case 1: return form.system_purpose.length > 0;
            default: return true;
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <PlusCircle size={28} weight="duotone" className="text-blue-400" />
                    New Architecture Project
                </h1>
                <p className="text-slate-500 mt-1">Define your requirements and let AI design your architecture</p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2">
                {STEPS.map((s, idx) => (
                    <React.Fragment key={idx}>
                        <button
                            onClick={() => !generating && idx <= step && setStep(idx)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-mono uppercase tracking-wider transition-all ${idx === step
                                ? 'bg-blue-950/50 text-blue-400 border border-blue-800'
                                : idx < step
                                    ? 'bg-green-950/50 text-green-400 border border-green-800'
                                    : 'text-slate-600 border border-slate-800'
                                }`}
                        >
                            {idx < step ? <CheckCircle size={14} /> : <span className="w-4 text-center">{idx + 1}</span>}
                            <span className="hidden sm:inline">{s.title}</span>
                        </button>
                        {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-800" />}
                    </React.Fragment>
                ))}
            </div>

            {/* Form */}
            {!generating ? (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-8 space-y-6 animate-scale-in">
                    <div>
                        <h2 className="text-lg font-chivo font-bold uppercase tracking-wider text-slate-200">
                            {STEPS[step].title}
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">{STEPS[step].description}</p>
                    </div>

                    {step === 0 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                    Project Name *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => updateField('name', e.target.value)}
                                    className="input-modern"
                                    placeholder="e.g., E-Commerce Platform v2"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                    Description
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={e => updateField('description', e.target.value)}
                                    className="input-modern min-h-[100px] resize-y"
                                    placeholder="Brief overview of the project..."
                                />
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                    Application Type
                                </label>
                                <select
                                    value={form.application_type}
                                    onChange={e => updateField('application_type', e.target.value)}
                                    className="select-modern"
                                >
                                    <option value="Web Application">Web Application</option>
                                    <option value="Mobile Application">Mobile Application</option>
                                    <option value="IoT System">IoT System</option>
                                    <option value="Data Platform">Data Platform</option>
                                    <option value="API Service">API Service</option>
                                    <option value="Desktop Application">Desktop Application</option>
                                    <option value="Embedded System">Embedded System</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                    System Purpose *
                                </label>
                                <textarea
                                    value={form.system_purpose}
                                    onChange={e => updateField('system_purpose', e.target.value)}
                                    className="input-modern min-h-[120px] resize-y"
                                    placeholder="Describe what the system does, its key features, and target users..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                        Expected Users
                                    </label>
                                    <select
                                        value={form.expected_users}
                                        onChange={e => updateField('expected_users', e.target.value)}
                                        className="select-modern"
                                    >
                                        <option value="100">Small (&#60;100)</option>
                                        <option value="1,000">Medium (1K)</option>
                                        <option value="10,000">Large (10K)</option>
                                        <option value="100,000">Very Large (100K)</option>
                                        <option value="1,000,000">Massive (1M+)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                        Traffic Load
                                    </label>
                                    <select
                                        value={form.traffic_load}
                                        onChange={e => updateField('traffic_load', e.target.value)}
                                        className="select-modern"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Very High">Very High</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={simpleStudentProject}
                                        onChange={(e) => setSimpleStudentProject(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">Simple Student Project</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Skip advanced options: Cloud Provider, Scaling Strategy, Geographic Distribution.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                        Deployment Environment
                                    </label>
                                    <select
                                        value={form.deployment_environment}
                                        onChange={e => updateField('deployment_environment', e.target.value)}
                                        className="select-modern"
                                    >
                                        <option value="Cloud">Cloud</option>
                                        <option value="On-Premise">On-Premise</option>
                                        <option value="Hybrid">Hybrid</option>
                                        <option value="Edge">Edge</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                        Availability
                                    </label>
                                    <select
                                        value={form.availability_requirements}
                                        onChange={e => updateField('availability_requirements', e.target.value)}
                                        className="select-modern"
                                    >
                                        <option value="Standard">Standard (99%)</option>
                                        <option value="High">High (99.9%)</option>
                                        <option value="Mission Critical">Mission Critical (99.99%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                        Budget
                                    </label>
                                    <select
                                        value={form.budget_constraints}
                                        onChange={e => updateField('budget_constraints', e.target.value)}
                                        className="select-modern"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Unlimited">Unlimited</option>
                                    </select>
                                </div>
                            </div>

                            {!simpleStudentProject && (
                                <>
                                    <div>
                                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                            Cloud Provider
                                        </label>
                                        <select
                                            value={form.cloud_provider}
                                            onChange={e => updateField('cloud_provider', e.target.value)}
                                            className="select-modern"
                                        >
                                            <option value="AWS">AWS</option>
                                            <option value="Azure">Azure</option>
                                            <option value="GCP">Google Cloud</option>
                                            <option value="Any">Any / Multi-cloud</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                                Scaling Strategy
                                            </label>
                                            <select
                                                value={form.scaling_strategy}
                                                onChange={e => updateField('scaling_strategy', e.target.value)}
                                                className="select-modern"
                                            >
                                                <option value="Vertical">Vertical</option>
                                                <option value="Horizontal">Horizontal</option>
                                                <option value="Auto">Auto Scaling</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                                Geographic Distribution
                                            </label>
                                            <select
                                                value={form.geographic_distribution}
                                                onChange={e => updateField('geographic_distribution', e.target.value)}
                                                className="select-modern"
                                            >
                                                <option value="Single Region">Single Region</option>
                                                <option value="Multi Region">Multi Region</option>
                                                <option value="Global">Global</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                    Performance Requirements
                                </label>
                                <textarea
                                    value={form.performance_requirements}
                                    onChange={e => updateField('performance_requirements', e.target.value)}
                                    className="input-modern min-h-[100px] resize-y"
                                    placeholder="e.g., Sub-second API response times, handle 10K concurrent connections..."
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-mono">
                                    Security Requirements
                                </label>
                                <textarea
                                    value={form.security_requirements}
                                    onChange={e => updateField('security_requirements', e.target.value)}
                                    className="input-modern min-h-[100px] resize-y"
                                    placeholder="e.g., SOC2 compliance, encryption at rest, OAuth2 authentication..."
                                />
                            </div>

                            {/* Summary */}
                            <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-5 space-y-3">
                                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info size={16} weight="duotone" />
                                    Project Summary
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-slate-500 font-mono text-xs">Name:</span> <span className="text-slate-200">{form.name || '—'}</span></div>
                                    <div><span className="text-slate-500 font-mono text-xs">Type:</span> <span className="text-slate-200">{form.application_type}</span></div>
                                    <div><span className="text-slate-500 font-mono text-xs">Users:</span> <span className="text-slate-200">{form.expected_users}</span></div>
                                    <div><span className="text-slate-500 font-mono text-xs">Cloud:</span> <span className="text-slate-200">{simpleStudentProject ? 'Excluded' : form.cloud_provider}</span></div>
                                    <div><span className="text-slate-500 font-mono text-xs">Availability:</span> <span className="text-slate-200">{form.availability_requirements}</span></div>
                                    <div><span className="text-slate-500 font-mono text-xs">Scaling:</span> <span className="text-slate-200">{simpleStudentProject ? 'Excluded' : form.scaling_strategy}</span></div>
                                </div>
                                {simpleStudentProject && (
                                    <p className="text-xs text-slate-500 font-mono pt-1">
                                        Geographic Distribution: Excluded
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <button
                            onClick={() => setStep(Math.max(0, step - 1))}
                            disabled={step === 0}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-mono uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                        {step < STEPS.length - 1 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!canAdvance()}
                                className="btn-primary flex items-center gap-2"
                            >
                                Next <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={!canAdvance()}
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-sm font-medium tracking-wide uppercase text-sm px-6 py-2.5 shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Lightning size={18} weight="fill" /> Generate Architecture
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                /* Generation Status */
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center space-y-6 animate-scale-in">
                    <div className="relative inline-block">
                        <div className="w-20 h-20 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                        <Lightning size={32} weight="fill" className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-chivo font-bold uppercase tracking-wider text-slate-200">
                            Generating Architecture
                        </h2>
                        <p className="text-blue-400 font-mono text-sm mt-3 animate-pulse">
                            {generationStatus}
                        </p>
                        <p className="text-slate-600 text-xs font-mono mt-2">
                            This may take 30-60 seconds...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
