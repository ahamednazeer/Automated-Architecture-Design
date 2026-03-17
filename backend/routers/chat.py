from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from auth import get_current_user

from database import get_db
from models import Architecture, Project, ProjectRequirement, User
from schemas import ProjectChatRequest, ProjectChatResponse
from services.groq_service import GroqService

router = APIRouter(prefix="/api/chat", tags=["Project Chat"])


def _slice_text(value: Optional[str], limit: int = 3000) -> str:
    if not value:
        return ""
    return value[:limit]


@router.post("/project", response_model=ProjectChatResponse)
def chat_about_project(
    data: ProjectChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Project-scoped chat endpoint. Only uses the requested project's data."""
    project = (
        db.query(Project)
        .filter(Project.id == data.project_id, Project.owner_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = (
        db.query(ProjectRequirement)
        .filter(ProjectRequirement.project_id == data.project_id)
        .first()
    )

    latest_architecture = (
        db.query(Architecture)
        .filter(Architecture.project_id == data.project_id)
        .order_by(Architecture.version.desc())
        .first()
    )

    project_context = {
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "updated_at": project.updated_at.isoformat() if project.updated_at else None,
        },
        "requirements": {
            "application_type": requirements.application_type if requirements else None,
            "system_purpose": requirements.system_purpose if requirements else None,
            "expected_users": requirements.expected_users if requirements else None,
            "traffic_load": requirements.traffic_load if requirements else None,
            "performance_requirements": requirements.performance_requirements if requirements else None,
            "security_requirements": requirements.security_requirements if requirements else None,
            "deployment_environment": requirements.deployment_environment if requirements else None,
            "cloud_provider": requirements.cloud_provider if requirements else None,
            "availability_requirements": requirements.availability_requirements if requirements else None,
            "budget_constraints": requirements.budget_constraints if requirements else None,
            "scaling_strategy": requirements.scaling_strategy if requirements else None,
            "geographic_distribution": requirements.geographic_distribution if requirements else None,
            "additional_requirements": requirements.additional_requirements if requirements else None,
        },
        "latest_architecture": {
            "version": latest_architecture.version if latest_architecture else None,
            "architecture_pattern": latest_architecture.architecture_pattern if latest_architecture else None,
            "architecture_description": _slice_text(
                latest_architecture.architecture_description if latest_architecture else None, limit=2500
            ),
            "components": (latest_architecture.components or [])[:25] if latest_architecture else [],
            "infrastructure": (latest_architecture.infrastructure or [])[:25] if latest_architecture else [],
            "optimization_suggestions": (latest_architecture.optimization_suggestions or [])[:15] if latest_architecture else [],
            "documentation_excerpt": _slice_text(
                latest_architecture.documentation if latest_architecture else None, limit=6000
            ),
        },
    }

    history = [
        {"role": item.role, "content": item.content}
        for item in (data.history or [])
    ]

    try:
        groq = GroqService()
        reply = groq.chat_about_project(
            project_context=project_context,
            message=data.message,
            history=history,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project chat failed: {str(e)}")

    return ProjectChatResponse(project_id=data.project_id, reply=reply)
