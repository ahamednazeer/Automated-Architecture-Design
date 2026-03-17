from typing import List, Dict, Any


class DiagramGenerator:
    """Generates Mermaid diagram code from architecture components."""

    @staticmethod
    def generate_system_architecture(components: List[Dict[str, Any]], architecture_pattern: str) -> Dict[str, Any]:
        """Generate a system architecture diagram in Mermaid."""
        lines = ["graph TB"]
        lines.append(f'    title["{architecture_pattern} Architecture"]')
        lines.append('    style title fill:none,stroke:none,color:#94a3b8,font-size:16px')
        lines.append("")

        # Group components by layer
        layers = {}
        for comp in components:
            layer = comp.get("layer", "service")
            if layer not in layers:
                layers[layer] = []
            layers[layer].append(comp)

        layer_order = ["client", "api", "service", "data", "infrastructure"]
        layer_styles = {
            "client": ("Client Layer", "#3b82f6", "#1e3a5f"),
            "api": ("API Layer", "#8b5cf6", "#3b1f6e"),
            "service": ("Service Layer", "#22c55e", "#14532d"),
            "data": ("Data Layer", "#f59e0b", "#78350f"),
            "infrastructure": ("Infrastructure Layer", "#ef4444", "#7f1d1d"),
        }

        node_id_map = {}
        node_counter = 0

        for layer_key in layer_order:
            if layer_key not in layers:
                continue
            layer_comps = layers[layer_key]
            label, color, bg = layer_styles.get(layer_key, ("Other", "#64748b", "#334155"))

            lines.append(f"    subgraph {layer_key}_layer[\"{label}\"]")
            for comp in layer_comps:
                node_id = f"n{node_counter}"
                node_id_map[comp["name"]] = node_id
                comp_type = comp.get("type", "service")
                if comp_type in ("database", "cache", "storage"):
                    lines.append(f'        {node_id}[("{comp["name"]}")]')
                elif comp_type in ("gateway", "load_balancer", "cdn"):
                    lines.append(f'        {node_id}{{{{{comp["name"]}}}}}')
                else:
                    lines.append(f'        {node_id}["{comp["name"]}"]')
                node_counter += 1
            lines.append("    end")
            lines.append(f"    style {layer_key}_layer fill:{bg},stroke:{color},color:{color}")
            lines.append("")

        # Add connections
        for comp in components:
            src_id = node_id_map.get(comp["name"])
            if not src_id:
                continue
            for conn_name in comp.get("connections", []):
                dst_id = node_id_map.get(conn_name)
                if dst_id:
                    lines.append(f"    {src_id} --> {dst_id}")

        return {
            "type": "system_architecture",
            "title": "System Architecture Diagram",
            "mermaid_code": "\n".join(lines),
        }

    @staticmethod
    def generate_infrastructure_diagram(infrastructure: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate an infrastructure deployment diagram."""
        lines = ["graph LR"]
        lines.append("")

        categories = {}
        for infra in infrastructure:
            cat = infra.get("category", "other")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(infra)

        cat_styles = {
            "compute": ("#3b82f6", "#1e3a5f"),
            "networking": ("#8b5cf6", "#3b1f6e"),
            "storage": ("#f59e0b", "#78350f"),
            "security": ("#ef4444", "#7f1d1d"),
            "monitoring": ("#22c55e", "#14532d"),
        }

        node_counter = 0
        for cat_key, items in categories.items():
            color, bg = cat_styles.get(cat_key, ("#64748b", "#334155"))
            lines.append(f'    subgraph {cat_key}_group["{cat_key.upper()}"]')
            for item in items:
                node_id = f"i{node_counter}"
                lines.append(f'        {node_id}["{item["name"]}"]')
                node_counter += 1
            lines.append("    end")
            lines.append(f"    style {cat_key}_group fill:{bg},stroke:{color},color:{color}")
            lines.append("")

        return {
            "type": "infrastructure",
            "title": "Infrastructure Deployment Diagram",
            "mermaid_code": "\n".join(lines),
        }

    @staticmethod
    def generate_component_interaction_diagram(components: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate component interaction sequence diagram."""
        lines = ["sequenceDiagram"]
        lines.append("")

        # Get service-layer components for the sequence
        services = [c for c in components if c.get("layer") in ("api", "service", "data")][:8]

        if len(services) < 2:
            services = components[:6]

        # Create participants
        for comp in services:
            sanitized_name = comp["name"].replace(" ", "_")
            lines.append(f'    participant {sanitized_name} as {comp["name"]}')

        lines.append("")

        # Create interactions based on connections
        interactions_added = set()
        for comp in services:
            src = comp["name"].replace(" ", "_")
            for conn_name in comp.get("connections", []):
                dst = conn_name.replace(" ", "_")
                interaction_key = f"{src}-{dst}"
                if interaction_key not in interactions_added:
                    # Check if destination is in our services list
                    if any(s["name"] == conn_name for s in services):
                        lines.append(f"    {src}->>+{dst}: Request")
                        lines.append(f"    {dst}-->>-{src}: Response")
                        interactions_added.add(interaction_key)

        return {
            "type": "component_interaction",
            "title": "Component Interaction Diagram",
            "mermaid_code": "\n".join(lines),
        }

    @staticmethod
    def generate_devops_pipeline_diagram() -> Dict[str, Any]:
        """Generate a DevOps pipeline diagram."""
        mermaid_code = """graph LR
    subgraph source["Source Control"]
        git["Git Repository"]
    end

    subgraph ci["CI Pipeline"]
        build["Build"]
        test["Unit Tests"]
        lint["Code Analysis"]
        security["Security Scan"]
    end

    subgraph cd["CD Pipeline"]
        staging["Deploy Staging"]
        integration["Integration Tests"]
        approval["Manual Approval"]
        production["Deploy Production"]
    end

    subgraph monitoring["Monitoring"]
        health["Health Checks"]
        metrics["Metrics"]
        alerts["Alerting"]
    end

    git --> build --> test --> lint --> security
    security --> staging --> integration --> approval --> production
    production --> health --> metrics --> alerts

    style source fill:#1e3a5f,stroke:#3b82f6,color:#3b82f6
    style ci fill:#14532d,stroke:#22c55e,color:#22c55e
    style cd fill:#3b1f6e,stroke:#8b5cf6,color:#8b5cf6
    style monitoring fill:#78350f,stroke:#f59e0b,color:#f59e0b"""

        return {
            "type": "devops_pipeline",
            "title": "DevOps Pipeline Diagram",
            "mermaid_code": mermaid_code,
        }

    @classmethod
    def generate_all_diagrams(cls, components: List[Dict[str, Any]], infrastructure: List[Dict[str, Any]], architecture_pattern: str) -> List[Dict[str, Any]]:
        """Generate all diagram types."""
        diagrams = []
        try:
            diagrams.append(cls.generate_system_architecture(components, architecture_pattern))
        except Exception as e:
            print(f"Error generating system architecture diagram: {e}")
        try:
            diagrams.append(cls.generate_infrastructure_diagram(infrastructure))
        except Exception as e:
            print(f"Error generating infrastructure diagram: {e}")
        try:
            diagrams.append(cls.generate_component_interaction_diagram(components))
        except Exception as e:
            print(f"Error generating component interaction diagram: {e}")
        try:
            diagrams.append(cls.generate_devops_pipeline_diagram())
        except Exception as e:
            print(f"Error generating devops pipeline diagram: {e}")
        return diagrams
