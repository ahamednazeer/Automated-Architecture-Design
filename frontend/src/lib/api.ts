const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'archdesign_auth_token';

let authTokenCache: string | null = null;

export interface AuthUser {
    id: number;
    email: string;
    display_name?: string | null;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    expires_at: string;
    user: AuthUser;
}

interface RequirementData {
    application_type: string;
    system_purpose: string;
    expected_users?: string;
    traffic_load?: string;
    performance_requirements?: string;
    security_requirements?: string;
    deployment_environment?: string;
    cloud_provider?: string;
    availability_requirements?: string;
    budget_constraints?: string;
    scaling_strategy?: string;
    geographic_distribution?: string;
    additional_requirements?: Record<string, unknown>;
}

interface ProjectCreateData {
    name: string;
    description?: string;
    requirements: RequirementData;
}

export interface ProjectChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ScorecardResponse {
    project_id: number;
    architecture_id: number;
    version: number;
    overall: number;
    grade: string;
    scores: Record<string, number>;
    strengths: string[];
    improvements: string[];
}

export interface RiskRadarTrendPoint {
    version: number;
    created_at?: string | null;
    overall_risk: number;
    security: number;
    scalability: number;
    performance: number;
    cost_efficiency: number;
    maintainability: number;
    reliability: number;
}

export interface RiskRadarResponse {
    project_id: number;
    latest_radar: Record<string, number>;
    trend: RiskRadarTrendPoint[];
}

export interface CostHeatmapItem {
    name: string;
    bucket: string;
    category: string;
    estimated_monthly_usd: number;
    reason: string;
}

export interface CostHeatmapResponse {
    project_id: number;
    architecture_id: number;
    version: number;
    total_estimated_monthly_usd: number;
    top_cost_drivers: CostHeatmapItem[];
    all_items: CostHeatmapItem[];
}

export interface TimeMachineVersion {
    version: number;
    architecture_id: number;
    created_at?: string | null;
    pattern?: string | null;
    architecture_description?: string | null;
    component_count: number;
    infrastructure_count: number;
    optimization_count?: number;
    ai_model_used?: string | null;
    complexity_score?: number | null;
    quality_score?: number | null;
    components_preview?: string[];
    infrastructure_preview?: string[];
    overall_score?: number;
    grade?: string;
    change_summary?: string | null;
    components?: Array<Record<string, any>>;
    infrastructure?: Array<Record<string, any>>;
    optimization_suggestions?: Array<Record<string, any>>;
    diagrams_count?: number;
    diagrams?: Array<Record<string, any>>;
    documentation_excerpt?: string | null;
    documentation_length?: number;
}

export interface TimeMachineTimelineResponse {
    project_id: number;
    versions: TimeMachineVersion[];
}

export interface TimeMachineDiffResponse {
    project_id: number;
    from_version: number;
    to_version: number;
    pattern_changed: boolean;
    from_pattern?: string | null;
    to_pattern?: string | null;
    components_added: string[];
    components_removed: string[];
    infrastructure_added: string[];
    infrastructure_removed: string[];
    overall_score_delta: number;
}

export interface StudentSimplifyResponse {
    project_id: number;
    architecture_id: number;
    version: number;
    project_name: string;
    simple_explanation_points: string[];
    exam_ready_notes: string[];
    simple_mermaid: string;
}

export interface SwapPreviewResponse {
    project_id: number;
    architecture_id: number;
    version: number;
    target_provider: string;
    current_provider?: string | null;
    estimated_migration_effort: string;
    changes: Array<{
        category: string;
        existing: string;
        suggested: string;
    }>;
    compatibility_warnings: string[];
}

export interface InterviewQuestion {
    id: string;
    question: string;
    expected_points: string[];
}

export interface InterviewQuestionsResponse {
    project_id: number;
    architecture_id: number;
    version: number;
    questions: InterviewQuestion[];
}

export interface InterviewEvaluationResponse {
    project_id: number;
    overall_score: number;
    level: string;
    summary: string;
    results: Array<{
        id: string;
        question: string;
        score: number;
        matched_keywords: string[];
        feedback: string;
    }>;
}

export interface InterviewGeneratedAnswersResponse {
    project_id: number;
    architecture_id: number;
    version: number;
    answer_style: string;
    answer_source?: string;
    answers: Array<{
        id: string;
        question: string;
        suggested_answer: string;
    }>;
}

export function getAuthToken(): string | null {
    if (authTokenCache !== null) {
        return authTokenCache;
    }
    if (typeof window === 'undefined') {
        return null;
    }
    authTokenCache = localStorage.getItem(TOKEN_KEY);
    return authTokenCache;
}

export function setAuthToken(token: string) {
    authTokenCache = token;
    if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
    }
}

export function clearAuthToken() {
    authTokenCache = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
    }
}

