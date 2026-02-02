from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.significados import load_significados
from app.routers.auth import router as auth_router
from app.routers.meters import router as meters_router
from app.routers.tecnica import router as tecnica_router

app = FastAPI(title="GEDE Web Backend")

# 1) API routers primero (IMPORTANTE: antes de montar el frontend estático)
app.include_router(auth_router)
app.include_router(meters_router)
app.include_router(tecnica_router)

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/config")
def config():
    s = get_settings()
    return {"appTitle": s.app_title, "appSubtitle": s.app_subtitle}

@app.get("/api/significados")
def significados():
    # Devuelve mapping {codigo: significado}
    return load_significados()


# 2) Frontend estático (último para no interceptar POST /api/*)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend" / "static"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
