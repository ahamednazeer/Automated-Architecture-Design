from fastapi import APIRouter
from typing import List, Optional
from services.template_library import TemplateLibrary

router = APIRouter(prefix="/api/templates", tags=["Templates"])


@router.get("/")
def list_templates(category: Optional[str] = None):
    """List all architecture templates, optionally filtered by category."""
    if category:
        return TemplateLibrary.get_templates_by_category(category)
    return TemplateLibrary.get_all_templates()


@router.get("/{template_id}")
def get_template(template_id: int):
    """Get a specific template with its default requirements."""
    template = TemplateLibrary.get_template_by_id(template_id)
    if not template:
        return {"error": "Template not found"}
    return template
