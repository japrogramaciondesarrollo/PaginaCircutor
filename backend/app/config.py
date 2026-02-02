from dataclasses import dataclass
from pathlib import Path
import os
from dotenv import load_dotenv

@dataclass(frozen=True)
class Settings:
    gede_device_ip: str
    gede_api_base: str
    app_title: str
    app_subtitle: str
    app_admin_user: str
    app_admin_password: str
    app_secret: str
    gede_username: str
    gede_password: str
    concentradores_xlsx_path: str
    significados_xlsx_path: str

    @property
    def gede_base_url(self) -> str:
        ip = (self.gede_device_ip or "").strip()
        if not ip.startswith(("http://", "https://")):
            ip = "http://" + ip
        base = (self.gede_api_base or "").strip()
        if not base.startswith("/"):
            base = "/" + base
        return ip.rstrip("/") + base

def get_settings() -> Settings:
    # backend/.env (two levels up from this file)
    env_path = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(env_path)
    return Settings(
        gede_device_ip=os.getenv("GEDE_DEVICE_IP", "10.0.120.52"),
        gede_api_base=os.getenv("GEDE_API_BASE", "/api/v1"),
        app_title=os.getenv("APP_TITLE", "CES"),
        app_subtitle=os.getenv("APP_SUBTITLE", "Telegestión"),
        app_admin_user=os.getenv("APP_ADMIN_USER", "admin"),
        app_admin_password=os.getenv("APP_ADMIN_PASSWORD", "admin123"),
        app_secret=os.getenv("APP_SECRET", "change-me"),
        gede_username=os.getenv("GEDE_USERNAME", "admin"),
        gede_password=os.getenv("GEDE_PASSWORD", "Adm1n"),
        concentradores_xlsx_path=os.getenv("CONCENTRADORES_XLSX_PATH", str(Path(__file__).resolve().parents[1] / "data" / "concentradores.xlsx")),
        significados_xlsx_path=os.getenv("SIGNIFICADOS_XLSX_PATH", str(Path(__file__).resolve().parents[1] / "data" / "Biblioteca Significados.xlsx")),
    )