async function request(path: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        ...options,
    });

    const isJson = (res.headers.get('content-type') || '').includes('application/json');

    if (!res.ok) {
        if (res.status === 401) {
            clearAuthToken();
        }
        const error = isJson ? await res.json().catch(() => ({ detail: 'Request failed' })) : { detail: 'Request failed' };
        throw new Error(error.detail || `HTTP ${res.status}`);
    }

    if (res.status === 204) {
        return null;
    }
    return isJson ? res.json() : null;
}

export const api = {
    // Authentication
    register: (email: string, password: string, displayName?: string) =>
        request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                display_name: displayName || undefined,
            }),
        }) as Promise<AuthResponse>,
    login: (email: string, password: string) =>
        request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }) as Promise<AuthResponse>,
    me: () => request('/api/auth/me') as Promise<AuthUser>,
    logout: () =>
        request('/api/auth/logout', {
            method: 'POST',
        }),

    // Dashboard
    getStats: () => request('/api/projects/stats'),

    // Projects
    listProjects: () => request('/api/projects/'),
    getProject: (id: number) => request(`/api/projects/${id}`),
    createProject: (data: ProjectCreateData) =>
        request('/api/projects/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    deleteProject: (id: number) =>
        request(`/api/projects/${id}`, { method: 'DELETE' }),

    // Architecture
    generateArchitecture: (projectId: number) =>
        request('/api/architecture/generate', {
            method: 'POST',
            body: JSON.stringify({ project_id: projectId }),
        }),
    getProjectArchitectures: (projectId: number) =>
        request(`/api/architecture/project/${projectId}`),
    getArchitecture: (id: number) => request(`/api/architecture/${id}`),
    getProjectVersions: (projectId: number) =>
        request(`/api/architecture/project/${projectId}/versions`),

    // Project Chatbot
    chatWithProject: (
        projectId: number,
        message: string,
        history: ProjectChatMessage[] = [],
    ) =>
        request('/api/chat/project', {
            method: 'POST',
            body: JSON.stringify({
                project_id: projectId,
                message,
                history,
            }),
        }),

    // Advanced Features / Insights
    getProjectScorecard: (projectId: number, architectureId?: number) =>
        request(
            `/api/insights/project/${projectId}/scorecard${architectureId ? `?architecture_id=${architectureId}` : ''}`
        ) as Promise<ScorecardResponse>,
    getProjectRiskRadar: (projectId: number) =>
        request(`/api/insights/project/${projectId}/risk-radar`) as Promise<RiskRadarResponse>,
    getProjectCostHeatmap: (projectId: number) =>
        request(`/api/insights/project/${projectId}/cost-heatmap`) as Promise<CostHeatmapResponse>,
    getProjectTimeMachine: (projectId: number) =>
        request(`/api/insights/project/${projectId}/time-machine`) as Promise<TimeMachineTimelineResponse>,
    getProjectTimeMachineDiff: (projectId: number, fromVersion: number, toVersion: number) =>
        request(
            `/api/insights/project/${projectId}/time-machine/diff?from_version=${fromVersion}&to_version=${toVersion}`
        ) as Promise<TimeMachineDiffResponse>,
    getStudentSimplify: (projectId: number) =>
        request(`/api/insights/project/${projectId}/student-simplify`) as Promise<StudentSimplifyResponse>,
    getSwapPreview: (projectId: number, targetProvider: string) =>
        request(`/api/insights/project/${projectId}/swap-preview`, {
            method: 'POST',
            body: JSON.stringify({ target_provider: targetProvider }),
        }) as Promise<SwapPreviewResponse>,
    generateInterviewQuestions: (projectId: number, count: number = 5) =>
        request(`/api/insights/project/${projectId}/interview/questions`, {
            method: 'POST',
            body: JSON.stringify({ count }),
        }) as Promise<InterviewQuestionsResponse>,
    generateInterviewAnswers: (
        projectId: number,
        questions: InterviewQuestion[],
        answerStyle: 'concise' | 'detailed' = 'concise'
    ) =>
        request(`/api/insights/project/${projectId}/interview/generate-answers`, {
            method: 'POST',
            body: JSON.stringify({
                questions,
                answer_style: answerStyle,
            }),
        }) as Promise<InterviewGeneratedAnswersResponse>,
    evaluateInterviewAnswers: (projectId: number, questions: InterviewQuestion[], answers: string[]) =>
        request(`/api/insights/project/${projectId}/interview/evaluate`, {
            method: 'POST',
            body: JSON.stringify({ questions, answers }),
        }) as Promise<InterviewEvaluationResponse>,

    // Templates
    listTemplates: (category?: string) =>
        request(`/api/templates/${category ? `?category=${category}` : ''}`),
    getTemplate: (id: number) => request(`/api/templates/${id}`),
};
