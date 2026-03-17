from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(512), nullable=False)
    display_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    projects = relationship("Project", back_populates="owner")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="draft")  # draft, processing, completed, failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="projects")
    requirements = relationship("ProjectRequirement", back_populates="project", cascade="all, delete-orphan")
    architectures = relationship("Architecture", back_populates="project", cascade="all, delete-orphan")
    versions = relationship("ArchitectureVersion", back_populates="project", cascade="all, delete-orphan")


class ProjectRequirement(Base):
    __tablename__ = "project_requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # Application info
    application_type = Column(String(100), nullable=False)
    system_purpose = Column(Text, nullable=False)
    expected_users = Column(String(100), nullable=True)
    traffic_load = Column(String(100), nullable=True)

    # Performance & security
    performance_requirements = Column(Text, nullable=True)
    security_requirements = Column(Text, nullable=True)

    # Deployment
    deployment_environment = Column(String(100), nullable=True)
    cloud_provider = Column(String(100), nullable=True)
    availability_requirements = Column(String(100), nullable=True)
    budget_constraints = Column(String(100), nullable=True)

    # Scalability
    scaling_strategy = Column(String(100), nullable=True)
    geographic_distribution = Column(String(100), nullable=True)

    # Raw JSON for additional/custom fields
    additional_requirements = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="requirements")


class Architecture(Base):
    __tablename__ = "architectures"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    version = Column(Integer, default=1)

    # AI-generated architecture data
    architecture_pattern = Column(String(100), nullable=True)
    architecture_description = Column(Text, nullable=True)
    components = Column(JSON, nullable=True)  # System component tree
    infrastructure = Column(JSON, nullable=True)  # Infrastructure blueprint
    diagrams = Column(JSON, nullable=True)  # Generated diagram data (Mermaid code)
    optimization_suggestions = Column(JSON, nullable=True)  # AI optimization results
    documentation = Column(Text, nullable=True)  # Generated documentation (markdown)

    # AI analysis metadata
    ai_model_used = Column(String(100), nullable=True)
    complexity_score = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="architectures")


class ArchitectureVersion(Base):
    __tablename__ = "architecture_versions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    change_summary = Column(Text, nullable=True)
    architecture_snapshot = Column(JSON, nullable=True)  # Full snapshot of architecture at this version
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="versions")


class ArchitectureTemplate(Base):
    __tablename__ = "architecture_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    default_requirements = Column(JSON, nullable=True)  # Pre-filled requirement values
    architecture_data = Column(JSON, nullable=True)  # Pre-built architecture components
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
