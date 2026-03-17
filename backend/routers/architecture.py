import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
from auth import get_current_user
from database import get_db
from models import Project, ProjectRequirement, Architecture, ArchitectureVersion, User
from schemas import ArchitectureResponse, VersionResponse, GenerateArchitectureRequest
from services.groq_service import GroqService
from services.diagram_generator import DiagramGenerator
from services.docx_generator import generate_docx_from_markdown

router = APIRouter(prefix="/api/architecture", tags=["Architecture"])


@router.post("/generate", response_model=ArchitectureResponse)
def generate_architecture(
    request: GenerateArchitectureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate architecture for a project using Groq AI."""
    project = (
        db.query(Project)
        .filter(Project.id == request.project_id, Project.owner_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = db.query(ProjectRequirement).filter(
        ProjectRequirement.project_id == request.project_id
    ).first()
    if not requirements:
        raise HTTPException(status_code=400, detail="Project has no requirements")

    # Update project status
    project.status = "processing"
    db.commit()

    try:
        groq = GroqService()

        # Convert requirements to dict
        req_dict = {
            "application_type": requirements.application_type,
            "system_purpose": requirements.system_purpose,
            "expected_users": requirements.expected_users,
            "traffic_load": requirements.traffic_load,
            "performance_requirements": requirements.performance_requirements,
            "security_requirements": requirements.security_requirements,
            "deployment_environment": requirements.deployment_environment,
            "cloud_provider": requirements.cloud_provider,
            "availability_requirements": requirements.availability_requirements,
            "budget_constraints": requirements.budget_constraints,
            "scaling_strategy": requirements.scaling_strategy,
            "geographic_distribution": requirements.geographic_distribution,
            "additional_requirements": requirements.additional_requirements,
        }

        # Step 1: AI analyzes requirements
        analysis = groq.analyze_requirements(req_dict)

        # Step 2: Generate components
        components = groq.generate_components(req_dict, analysis)

        # Step 3: Generate infrastructure
        infrastructure = groq.generate_infrastructure(req_dict, components, analysis)

        # Step 4: Generate diagrams
        diagrams = DiagramGenerator.generate_all_diagrams(
            components, infrastructure, analysis.get("recommended_pattern", "Architecture")
        )

        # Step 5: AI optimization
        optimizations = groq.optimize_architecture(req_dict, components, infrastructure)

        # Step 6: Generate documentation
        documentation = groq.generate_documentation(
            req_dict, analysis, components, infrastructure, optimizations
        )

        # Get latest version number
        latest_version = (
            db.query(Architecture)
            .filter(Architecture.project_id == request.project_id)
            .count()
        )

        # Save architecture
        architecture = Architecture(
            project_id=request.project_id,
            version=latest_version + 1,
            architecture_pattern=analysis.get("recommended_pattern"),
            architecture_description=analysis.get("architecture_description"),
            components=components,
            infrastructure=infrastructure,
            diagrams=diagrams,
            optimization_suggestions=optimizations,
            documentation=documentation,
            ai_model_used="llama-3.3-70b-versatile",
            complexity_score=analysis.get("classification", {}).get("complexity_score"),
            quality_score=8.0,  # Default quality score
        )
        db.add(architecture)

        # Save version snapshot
        version = ArchitectureVersion(
            project_id=request.project_id,
            version_number=latest_version + 1,
            change_summary=f"Generated {analysis.get('recommended_pattern', 'architecture')} architecture via Groq AI",
            architecture_snapshot={
                "analysis": analysis,
                "components": components,
                "infrastructure": infrastructure,
                "optimizations": optimizations,
            },
        )
        db.add(version)

        # Update project status
        project.status = "completed"
        db.commit()
        db.refresh(architecture)

        return architecture

    except Exception as e:
        project.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Architecture generation failed: {str(e)}")


@router.get("/project/{project_id}", response_model=List[ArchitectureResponse])
def get_project_architectures(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all architecture versions for a project."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    architectures = (
        db.query(Architecture)
        .filter(Architecture.project_id == project_id)
        .order_by(Architecture.version.desc())
        .all()
    )
    return architectures


@router.get("/{architecture_id}", response_model=ArchitectureResponse)
def get_architecture(
    architecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific architecture."""
    architecture = (
        db.query(Architecture)
        .join(Project, Architecture.project_id == Project.id)
        .filter(
            Architecture.id == architecture_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )
    if not architecture:
        raise HTTPException(status_code=404, detail="Architecture not found")
    return architecture


def _safe_filename(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in value.strip())
    return cleaned or "architecture"


_DOCX_SECRET_CACHE: str | None = None


def _docx_secret() -> str:
    global _DOCX_SECRET_CACHE
    if _DOCX_SECRET_CACHE:
        return _DOCX_SECRET_CACHE

    secret = os.getenv("DOCX_SIGNING_SECRET")
    if secret:
        _DOCX_SECRET_CACHE = secret
        return secret

    secret_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".docx_secret"))
    if os.path.exists(secret_path):
        try:
            with open(secret_path, "r", encoding="utf-8") as handle:
                file_secret = handle.read().strip()
            if file_secret:
                _DOCX_SECRET_CACHE = file_secret
                return file_secret
        except OSError:
            pass

    generated = secrets.token_urlsafe(48)
    _DOCX_SECRET_CACHE = generated
    try:
        with open(secret_path, "w", encoding="utf-8") as handle:
            handle.write(generated)
        try:
            os.chmod(secret_path, 0o600)
        except OSError:
            pass
    except OSError:
        # Fall back to in-memory secret for this process.
        pass
    return generated


