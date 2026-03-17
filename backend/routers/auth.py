from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import create_user_session, get_current_session, get_current_user, hash_password, verify_password
from database import get_db
from models import Project, User, UserSession
from schemas import AuthTokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_valid_email(email: str) -> bool:
    return "@" in email and "." in email.split("@")[-1]


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegisterRequest, db: Session = Depends(get_db)):
    email = _normalize_email(data.email)
    if not _is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        display_name=(data.display_name or "").strip() or None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Backward-compatible migration behavior:
    # If this is the first account, claim legacy projects without an owner.
    if db.query(User).count() == 1:
        db.query(Project).filter(Project.owner_id.is_(None)).update(
            {Project.owner_id: user.id},
            synchronize_session=False,
        )
        db.commit()

    token, expires_at = create_user_session(db, user)
    return AuthTokenResponse(
        access_token=token,
        expires_at=expires_at,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthTokenResponse)
def login(data: UserLoginRequest, db: Session = Depends(get_db)):
    email = _normalize_email(data.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token, expires_at = create_user_session(db, user)
    return AuthTokenResponse(
        access_token=token,
        expires_at=expires_at,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(
    session: UserSession = Depends(get_current_session),
    db: Session = Depends(get_db),
):
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Logged out"}
