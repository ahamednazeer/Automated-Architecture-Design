from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./archdesign.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    _run_migrations()


def _run_migrations():
    """Lightweight schema updates for SQLite development environments."""
    if "sqlite" not in DATABASE_URL:
        return

    with engine.begin() as conn:
        columns = conn.exec_driver_sql("PRAGMA table_info(projects)").fetchall()
        column_names = {row[1] for row in columns}

        if "owner_id" not in column_names:
            conn.exec_driver_sql("ALTER TABLE projects ADD COLUMN owner_id INTEGER")

        conn.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_projects_owner_id ON projects (owner_id)"
        )