def _base64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("utf-8")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign_docx_token(architecture_id: int, ttl_seconds: int = 900) -> tuple[str, int]:
    expires_at = int(time.time()) + ttl_seconds
    payload = {"aid": architecture_id, "exp": expires_at}
    payload_raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = _base64url_encode(payload_raw)
    signature = hmac.new(
        _docx_secret().encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{signature}", expires_at


def _verify_docx_token(token: str) -> int | None:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None
    expected = hmac.new(
        _docx_secret().encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        payload_raw = _base64url_decode(payload_b64)
        payload = json.loads(payload_raw.decode("utf-8"))
        exp = int(payload.get("exp", 0))
        aid = int(payload.get("aid", 0))
    except Exception:
        return None
    if exp < int(time.time()) or aid <= 0:
        return None
    return aid


@router.get("/{architecture_id}/docx")
def download_architecture_docx(
    architecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    architecture = (
        db.query(Architecture)
        .join(Project, Architecture.project_id == Project.id)
        .filter(
            Architecture.id == architecture_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )
    if not architecture:
        raise HTTPException(status_code=404, detail="Architecture not found")

    project_name = architecture.project.name if architecture.project else "architecture"
    base_name = _safe_filename(project_name)
    filename = f"{base_name}-v{architecture.version}.docx"
    content = generate_docx_from_markdown(architecture.documentation or "")

    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{architecture_id}/docx-link")
def get_architecture_docx_link(
    architecture_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    architecture = (
        db.query(Architecture)
        .join(Project, Architecture.project_id == Project.id)
        .filter(
            Architecture.id == architecture_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )
    if not architecture:
        raise HTTPException(status_code=404, detail="Architecture not found")

    token, expires_at = _sign_docx_token(architecture_id)
    base_url = str(request.base_url).rstrip("/")
    return {
        "url": f"{base_url}/api/architecture/docx/public?token={token}",
        "expires_at": expires_at,
    }


@router.get("/docx/public")
def download_architecture_docx_public(
    token: str = Query(..., min_length=10),
    db: Session = Depends(get_db),
):
    architecture_id = _verify_docx_token(token)
    if not architecture_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    architecture = db.query(Architecture).filter(Architecture.id == architecture_id).first()
    if not architecture:
        raise HTTPException(status_code=404, detail="Architecture not found")

    project_name = architecture.project.name if architecture.project else "architecture"
    base_name = _safe_filename(project_name)
    filename = f"{base_name}-v{architecture.version}.docx"
    content = generate_docx_from_markdown(architecture.documentation or "")

    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/project/{project_id}/versions", response_model=List[VersionResponse])
def get_project_versions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get version history for a project."""
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    versions = (
        db.query(ArchitectureVersion)
        .filter(ArchitectureVersion.project_id == project_id)
        .order_by(ArchitectureVersion.version_number.desc())
        .all()
    )
    return versions
