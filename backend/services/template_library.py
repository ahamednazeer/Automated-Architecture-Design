from typing import List, Dict, Any


# Pre-built architecture templates
TEMPLATES = [
    {
        "name": "E-Commerce Platform",
        "category": "Web Application",
        "icon": "ShoppingCart",
        "description": "Full-featured e-commerce platform with product catalog, cart, checkout, payment processing, and order management.",
        "default_requirements": {
            "application_type": "Web Application",
            "system_purpose": "E-commerce platform with product catalog, shopping cart, payment processing, order management, and user accounts",
            "expected_users": "100,000",
            "traffic_load": "High",
            "performance_requirements": "Sub-second page loads, real-time inventory updates",
            "security_requirements": "PCI-DSS compliance, encrypted payments, user data protection",
            "deployment_environment": "Cloud",
            "cloud_provider": "AWS",
            "availability_requirements": "High",
            "budget_constraints": "Medium",
            "scaling_strategy": "Horizontal",
            "geographic_distribution": "Multi Region",
        },
    },
    {
        "name": "SaaS Platform",
        "category": "Web Application",
        "icon": "Cloud",
        "description": "Multi-tenant SaaS application with user management, subscription billing, API access, and analytics dashboard.",
        "default_requirements": {
            "application_type": "Web Application",
            "system_purpose": "Multi-tenant SaaS platform with user management, subscription billing, API access, team collaboration, and analytics",
            "expected_users": "50,000",
            "traffic_load": "Medium",
            "performance_requirements": "Fast API response times, real-time collaboration",
            "security_requirements": "SOC2 compliance, data isolation between tenants, OAuth2/SSO",
            "deployment_environment": "Cloud",
            "cloud_provider": "AWS",
            "availability_requirements": "High",
            "budget_constraints": "Medium",
            "scaling_strategy": "Horizontal",
            "geographic_distribution": "Multi Region",
        },
    },
    {
        "name": "IoT Platform",
        "category": "IoT System",
        "icon": "Cpu",
        "description": "IoT data ingestion platform with device management, real-time streaming, data processing, and visualization dashboards.",
        "default_requirements": {
            "application_type": "IoT System",
            "system_purpose": "IoT platform for device management, real-time data ingestion, stream processing, alerting, and visualization",
            "expected_users": "10,000 devices",
            "traffic_load": "Very High",
            "performance_requirements": "Low-latency data ingestion, real-time stream processing",
            "security_requirements": "Device authentication, encrypted communication, firmware OTA updates",
            "deployment_environment": "Cloud",
            "cloud_provider": "AWS",
            "availability_requirements": "Mission Critical",
            "budget_constraints": "High",
            "scaling_strategy": "Horizontal",
            "geographic_distribution": "Global",
        },
    },
    {
        "name": "Machine Learning Pipeline",
        "category": "Data Platform",
        "icon": "Brain",
        "description": "End-to-end ML pipeline with data ingestion, feature engineering, model training, serving, and monitoring.",
        "default_requirements": {
            "application_type": "Data Platform",
            "system_purpose": "ML pipeline with data ingestion, feature store, model training, model serving, A/B testing, and monitoring",
            "expected_users": "500",
            "traffic_load": "Medium",
            "performance_requirements": "GPU-accelerated training, low-latency model inference",
            "security_requirements": "Data encryption at rest and in transit, access control",
            "deployment_environment": "Cloud",
            "cloud_provider": "GCP",
            "availability_requirements": "High",
            "budget_constraints": "High",
            "scaling_strategy": "Auto",
            "geographic_distribution": "Single Region",
        },
    },
    {
        "name": "Real-time Chat Application",
        "category": "Web Application",
        "icon": "ChatCircle",
        "description": "Real-time messaging platform with direct messages, group chats, file sharing, presence, and push notifications.",
        "default_requirements": {
            "application_type": "Web Application",
            "system_purpose": "Real-time chat with direct messaging, group chats, file sharing, presence indicators, push notifications, and message history",
            "expected_users": "1,000,000",
            "traffic_load": "Very High",
            "performance_requirements": "Sub-100ms message delivery, real-time presence updates",
            "security_requirements": "End-to-end encryption, message privacy, user verification",
            "deployment_environment": "Cloud",
            "cloud_provider": "AWS",
            "availability_requirements": "Mission Critical",
            "budget_constraints": "Medium",
            "scaling_strategy": "Horizontal",
            "geographic_distribution": "Global",
        },
    },
    {
        "name": "Big Data Analytics",
        "category": "Data Platform",
        "icon": "ChartBar",
        "description": "Big data analytics platform with data lake, ETL pipelines, data warehouse, and business intelligence dashboards.",
        "default_requirements": {
            "application_type": "Data Platform",
            "system_purpose": "Big data platform with data lake, ETL pipelines, data warehouse, SQL query engine, and BI dashboards",
            "expected_users": "1,000",
            "traffic_load": "High",
            "performance_requirements": "Handle petabytes of data, fast query response for analytics",
            "security_requirements": "Data governance, access control, audit logging, data masking",
            "deployment_environment": "Cloud",
            "cloud_provider": "AWS",
            "availability_requirements": "High",
            "budget_constraints": "High",
            "scaling_strategy": "Auto",
            "geographic_distribution": "Single Region",
        },
    },
    {
        "name": "Mobile Backend (BaaS)",
        "category": "Mobile Application",
        "icon": "DeviceMobile",
        "description": "Mobile backend-as-a-service with user auth, push notifications, real-time sync, file storage, and API gateway.",
        "default_requirements": {
            "application_type": "Mobile Application",
            "system_purpose": "Mobile backend with authentication, push notifications, real-time sync, file storage, API gateway, and analytics",
            "expected_users": "500,000",
            "traffic_load": "High",
            "performance_requirements": "Low-latency API responses, offline sync support",
            "security_requirements": "OAuth2, token-based auth, encrypted storage",
            "deployment_environment": "Cloud",
            "cloud_provider": "Any",
            "availability_requirements": "High",
            "budget_constraints": "Medium",
            "scaling_strategy": "Auto",
            "geographic_distribution": "Multi Region",
        },
    },
    {
        "name": "Microservices Starter",
        "category": "Web Application",
        "icon": "GridFour",
        "description": "Standard microservices architecture with API Gateway, service mesh, event bus, and observability stack.",
        "default_requirements": {
            "application_type": "Web Application",
            "system_purpose": "Microservices platform with API gateway, service discovery, event bus, centralized logging, and distributed tracing",
            "expected_users": "200,000",
            "traffic_load": "High",
            "performance_requirements": "Independent service scaling, fault isolation",
            "security_requirements": "Service-to-service authentication, API security, secrets management",
            "deployment_environment": "Cloud",
            "cloud_provider": "AWS",
            "availability_requirements": "High",
            "budget_constraints": "Medium",
            "scaling_strategy": "Horizontal",
            "geographic_distribution": "Multi Region",
        },
    },
]


class TemplateLibrary:
    """Provides pre-built architecture templates."""

    @staticmethod
    def get_all_templates() -> List[Dict[str, Any]]:
        return [
            {
                "id": idx + 1,
                "name": t["name"],
                "category": t["category"],
                "description": t["description"],
                "icon": t["icon"],
                "default_requirements": t["default_requirements"],
            }
            for idx, t in enumerate(TEMPLATES)
        ]

    @staticmethod
    def get_template_by_id(template_id: int) -> Dict[str, Any] | None:
        if 1 <= template_id <= len(TEMPLATES):
            t = TEMPLATES[template_id - 1]
            return {
                "id": template_id,
                "name": t["name"],
                "category": t["category"],
                "description": t["description"],
                "icon": t["icon"],
                "default_requirements": t["default_requirements"],
            }
        return None

    @staticmethod
    def get_templates_by_category(category: str) -> List[Dict[str, Any]]:
        return [
            {
                "id": idx + 1,
                "name": t["name"],
                "category": t["category"],
                "description": t["description"],
                "icon": t["icon"],
                "default_requirements": t["default_requirements"],
            }
            for idx, t in enumerate(TEMPLATES)
            if t["category"].lower() == category.lower()
        ]
