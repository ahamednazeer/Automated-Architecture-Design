from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Architecture, ArchitectureVersion, Project, ProjectRequirement, User
from schemas import (
    InterviewEvaluateRequest,
    InterviewGenerateAnswersRequest,
    InterviewQuestionsRequest,
    SwapPreviewRequest,
)
from services.groq_service import GroqService
from services.insights_service import InsightsService

router = APIRouter(prefix="/api/insights", tags=["Project Insights"])


def _get_project_for_user(project_id: int, current_user: User, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.owner_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_architectures(project_id: int, db: Session):
    return (
        db.query(Architecture)
        .filter(Architecture.project_id == project_id)
        .order_by(Architecture.version.asc())
        .all()
    )


def _get_latest_architecture(project_id: int, db: Session) -> Architecture:
    architecture = (
        db.query(Architecture)
        .filter(Architecture.project_id == project_id)
        .order_by(Architecture.version.desc())
        .first()
    )
    if not architecture:
        raise HTTPException(status_code=400, detail="No architecture generated for this project")
    return architecture


def _get_requirements(project_id: int, db: Session):
    return (
        db.query(ProjectRequirement)
        .filter(ProjectRequirement.project_id == project_id)
        .first()
    )


@router.get("/project/{project_id}/scorecard")
def get_scorecard(
    project_id: int,
    architecture_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)
    requirements = _get_requirements(project_id, db)

    if architecture_id is not None:
        architecture = (
            db.query(Architecture)
            .join(Project, Architecture.project_id == Project.id)
            .filter(
                Architecture.id == architecture_id,
                Architecture.project_id == project_id,
                Project.owner_id == current_user.id,
            )
            .first()
        )
        if not architecture:
            raise HTTPException(status_code=404, detail="Architecture not found")
    else:
        architecture = _get_latest_architecture(project_id, db)

    scorecard = InsightsService.score_architecture(architecture, requirements)
    return {
        "project_id": project_id,
        "architecture_id": architecture.id,
        "version": architecture.version,
        **scorecard,
    }


@router.get("/project/{project_id}/risk-radar")
def get_risk_radar(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)
    requirements = _get_requirements(project_id, db)
    architectures = _get_architectures(project_id, db)
    if not architectures:
        raise HTTPException(status_code=400, detail="No architecture generated for this project")

    return {
        "project_id": project_id,
        **InsightsService.risk_radar(architectures, requirements),
    }


@router.get("/project/{project_id}/cost-heatmap")
def get_cost_heatmap(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)
    requirements = _get_requirements(project_id, db)
    architecture = _get_latest_architecture(project_id, db)

    return {
        "project_id": project_id,
        "architecture_id": architecture.id,
        "version": architecture.version,
        **InsightsService.estimate_cost_heatmap(architecture, requirements),
    }


@router.get("/project/{project_id}/time-machine")
def get_time_machine_timeline(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)
    architectures = _get_architectures(project_id, db)
    requirements = _get_requirements(project_id, db)
    versions = (
        db.query(ArchitectureVersion)
        .filter(ArchitectureVersion.project_id == project_id)
        .all()
    )
    version_summaries = {item.version_number: item.change_summary for item in versions}
    if not architectures:
        raise HTTPException(status_code=400, detail="No architecture generated for this project")

    return {
        "project_id": project_id,
        **InsightsService.time_machine_timeline(
            architectures,
            requirements,
            version_summaries=version_summaries,
        ),
    }


@router.get("/project/{project_id}/time-machine/diff")
def get_time_machine_diff(
    project_id: int,
    from_version: int = Query(..., ge=1),
    to_version: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)

    old_architecture = (
        db.query(Architecture)
        .filter(
            Architecture.project_id == project_id,
            Architecture.version == from_version,
        )
        .first()
    )
    new_architecture = (
        db.query(Architecture)
        .filter(
            Architecture.project_id == project_id,
            Architecture.version == to_version,
        )
        .first()
    )

    if not old_architecture or not new_architecture:
        raise HTTPException(status_code=404, detail="Requested version not found")

    requirements = _get_requirements(project_id, db)
    old_score = InsightsService.score_architecture(old_architecture, requirements)
    new_score = InsightsService.score_architecture(new_architecture, requirements)

    return {
        "project_id": project_id,
        **InsightsService.diff_versions(old_architecture, new_architecture),
        "overall_score_delta": round(new_score["overall"] - old_score["overall"], 1),
    }


@router.get("/project/{project_id}/student-simplify")
def get_student_simplify(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = _get_project_for_user(project_id, current_user, db)
    architecture = _get_latest_architecture(project_id, db)
    context = {
        "project_name": project.name,
        "architecture_pattern": architecture.architecture_pattern,
        "architecture_description": architecture.architecture_description,
        "components": architecture.components or [],
        "infrastructure": architecture.infrastructure or [],
        "optimization_suggestions": architecture.optimization_suggestions or [],
    }

    try:
        groq = GroqService()
        payload = groq.generate_student_simplify(context)
    except Exception:
        payload = InsightsService.student_simplify(project, architecture)

    payload["project_name"] = project.name

    return {
        "project_id": project_id,
        "architecture_id": architecture.id,
        "version": architecture.version,
        **payload,
    }


@router.post("/project/{project_id}/swap-preview")
def get_swap_preview(
    project_id: int,
    data: SwapPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)
    requirements = _get_requirements(project_id, db)
    architecture = _get_latest_architecture(project_id, db)
    current_provider = getattr(requirements, "cloud_provider", None)

    context = {
        "architecture_pattern": architecture.architecture_pattern,
        "components": architecture.components or [],
        "infrastructure": architecture.infrastructure or [],
    }

    try:
        groq = GroqService()
        preview = groq.generate_swap_preview(
            architecture_context=context,
            target_provider=data.target_provider,
            current_provider=current_provider,
        )
    except Exception:
        preview = InsightsService.swap_preview(
            architecture=architecture,
            target_provider=data.target_provider,
            current_provider=current_provider,
        )

    return {
        "project_id": project_id,
        "architecture_id": architecture.id,
        "version": architecture.version,
        **preview,
    }


@router.post("/project/{project_id}/interview/questions")
def generate_interview_questions(
    project_id: int,
    data: InterviewQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)
    architecture = _get_latest_architecture(project_id, db)
    context = {
        "architecture_pattern": architecture.architecture_pattern,
        "architecture_description": architecture.architecture_description,
        "components": architecture.components or [],
        "infrastructure": architecture.infrastructure or [],
        "optimization_suggestions": architecture.optimization_suggestions or [],
    }

    try:
        groq = GroqService()
        questions = groq.generate_interview_questions(context, data.count)
    except Exception:
        questions = InsightsService.interview_questions(architecture, data.count)
    return {
        "project_id": project_id,
        "architecture_id": architecture.id,
        "version": architecture.version,
        "questions": questions,
    }


@router.post("/project/{project_id}/interview/evaluate")
def evaluate_interview_answers(
    project_id: int,
    data: InterviewEvaluateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)
    questions = [item.model_dump() for item in data.questions]
    return {
        "project_id": project_id,
        **InsightsService.evaluate_interview(questions=questions, answers=data.answers),
    }


@router.post("/project/{project_id}/interview/generate-answers")
def generate_interview_answers(
    project_id: int,
    data: InterviewGenerateAnswersRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_project_for_user(project_id, current_user, db)
    architecture = _get_latest_architecture(project_id, db)
    questions = [item.model_dump() for item in data.questions]

    architecture_context = {
        "project_id": project_id,
        "architecture_pattern": architecture.architecture_pattern,
        "architecture_description": architecture.architecture_description,
        "components": architecture.components or [],
        "infrastructure": architecture.infrastructure or [],
        "optimization_suggestions": architecture.optimization_suggestions or [],
    }

    # Prefer Groq-generated answers for higher quality/contextual responses.
    try:
        groq = GroqService()
        groq_answers = groq.generate_interview_answers(
            architecture_context=architecture_context,
            questions=questions,
            answer_style=data.answer_style,
        )
        answer_source = "groq"
        answer_lookup = {item["id"]: item["suggested_answer"] for item in groq_answers}
        answers = [
            {
                "id": str(question.get("id", "")),
                "question": str(question.get("question", "")),
                "suggested_answer": answer_lookup.get(
                    str(question.get("id", "")),
                    "",
                ),
            }
            for question in questions
        ]
        # Fill any missing ids with deterministic fallback.
        missing = [a for a in answers if not a["suggested_answer"]]
        if missing:
            fallback = InsightsService.generate_interview_answers(
                architecture=architecture,
                questions=questions,
                answer_style=data.answer_style,
            )
            fallback_lookup = {item["id"]: item["suggested_answer"] for item in fallback}
            for item in answers:
                if not item["suggested_answer"]:
                    item["suggested_answer"] = fallback_lookup.get(item["id"], "")
    except Exception:
        # Fallback keeps feature available when Groq key/model is unavailable.
        answer_source = "fallback"
        answers = InsightsService.generate_interview_answers(
            architecture=architecture,
            questions=questions,
            answer_style=data.answer_style,
        )
    return {
        "project_id": project_id,
        "architecture_id": architecture.id,
        "version": architecture.version,
        "answer_style": data.answer_style,
        "answer_source": answer_source,
        "answers": answers,
    }
