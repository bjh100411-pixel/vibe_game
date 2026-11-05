@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 (
    echo Python 3 is required to run this browser build.
    echo Install Python or use: python -m http.server 8000
    pause
    exit /b 1
  ) else (
    set "PYTHON_CMD=py"
  )
) else (
  set "PYTHON_CMD=python"
)
start "ASHEN VEIL Server" /min cmd /c "%PYTHON_CMD% -m http.server 8000"
timeout /t 2 /nobreak >nul
start "" http://localhost:8000
