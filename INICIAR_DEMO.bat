@echo off
chcp 65001 >nul
title Expediente Judicial Digital - Demo MVP
cd /d "%~dp0"
echo.
echo  ==============================================
echo    EXPEDIENTE JUDICIAL DIGITAL - Demo del MVP
echo  ==============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo  [X] No se encontro Python.
  echo      Instalalo desde https://www.python.org/downloads/
  echo      y marca la casilla "Add Python to PATH".
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo  [1/3] Preparando entorno ^(solo la primera vez, ~1 minuto^)...
  python -m venv .venv
  ".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
  ".venv\Scripts\python.exe" -m pip install --quiet -r requirements-demo.txt
  if errorlevel 1 (
    echo  [X] No se pudieron instalar las dependencias. Revisa tu conexion a internet.
    pause
    exit /b 1
  )
) else (
  echo  [1/3] Entorno listo.
)

echo  [2/3] Reiniciando datos de demostracion...
if exist expedientes.db del /q expedientes.db

echo  [3/3] Iniciando el sistema en http://localhost:8000
echo.
echo  Usuarios ^(contrasena: Demo-Judicial-2026^):
echo     secretario1   juez1   juez2   admin1
echo  Consulta ciudadana: EXP-2026-000001 + codigo A1B2C3D4
echo.
echo  Para detener el sistema cierra esta ventana.
echo.
start "" /b cmd /c "timeout /t 3 >nul & start http://localhost:8000"
".venv\Scripts\python.exe" -m uvicorn app.main:app --port 8000
pause
