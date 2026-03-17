from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers.projects import router as projects_router
from routers.architecture import router as architecture_router
from routers.templates import router as templates_router
from routers.chat import router as chat_router
from routers.auth import router as auth_router
from routers.insights import router as insights_router

app = FastAPI(
    title="Architecture Design & Blueprint Generator",
    description="AI-powered platform for automated architecture design using Groq AI",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects_router)
app.include_router(architecture_router)
app.include_router(templates_router)
app.include_router(chat_router)
app.include_router(auth_router)
app.include_router(insights_router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/")
def root():
    return {
        "name": "Architecture Design & Blueprint Generator API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
