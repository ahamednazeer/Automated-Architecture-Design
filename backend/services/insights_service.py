import re
from typing import Any, Dict, List, Optional, Tuple


class InsightsService:
    COMPONENT_COST_BASE = {
        "service": 90.0,
        "database": 180.0,
        "cache": 70.0,
        "gateway": 65.0,
        "queue": 55.0,
        "load_balancer": 80.0,
        "cdn": 75.0,
        "storage": 60.0,
        "monitoring": 45.0,
        "auth": 50.0,
    }

    INFRA_COST_BASE = {
        "compute": 160.0,
        "networking": 90.0,
        "storage": 110.0,
        "security": 95.0,
        "monitoring": 60.0,
    }

    PROVIDER_SERVICE_MAP = {
        "AWS": {
            "compute": "EC2 / ECS / EKS",
            "networking": "VPC + ALB + Route53",
            "storage": "S3 + RDS + EBS",
            "security": "IAM + KMS + WAF",
            "monitoring": "CloudWatch + X-Ray",
        },
        "Azure": {
            "compute": "VM Scale Sets / AKS / App Service",
            "networking": "VNet + Application Gateway + DNS",
            "storage": "Blob Storage + Azure SQL + Managed Disks",
            "security": "Entra ID + Key Vault + Defender",
            "monitoring": "Azure Monitor + App Insights",
        },
        "GCP": {
            "compute": "Compute Engine / GKE / Cloud Run",
            "networking": "VPC + Cloud Load Balancing + Cloud DNS",
            "storage": "Cloud Storage + Cloud SQL + Persistent Disk",
            "security": "IAM + KMS + Cloud Armor",
            "monitoring": "Cloud Monitoring + Cloud Trace",
        },
    }

    @staticmethod
    def _as_list(value: Any) -> List[Dict[str, Any]]:
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        return []

    @staticmethod
    def _extract_number(value: Optional[str]) -> float:
        if not value:
            return 1.0
        digits = re.findall(r"\d+", value.replace(",", ""))
        if not digits:
            return 1.0
        try:
            return max(float(int("".join(digits))), 1.0)
        except ValueError:
            return 1.0

    @staticmethod
    def _traffic_multiplier(traffic_load: Optional[str]) -> float:
        traffic = (traffic_load or "").strip().lower()
        if traffic == "low":
            return 0.8
        if traffic == "high":
            return 1.35
        if traffic == "very high":
            return 1.75
        return 1.0

    @staticmethod
    def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
        return max(low, min(high, value))

    @classmethod
    def score_architecture(
        cls,
        architecture: Any,
        requirements: Optional[Any] = None,
    ) -> Dict[str, Any]:
        components = cls._as_list(getattr(architecture, "components", None))
        infrastructure = cls._as_list(getattr(architecture, "infrastructure", None))
        optimizations = cls._as_list(getattr(architecture, "optimization_suggestions", None))

        comp_types = {str(c.get("type", "")).lower() for c in components}
        infra_cats = {str(i.get("category", "")).lower() for i in infrastructure}
        opt_cats = {str(o.get("category", "")).lower() for o in optimizations}

        security = 55.0
        scalability = 55.0
        performance = 55.0
        cost_efficiency = 55.0
        maintainability = 55.0
        reliability = 55.0

        if "auth" in comp_types:
            security += 10
        if "security" in infra_cats:
            security += 10
        if "security" in opt_cats:
            security += 5

        if "load_balancer" in comp_types:
            scalability += 10
            reliability += 5
        if "queue" in comp_types:
            scalability += 8
            reliability += 6
        if "cache" in comp_types:
            performance += 12
        if "cdn" in comp_types:
            performance += 8

        component_count = len(components)
        if component_count > 18:
            maintainability -= 12
            cost_efficiency -= 8
        elif component_count < 8:
            maintainability += 8

        if "monitoring" in comp_types or "monitoring" in infra_cats:
            reliability += 10

        pattern = str(getattr(architecture, "architecture_pattern", "") or "").lower()
        if "microservice" in pattern:
            scalability += 8
            maintainability -= 3
        if "serverless" in pattern:
            cost_efficiency += 6
            maintainability += 4

        expected_users = cls._extract_number(getattr(requirements, "expected_users", None))
        traffic_mult = cls._traffic_multiplier(getattr(requirements, "traffic_load", None))
        load_index = (expected_users / 10000.0) * traffic_mult
        if load_index > 8.0:
            scalability -= 8
            reliability -= 6
        elif load_index < 1.5:
            cost_efficiency += 5

        category_scores = {
            "security": round(cls._clamp(security), 1),
            "scalability": round(cls._clamp(scalability), 1),
            "performance": round(cls._clamp(performance), 1),
            "cost_efficiency": round(cls._clamp(cost_efficiency), 1),
            "maintainability": round(cls._clamp(maintainability), 1),
            "reliability": round(cls._clamp(reliability), 1),
        }
        overall = round(sum(category_scores.values()) / len(category_scores), 1)

        grade = "A" if overall >= 90 else "B" if overall >= 75 else "C" if overall >= 60 else "D"

        sorted_items = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
        strengths = [f"{k.replace('_', ' ').title()} ({v})" for k, v in sorted_items[:2]]
        improvements = [f"Improve {k.replace('_', ' ')} ({v})" for k, v in sorted_items[-2:]]

        return {
            "overall": overall,
            "grade": grade,
            "scores": category_scores,
            "strengths": strengths,
            "improvements": improvements,
        }

    @classmethod
    def estimate_cost_heatmap(
        cls,
        architecture: Any,
        requirements: Optional[Any] = None,
    ) -> Dict[str, Any]:
        components = cls._as_list(getattr(architecture, "components", None))
        infrastructure = cls._as_list(getattr(architecture, "infrastructure", None))

        expected_users = cls._extract_number(getattr(requirements, "expected_users", None))
        users_factor = max(0.6, min(3.0, expected_users / 50000.0))
        traffic_factor = cls._traffic_multiplier(getattr(requirements, "traffic_load", None))
        multiplier = users_factor * traffic_factor

        items: List[Dict[str, Any]] = []

        for component in components:
            ctype = str(component.get("type", "")).lower()
            base = cls.COMPONENT_COST_BASE.get(ctype, 50.0)
            cost = round(base * multiplier, 2)
            items.append(
                {
                    "name": component.get("name", "Unnamed Component"),
                    "bucket": "component",
                    "category": ctype or "other",
                    "estimated_monthly_usd": cost,
                    "reason": f"Type={ctype or 'other'} baseline adjusted for users/traffic",
                }
            )

        for infra in infrastructure:
            cat = str(infra.get("category", "")).lower()
            base = cls.INFRA_COST_BASE.get(cat, 70.0)
            cost = round(base * multiplier, 2)
            items.append(
                {
                    "name": infra.get("name", "Unnamed Infra"),
                    "bucket": "infrastructure",
                    "category": cat or "other",
                    "estimated_monthly_usd": cost,
                    "reason": f"Category={cat or 'other'} baseline adjusted for users/traffic",
                }
            )

        items.sort(key=lambda x: x["estimated_monthly_usd"], reverse=True)
        total = round(sum(item["estimated_monthly_usd"] for item in items), 2)

        return {
            "total_estimated_monthly_usd": total,
            "top_cost_drivers": items[:12],
            "all_items": items,
        }

    @classmethod
    def risk_radar(
        cls,
        architectures: List[Any],
        requirements: Optional[Any] = None,
    ) -> Dict[str, Any]:
        ordered = sorted(architectures, key=lambda x: getattr(x, "version", 0))
        trend: List[Dict[str, Any]] = []
        latest_radar: Dict[str, float] = {
            "security": 0,
            "scalability": 0,
            "performance": 0,
            "cost_efficiency": 0,
            "maintainability": 0,
            "reliability": 0,
        }

        for architecture in ordered:
            score = cls.score_architecture(architecture, requirements)
            radar = {
                key: round(100 - float(value), 1)
                for key, value in score["scores"].items()
            }
            latest_radar = radar
            trend.append(
                {
                    "version": architecture.version,
                    "created_at": architecture.created_at.isoformat() if architecture.created_at else None,
                    "overall_risk": round(sum(radar.values()) / len(radar), 1),
                    **radar,
                }
            )

        return {
            "latest_radar": latest_radar,
            "trend": trend,
        }

    @classmethod
    def _get_names(cls, items: List[Dict[str, Any]]) -> List[str]:
        names: List[str] = []
        for item in items:
            name = str(item.get("name", "")).strip()
            if name:
                names.append(name)
        return names

    @classmethod
    def time_machine_timeline(
        cls,
        architectures: List[Any],
        requirements: Optional[Any] = None,
        version_summaries: Optional[Dict[int, str]] = None,
    ) -> Dict[str, Any]:
        ordered = sorted(architectures, key=lambda x: getattr(x, "version", 0))
        versions = []
        for architecture in ordered:
            components = cls._as_list(getattr(architecture, "components", None))
            infrastructure = cls._as_list(getattr(architecture, "infrastructure", None))
            optimizations = cls._as_list(getattr(architecture, "optimization_suggestions", None))
            diagrams = cls._as_list(getattr(architecture, "diagrams", None))
            documentation = getattr(architecture, "documentation", None) or ""
            component_names = cls._get_names(components)
            infra_names = cls._get_names(infrastructure)
            score = cls.score_architecture(architecture, requirements)
            summary = None
            if version_summaries:
                summary = version_summaries.get(architecture.version)
            diagram_items = []
            for item in diagrams[:6]:
                diagram_items.append(
                    {
                        "type": item.get("type"),
                        "title": item.get("title"),
                        "mermaid_code": item.get("mermaid_code"),
                    }
                )
            versions.append(
                {
                    "architecture_id": architecture.id,
                    "version": architecture.version,
                    "created_at": architecture.created_at.isoformat() if architecture.created_at else None,
                    "pattern": architecture.architecture_pattern,
                    "architecture_description": getattr(architecture, "architecture_description", None),
                    "component_count": len(components),
                    "infrastructure_count": len(infrastructure),
                    "optimization_count": len(optimizations),
                    "ai_model_used": getattr(architecture, "ai_model_used", None),
                    "complexity_score": getattr(architecture, "complexity_score", None),
                    "quality_score": getattr(architecture, "quality_score", None),
                    "components_preview": component_names[:5],
                    "infrastructure_preview": infra_names[:5],
                    "overall_score": score.get("overall"),
                    "grade": score.get("grade"),
                    "change_summary": summary,
                    "components": components,
                    "infrastructure": infrastructure,
                    "optimization_suggestions": optimizations,
                    "diagrams_count": len(diagrams),
                    "diagrams": diagram_items,
                    "documentation_excerpt": documentation[:900] if documentation else None,
                    "documentation_length": len(documentation) if documentation else 0,
                }
            )
        return {"versions": versions}

    @classmethod
    def diff_versions(cls, older: Any, newer: Any) -> Dict[str, Any]:
        old_components = set(cls._get_names(cls._as_list(getattr(older, "components", None))))
        new_components = set(cls._get_names(cls._as_list(getattr(newer, "components", None))))
        old_infra = set(cls._get_names(cls._as_list(getattr(older, "infrastructure", None))))
        new_infra = set(cls._get_names(cls._as_list(getattr(newer, "infrastructure", None))))

        return {
            "from_version": older.version,
            "to_version": newer.version,
            "pattern_changed": (older.architecture_pattern or "") != (newer.architecture_pattern or ""),
            "from_pattern": older.architecture_pattern,
            "to_pattern": newer.architecture_pattern,
            "components_added": sorted(list(new_components - old_components)),
            "components_removed": sorted(list(old_components - new_components)),
            "infrastructure_added": sorted(list(new_infra - old_infra)),
            "infrastructure_removed": sorted(list(old_infra - new_infra)),
        }

    @classmethod
    def swap_preview(cls, architecture: Any, target_provider: str, current_provider: Optional[str] = None) -> Dict[str, Any]:
        provider = target_provider.strip().upper()
        if provider == "AZURE":
            provider = "Azure"
        elif provider in {"GCP", "GOOGLE CLOUD"}:
            provider = "GCP"
        elif provider == "AWS":
            provider = "AWS"

        if provider not in cls.PROVIDER_SERVICE_MAP:
            provider = "AWS"

        infra = cls._as_list(getattr(architecture, "infrastructure", None))
        mapping = cls.PROVIDER_SERVICE_MAP[provider]
        changes: List[Dict[str, str]] = []

        for item in infra:
            category = str(item.get("category", "")).lower()
            existing = str(item.get("name", "Unnamed Infra"))
            suggested = mapping.get(category, "Provider Equivalent Service")
            changes.append(
                {
                    "category": category or "other",
                    "existing": existing,
                    "suggested": suggested,
                }
            )

        effort = "Low" if len(changes) <= 6 else "Medium" if len(changes) <= 12 else "High"
        warnings = []
        if current_provider and current_provider.strip().lower() == provider.lower():
            warnings.append("Target provider matches current provider; expected fewer changes.")
        if not changes:
            warnings.append("No infrastructure entries found; preview is based on defaults.")

        return {
            "target_provider": provider,
            "current_provider": current_provider,
            "estimated_migration_effort": effort,
            "changes": changes,
            "compatibility_warnings": warnings,
        }

    @classmethod
    def student_simplify(
        cls,
        project: Any,
        architecture: Any,
    ) -> Dict[str, Any]:
        components = cls._as_list(getattr(architecture, "components", None))
        top_components = components[:5]
        comp_names = [str(item.get("name", "Component")) for item in top_components]

        simple_points = [
            f"This project uses a {architecture.architecture_pattern or 'layered'} style architecture.",
            "Client requests flow through API/gateway services to business logic and data storage.",
            "Core focus is reliability, performance, and secure access control.",
            "Monitoring helps detect failures early and improve uptime.",
            "Scaling is achieved by splitting workload across multiple services.",
        ]

        mermaid_nodes = comp_names if comp_names else ["Client", "API", "Service", "Database"]
        mermaid_lines = ["flowchart LR"]
        for idx in range(len(mermaid_nodes) - 1):
            mermaid_lines.append(f"  N{idx}[{mermaid_nodes[idx]}] --> N{idx + 1}[{mermaid_nodes[idx + 1]}]")

        exam_ready = [
            "State the architecture pattern and why it fits the use case.",
            "Explain request flow from user to data layer.",
            "Mention one scalability and one security mechanism.",
            "Describe monitoring/observability role.",
            "Discuss one cost optimization idea.",
        ]

        return {
            "project_name": project.name,
            "simple_explanation_points": simple_points,
            "exam_ready_notes": exam_ready,
            "simple_mermaid": "\n".join(mermaid_lines),
        }

    @classmethod
    def interview_questions(
        cls,
        architecture: Any,
        count: int = 5,
    ) -> List[Dict[str, Any]]:
        components = cls._as_list(getattr(architecture, "components", None))
        infra = cls._as_list(getattr(architecture, "infrastructure", None))
        pattern = architecture.architecture_pattern or "this architecture"

        component_names = [str(item.get("name", "Component")) for item in components[:6]]
        infra_names = [str(item.get("name", "Infrastructure")) for item in infra[:6]]

        candidates: List[Tuple[str, List[str]]] = [
            (
                f"Why is {pattern} suitable for this project?",
                ["scalability", "maintainability", "modularity"],
            ),
            (
                f"How would you handle failure in {component_names[0] if component_names else 'the API layer'}?",
                ["retry", "fallback", "monitoring", "alerting"],
            ),
            (
                "How would you improve security for this architecture?",
                ["authentication", "authorization", "encryption", "secrets"],
            ),
            (
                f"How would you reduce monthly cost for {infra_names[0] if infra_names else 'the infrastructure'}?",
                ["right-sizing", "autoscaling", "reserved", "cache"],
            ),
            (
                "What observability metrics are critical here?",
                ["latency", "error rate", "throughput", "saturation"],
            ),
            (
                "How would you scale this design for 10x traffic?",
                ["load balancer", "queue", "cache", "horizontal scaling"],
            ),
            (
                "How would you approach zero-downtime deployment?",
                ["blue-green", "canary", "rollback", "health checks"],
            ),
        ]

        final = candidates[: max(1, min(count, len(candidates)))]
        questions = []
        for idx, (question, expected) in enumerate(final, start=1):
            questions.append(
                {
                    "id": f"Q{idx}",
                    "question": question,
                    "expected_points": expected,
                }
            )
        return questions

    @classmethod
    def generate_interview_answers(
        cls,
        architecture: Any,
        questions: List[Dict[str, Any]],
        answer_style: str = "concise",
    ) -> List[Dict[str, Any]]:
        components = cls._as_list(getattr(architecture, "components", None))
        infra = cls._as_list(getattr(architecture, "infrastructure", None))
        pattern = architecture.architecture_pattern or "architecture"

        def comp_by_type(type_name: str, default: str) -> str:
            for item in components:
                if str(item.get("type", "")).lower() == type_name:
                    name = str(item.get("name", "")).strip()
                    if name:
                        return name
            return default

        def infra_by_category(category: str, default: str) -> str:
            for item in infra:
                if str(item.get("category", "")).lower() == category:
                    name = str(item.get("name", "")).strip()
                    if name:
                        return name
            return default

        gateway = comp_by_type("gateway", "API Gateway")
        db = comp_by_type("database", "Primary Database")
        cache = comp_by_type("cache", "Cache Layer")
        queue = comp_by_type("queue", "Message Queue")
        lb = comp_by_type("load_balancer", "Load Balancer")
        auth = comp_by_type("auth", "Auth Service")
        monitor = comp_by_type("monitoring", infra_by_category("monitoring", "Monitoring Stack"))
        security = infra_by_category("security", "Security Layer")
        compute = infra_by_category("compute", "Compute Cluster")
        networking = infra_by_category("networking", "Network Edge")
        storage = infra_by_category("storage", "Storage Layer")

        style = answer_style.strip().lower()
        detailed = style in {"detailed", "long"}
        answer_items: List[Dict[str, Any]] = []

        for question in questions:
            text = str(question.get("question", "")).strip()
            lower_q = text.lower()

            if "why is" in lower_q and "suitable" in lower_q:
                if detailed:
                    answer = (
                        f"Microservices fit this project because responsibilities are cleanly separated across services like "
                        f"{gateway}, {auth}, and domain services, which improves team ownership and release speed. "
                        f"Each service can scale independently behind {lb}, so heavy traffic does not force full-system scaling. "
                        f"Fault isolation is stronger: if one service degrades, the rest can continue operating with retries/fallbacks. "
                        f"This design also supports incremental deployment and easier long-term maintainability."
                    )
                else:
                    answer = (
                        f"Microservices are suitable here because they split the system into independent services, so teams can deploy faster "
                        f"and scale only what is needed behind {lb}. "
                        f"They also isolate failures and improve maintainability versus a single large codebase."
                    )
            elif "handle failure" in lower_q:
                target = "the affected service"
                marker = "failure in "
                if marker in lower_q:
                    extracted = text[lower_q.index(marker) + len(marker):].strip()
                    target = extracted[:-1] if extracted.endswith("?") else extracted
                if detailed:
                    answer = (
                        f"For failure in {target}, first detect it quickly using health checks and alerts from {monitor}. "
                        f"Then isolate impact with circuit breakers and retries (with backoff) at {gateway}. "
                        f"If the failing path is critical, serve fallback responses from {cache} or queue writes via {queue} to avoid user-facing downtime. "
                        f"Finally, trigger auto-recovery on {compute} and run post-incident root-cause analysis."
                    )
                else:
                    answer = (
                        f"I would monitor {target} with health checks, apply retries/circuit breakers at {gateway}, "
                        f"use fallback or queued processing ({queue}) to keep user flow alive, and auto-restart failed instances on {compute}."
                    )
            elif "improve security" in lower_q:
                if detailed:
                    answer = (
                        f"I would harden identity by centralizing authentication in {auth} and enforcing RBAC/least-privilege authorization at each service. "
                        f"All service-to-service traffic should use mTLS and all data should be encrypted in transit and at rest in {storage}. "
                        f"Secrets should move to a managed vault, and ingress should be protected with WAF/rate limiting via {security} at {networking}. "
                        f"Add continuous dependency scanning and audit logging with alerting for anomalous behavior."
                    )
                else:
                    answer = (
                        f"Strengthen authn/authz in {auth}, encrypt traffic and storage, store secrets in a vault, "
                        f"and add WAF/rate limiting plus audit logging through {security} and {monitor}."
                    )
            elif "reduce monthly cost" in lower_q or "cost" in lower_q:
                if detailed:
                    answer = (
                        f"Start with rightsizing compute in {compute} using real utilization, then enable autoscaling to cut idle capacity. "
                        f"Use reserved/savings commitments for steady baseline workloads and spot/preemptible instances for burst jobs. "
                        f"Reduce database and network spend by improving cache hit ratio in {cache} and optimizing queries against {db}. "
                        f"Move cold data to cheaper storage tiers in {storage} and track cost per service to find regressions early."
                    )
                else:
                    answer = (
                        f"I would right-size and autoscale {compute}, increase cache usage in {cache} to reduce {db} load, "
                        f"and shift cold data to cheaper {storage} tiers while using reserved pricing for stable workloads."
                    )
            elif "observability metrics" in lower_q or "metrics are critical" in lower_q:
                if detailed:
                    answer = (
                        f"I would track the four golden signals: latency, error rate, throughput, and saturation for each service. "
                        f"Concretely, measure p95/p99 latency and 5xx rates at {gateway}, queue lag in {queue}, cache hit ratio in {cache}, "
                        f"query latency/connection pressure in {db}, and CPU/memory/network saturation on {compute}. "
                        f"These metrics should drive SLOs and alert thresholds in {monitor}."
                    )
                else:
                    answer = (
                        f"Critical metrics are latency, error rate, throughput, and saturation across {gateway}, {db}, {queue}, and {compute}, "
                        f"with SLO-based alerts configured in {monitor}."
                    )
            elif "10x traffic" in lower_q or "scale this design" in lower_q:
                if detailed:
                    answer = (
                        f"For 10x growth, horizontally scale stateless services behind {lb}, and split read/write load in {db} using replicas/partitioning. "
                        f"Increase asynchronous buffering with {queue} so bursts do not overload core services. "
                        f"Improve cache hit ratio in {cache} and offload static/edge traffic through {networking}. "
                        f"Use autoscaling policies plus load-testing to tune capacity and protect SLOs."
                    )
                else:
                    answer = (
                        f"I would scale out services behind {lb}, add more async buffering via {queue}, "
                        f"improve caching in {cache}, and scale the database ({db}) with replicas/partitioning for 10x traffic."
                    )
            elif "zero-downtime deployment" in lower_q:
                if detailed:
                    answer = (
                        f"I would use canary or blue-green deployments behind {lb}, routing a small traffic slice to the new version first. "
                        f"Database changes must be backward-compatible (expand-migrate-contract) so old and new versions can run together. "
                        f"Release gates should include automated tests, health checks, and SLO guardrails from {monitor}. "
                        f"If thresholds fail, trigger automated rollback immediately."
                    )
                else:
                    answer = (
                        f"Use canary/blue-green releases behind {lb}, backward-compatible DB migrations on {db}, "
                        f"and health/SLO checks from {monitor} with automatic rollback on failure."
                    )
            else:
                expected = [str(item).strip().lower() for item in question.get("expected_points", []) if str(item).strip()]
                if expected:
                    answer = (
                        f"I would address this using {', '.join(expected[:3])}, implement it incrementally across {gateway}, {db}, and {monitor}, "
                        f"and validate impact with load/security tests before full rollout."
                    )
                else:
                    answer = (
                        f"For this {pattern} architecture, I would define clear SLOs, implement changes per service boundary, "
                        "and measure impact before scaling the rollout."
                    )

            answer_items.append(
                {
                    "id": question.get("id"),
                    "question": text,
                    "suggested_answer": answer,
                }
            )

        return answer_items

    @classmethod
    def evaluate_interview(
        cls,
        questions: List[Dict[str, Any]],
        answers: List[str],
    ) -> Dict[str, Any]:
        results = []
        total = 0.0
        max_total = 0.0

        for idx, question in enumerate(questions):
            expected = [str(item).lower() for item in question.get("expected_points", [])]
            answer = (answers[idx] if idx < len(answers) else "") or ""
            lower_answer = answer.lower()

            max_points = max(1.0, float(len(expected)))
            gained = 0.0
            matched: List[str] = []
            for token in expected:
                if token and token in lower_answer:
                    gained += 1.0
                    matched.append(token)

            normalized = round((gained / max_points) * 100, 1)
            total += gained
            max_total += max_points

            results.append(
                {
                    "id": question.get("id"),
                    "question": question.get("question"),
                    "score": normalized,
                    "matched_keywords": matched,
                    "feedback": "Good coverage." if normalized >= 70 else "Add more concrete technical details.",
                }
            )

        final_score = round((total / max_total) * 100, 1) if max_total else 0.0
        level = "Strong" if final_score >= 75 else "Moderate" if final_score >= 50 else "Needs Improvement"

        return {
            "overall_score": final_score,
            "level": level,
            "results": results,
            "summary": (
                "You explained key design trade-offs well."
                if final_score >= 75
                else "Review scalability, reliability, and security trade-offs with concrete examples."
            ),
        }
