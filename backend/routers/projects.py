from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from auth import get_current_user
from database import get_db
from models import Project, ProjectRequirement, Architecture, User
from schemas import (
    ProjectCreate,
    ProjectResponse,
    ProjectDetailResponse,
    DashboardStats,
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics."""
    total = db.query(Project).filter(Project.owner_id == current_user.id).count()
    completed = (
        db.query(Project)
        .filter(Project.owner_id == current_user.id, Project.status == "completed")
        .count()
    )
    processing = (
        db.query(Project)
        .filter(Project.owner_id == current_user.id, Project.status == "processing")
        .count()
    )
    draft = (
        db.query(Project)
        .filter(Project.owner_id == current_user.id, Project.status == "draft")
        .count()
    )
    architectures = (
        db.query(Architecture)
        .join(Project, Architecture.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
        .count()
    )
    return DashboardStats(
        total_projects=total,
        completed_projects=completed,
        processing_projects=processing,
        draft_projects=draft,
        total_architectures=architectures,
    )


@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all projects."""
    projects = (
        db.query(Project)
        .filter(Project.owner_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )
    return projects


@router.post("/", response_model=ProjectResponse)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new project with requirements."""
    project = Project(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        status="draft",
    )
    db.add(project)
    db.flush()

    req = ProjectRequirement(
        project_id=project.id,
        application_type=data.requirements.application_type,
        system_purpose=data.requirements.system_purpose,
        expected_users=data.requirements.expected_users,
        traffic_load=data.requirements.traffic_load,
        performance_requirements=data.requirements.performance_requirements,
        security_requirements=data.requirements.security_requirements,
        deployment_environment=data.requirements.deployment_environment,
        cloud_provider=data.requirements.cloud_provider,
        availability_requirements=data.requirements.availability_requirements,
        budget_constraints=data.requirements.budget_constraints,
        scaling_strategy=data.requirements.scaling_strategy,
        geographic_distribution=data.requirements.geographic_distribution,
        additional_requirements=data.requirements.additional_requirements,
    )
    db.add(req)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get project details with requirements."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a project and all related data."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}
