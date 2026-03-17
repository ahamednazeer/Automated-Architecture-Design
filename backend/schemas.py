from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime


# --- Requirement Schemas ---

class RequirementCreate(BaseModel):
    application_type: str = Field(..., description="e.g. Web Application, Mobile App, IoT System")
    system_purpose: str = Field(..., description="What the system does")
    expected_users: Optional[str] = Field(None, description="e.g. 1000, 1 million, 10 million")
    traffic_load: Optional[str] = Field(None, description="e.g. Low, Medium, High, Very High")
    performance_requirements: Optional[str] = None
    security_requirements: Optional[str] = None
    deployment_environment: Optional[str] = Field(None, description="e.g. Cloud, On-premise, Hybrid")
    cloud_provider: Optional[str] = Field(None, description="e.g. AWS, Azure, GCP, Any")
    availability_requirements: Optional[str] = Field(None, description="e.g. Standard, High, Mission Critical")
    budget_constraints: Optional[str] = Field(None, description="e.g. Low, Medium, High, Unlimited")
    scaling_strategy: Optional[str] = Field(None, description="e.g. Vertical, Horizontal, Auto")
    geographic_distribution: Optional[str] = Field(None, description="e.g. Single Region, Multi Region, Global")
    additional_requirements: Optional[Dict[str, Any]] = None


class RequirementResponse(RequirementCreate):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Project Schemas ---

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    requirements: RequirementCreate


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    requirements: Optional[List[RequirementResponse]] = []

    class Config:
        from_attributes = True


# --- Architecture Schemas ---

class ComponentItem(BaseModel):
    name: str
    type: str  # e.g. service, database, cache, gateway, queue
    description: str
    layer: str  # e.g. client, api, service, data, infrastructure
    connections: Optional[List[str]] = []


class InfrastructureItem(BaseModel):
    name: str
    category: str  # compute, networking, storage, security, monitoring
    description: str
    specifications: Optional[Dict[str, Any]] = {}


class DiagramData(BaseModel):
    type: str  # system_architecture, infrastructure, component_interaction, network, devops
    title: str
    mermaid_code: str


class OptimizationSuggestion(BaseModel):
    category: str  # scalability, security, performance, cost, fault_tolerance
    title: str
    description: str
    priority: str  # high, medium, low
    impact: str


class ArchitectureResponse(BaseModel):
    id: int
    project_id: int
    version: int
    architecture_pattern: Optional[str]
    architecture_description: Optional[str]
    components: Optional[List[Dict[str, Any]]]
    infrastructure: Optional[List[Dict[str, Any]]]
    diagrams: Optional[List[Dict[str, Any]]]
    optimization_suggestions: Optional[List[Dict[str, Any]]]
    documentation: Optional[str]
    ai_model_used: Optional[str]
    complexity_score: Optional[float]
    quality_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Version Schemas ---

class VersionResponse(BaseModel):
    id: int
    project_id: int
    version_number: int
    change_summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Template Schemas ---

class TemplateResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str]
    icon: Optional[str]
    default_requirements: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class TemplateDetailResponse(TemplateResponse):
    architecture_data: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


# --- Generate Request ---

class GenerateArchitectureRequest(BaseModel):
    project_id: int


# --- Stats ---

class DashboardStats(BaseModel):
    total_projects: int
    completed_projects: int
    processing_projects: int
    draft_projects: int
    total_architectures: int


# --- Project Chat ---

class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class ProjectChatRequest(BaseModel):
    project_id: int = Field(..., gt=0)
    message: str = Field(..., min_length=1, max_length=2000)
    history: Optional[List[ChatHistoryMessage]] = Field(default_factory=list)


class ProjectChatResponse(BaseModel):
    project_id: int
    reply: str


# --- Authentication ---

class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    display_name: Optional[str] = Field(None, max_length=255)


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserResponse


class SwapPreviewRequest(BaseModel):
    target_provider: str = Field(..., min_length=2, max_length=50)


class InterviewQuestionsRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=10)


class InterviewQuestionItem(BaseModel):
    id: str
    question: str
    expected_points: List[str] = Field(default_factory=list)


class InterviewEvaluateRequest(BaseModel):
    questions: List[InterviewQuestionItem] = Field(default_factory=list)
    answers: List[str] = Field(default_factory=list)


class InterviewGenerateAnswersRequest(BaseModel):
    questions: List[InterviewQuestionItem] = Field(default_factory=list)
    answer_style: str = Field(default="concise", min_length=3, max_length=30)
