@echo off
setlocal

cd /d %~dp0

echo.
echo === GEDE Web (Backend) ===
echo Carpeta: %CD%
echo.

REM Crear/activar entorno virtual
if not exist backend\.venv (
  echo Creando entorno virtual...
  py -3 -m venv backend\.venv
)

call backend\.venv\Scripts\activate.bat

echo Instalando dependencias...
python -m pip install --upgrade pip >nul
pip install -r backend\requirements.txt

echo.
echo Iniciando servidor FastAPI en http://localhost:8000
echo Para detener: CTRL+C
echo.

set PYTHONPATH=backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

endlocal