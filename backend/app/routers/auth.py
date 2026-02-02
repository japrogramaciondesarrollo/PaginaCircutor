import secrets
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Sesiones en memoria (suficiente para dev local).
# En producción, esto se guarda en DB/Redis o se usa JWT real.
_SESSIONS: dict[str, dict] = {}

class LoginIn(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=80)

@router.post("/login")
async def login(payload: LoginIn):
    s = get_settings()

    if payload.username != s.app_admin_user or payload.password != s.app_admin_password:
        raise HTTPException(status_code=401, detail="Usuario o contraseña inválidos.")

    token = secrets.token_urlsafe(32)
    _SESSIONS[token] = {"username": payload.username}

    return {"username": payload.username, "token": token}

@router.post("/logout")
async def logout(token: str | None = None):
    if token and token in _SESSIONS:
        _SESSIONS.pop(token, None)
    return {"ok": True}

@router.get("/me")
async def me(token: str):
    sess = _SESSIONS.get(token)
    if not sess:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada.")
    return sess
