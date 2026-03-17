import os
import json
from typing import Dict, Any, Optional
from groq import Groq
from dotenv import load_dotenv

load_dotenv()


class GroqService:
    """Service for interacting with Groq AI for architecture reasoning and optimization."""

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or api_key == "your_groq_api_key_here":
            raise ValueError("GROQ_API_KEY not configured. Please set it in .env file.")
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"

    def _chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
        """Send a chat completion request to Groq."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=4096,
        )
        return response.choices[0].message.content

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Extract JSON from AI response, handling markdown code blocks."""
        cleaned = text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        return json.loads(cleaned)

    def analyze_requirements(self, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze requirements and recommend architecture patterns."""
        system_prompt = """You are an expert cloud architect and systems designer. Analyze the given system requirements and provide architecture recommendations.

Return a JSON object with exactly this structure:
{
    "classification": {
        "application_scale": "Small|Medium|Large|Enterprise",
        "architecture_type": "description of architecture type",
        "complexity_score": 1-10
    },
    "recommended_pattern": "Monolithic|Microservices|Event-Driven|Serverless|Layered|Service-Oriented",
    "pattern_justification": "Why this pattern was chosen",
    "architecture_description": "Detailed description of the recommended architecture approach",
    "key_considerations": ["list of key design considerations"],
    "risk_factors": ["list of potential risks or challenges"]
}

IMPORTANT: Return ONLY valid JSON, no other text."""

        user_prompt = f"""Analyze these system requirements and recommend the best architecture:

Application Type: {requirements.get('application_type', 'Not specified')}
System Purpose: {requirements.get('system_purpose', 'Not specified')}
Expected Users: {requirements.get('expected_users', 'Not specified')}
Traffic Load: {requirements.get('traffic_load', 'Not specified')}
Performance Requirements: {requirements.get('performance_requirements', 'Not specified')}
Security Requirements: {requirements.get('security_requirements', 'Not specified')}
Deployment Environment: {requirements.get('deployment_environment', 'Not specified')}
Cloud Provider: {requirements.get('cloud_provider', 'Not specified')}
Availability Requirements: {requirements.get('availability_requirements', 'Not specified')}
Budget Constraints: {requirements.get('budget_constraints', 'Not specified')}
Scaling Strategy: {requirements.get('scaling_strategy', 'Not specified')}
Geographic Distribution: {requirements.get('geographic_distribution', 'Not specified')}
Additional Requirements: {json.dumps(requirements.get('additional_requirements', {}))}"""

        response = self._chat(system_prompt, user_prompt, temperature=0.4)
        return self._parse_json_response(response)

    def generate_components(self, requirements: Dict[str, Any], architecture_analysis: Dict[str, Any]) -> list:
        """Generate system components based on architecture analysis."""
        system_prompt = """You are an expert systems architect. Generate a detailed list of system components for the given architecture.

Return a JSON array where each component has this structure:
{
    "name": "Component Name",
    "type": "service|database|cache|gateway|queue|load_balancer|cdn|storage|monitoring|auth",
    "description": "What this component does",
    "layer": "client|api|service|data|infrastructure",
    "connections": ["names of other components this connects to"],
    "technology": "Recommended technology/tool"
}

Generate 8-15 realistic components that form a complete system architecture. Include components for:
- Client layer (web/mobile clients)
- API layer (gateway, load balancer)
- Service layer (business logic services)
- Data layer (databases, caches, storage)
- Infrastructure layer (monitoring, logging, security)

IMPORTANT: Return ONLY a valid JSON array, no other text."""

        user_prompt = f"""Generate system components for:

Architecture Pattern: {architecture_analysis.get('recommended_pattern', 'Microservices')}
Architecture Description: {architecture_analysis.get('architecture_description', '')}
Application Type: {requirements.get('application_type', '')}
System Purpose: {requirements.get('system_purpose', '')}
Expected Users: {requirements.get('expected_users', '')}
Key Considerations: {json.dumps(architecture_analysis.get('key_considerations', []))}"""

        response = self._chat(system_prompt, user_prompt, temperature=0.5)
        return self._parse_json_response(response)

    def generate_infrastructure(self, requirements: Dict[str, Any], components: list, architecture_analysis: Dict[str, Any]) -> list:
        """Generate infrastructure blueprint based on components."""
        system_prompt = """You are an expert infrastructure architect. Design the infrastructure blueprint for the given system components.

Return a JSON array where each infrastructure element has this structure:
{
    "name": "Infrastructure Element Name",
    "category": "compute|networking|storage|security|monitoring",
    "description": "What this infrastructure element provides",
    "specifications": {
        "type": "specific service/resource type",
        "size": "sizing recommendation",
        "redundancy": "redundancy level",
        "region": "deployment region recommendation"
    }
}

Generate 8-12 infrastructure elements covering compute, networking, storage, security, and monitoring.

IMPORTANT: Return ONLY a valid JSON array, no other text."""

        component_names = [c.get("name", "") for c in components] if isinstance(components, list) else []

        user_prompt = f"""Design infrastructure for:

Architecture Pattern: {architecture_analysis.get('recommended_pattern', '')}
Cloud Provider: {requirements.get('cloud_provider', 'AWS')}
Deployment Environment: {requirements.get('deployment_environment', 'Cloud')}
Availability: {requirements.get('availability_requirements', 'High')}
System Components: {json.dumps(component_names)}
Expected Users: {requirements.get('expected_users', '')}
Traffic Load: {requirements.get('traffic_load', '')}"""

        response = self._chat(system_prompt, user_prompt, temperature=0.5)
        return self._parse_json_response(response)

    def optimize_architecture(self, requirements: Dict[str, Any], components: list, infrastructure: list) -> list:
        """Evaluate and suggest optimizations for the architecture."""
        system_prompt = """You are an expert architecture reviewer. Evaluate the given architecture and suggest optimizations.

Return a JSON array of optimization suggestions, each with this structure:
{
    "category": "scalability|security|performance|cost|fault_tolerance",
    "title": "Short title of the suggestion",
    "description": "Detailed description of what to improve and how",
    "priority": "high|medium|low",
    "impact": "Brief description of the expected impact"
}

Provide 5-8 actionable optimization suggestions across different categories.

IMPORTANT: Return ONLY a valid JSON array, no other text."""

        user_prompt = f"""Evaluate and optimize this architecture:

Requirements Summary:
- Application: {requirements.get('application_type', '')}
- Users: {requirements.get('expected_users', '')}
- Availability: {requirements.get('availability_requirements', '')}
- Security: {requirements.get('security_requirements', '')}

Components: {json.dumps(components[:5] if isinstance(components, list) else [])}
Infrastructure: {json.dumps(infrastructure[:5] if isinstance(infrastructure, list) else [])}"""

        response = self._chat(system_prompt, user_prompt, temperature=0.5)
        return self._parse_json_response(response)

    def generate_documentation(self, requirements: Dict[str, Any], architecture_analysis: Dict[str, Any], components: list, infrastructure: list, optimizations: list) -> str:
        """Generate comprehensive architecture documentation in markdown."""
        system_prompt = """You are a technical documentation expert. Generate a comprehensive architecture design document in Markdown format.

The document should include these sections:
1. Executive Summary
2. System Overview
3. Architecture Pattern & Justification
4. System Components (table format)
5. Infrastructure Blueprint
6. Deployment Strategy
7. Security Architecture
8. Scalability Strategy
9. Monitoring & Observability
10. Risk Assessment & Mitigation

Write clear, professional documentation suitable for stakeholders and engineering teams.
Return ONLY the markdown document, no extra wrapping."""

        user_prompt = f"""Generate architecture documentation for:

Application: {requirements.get('application_type', '')}
Purpose: {requirements.get('system_purpose', '')}
Architecture Pattern: {architecture_analysis.get('recommended_pattern', '')}
Architecture Description: {architecture_analysis.get('architecture_description', '')}
Complexity Score: {architecture_analysis.get('classification', {}).get('complexity_score', 'N/A')}

Components ({len(components) if isinstance(components, list) else 0}):
{json.dumps(components[:8] if isinstance(components, list) else [], indent=2)}

Infrastructure ({len(infrastructure) if isinstance(infrastructure, list) else 0}):
{json.dumps(infrastructure[:6] if isinstance(infrastructure, list) else [], indent=2)}

Optimization Suggestions:
{json.dumps(optimizations[:5] if isinstance(optimizations, list) else [], indent=2)}

Cloud Provider: {requirements.get('cloud_provider', 'AWS')}
Expected Users: {requirements.get('expected_users', '')}
Availability: {requirements.get('availability_requirements', '')}"""

        return self._chat(system_prompt, user_prompt, temperature=0.6)
