@echo off
setlocal
cd /d %~dp0

echo.
echo === GEDE Web (Backend) ===
echo Carpeta: %CD%
echo.

REM Crear venv si no existe
if not exist backend\.venv\Scripts\python.exe (
  echo Creando entorno virtual...
  py -3 -m venv backend\.venv
)

set VENV_PY=%CD%\backend\.venv\Scripts\python.exe

echo.
echo Python del venv:
"%VENV_PY%" -c "import sys; print(sys.executable)"

echo.
echo Instalando dependencias...
"%VENV_PY%" -m ensurepip --upgrade >nul 2>nul
"%VENV_PY%" -m pip install --upgrade pip
"%VENV_PY%" -m pip install -r backend\requirements.txt

echo.
echo Iniciando servidor FastAPI en http://localhost:8000
echo Para detener: CTRL+C
echo.

set PYTHONPATH=backend
"%VENV_PY%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

endlocal
