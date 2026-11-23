@echo off
setlocal
cd /d "%~dp0"

echo Starting Provenance Graph...
cd backend
call npm.cmd run build:engine
if errorlevel 1 (
  echo.
  echo Failed to compile the C++ engine.
  pause
  exit /b 1
)
start "Provenance Graph Server" /D "%~dp0backend" node server.js

echo Waiting for the application...
powershell -NoProfile -Command "$started=$false; for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$started=$true; break} } catch {} Start-Sleep -Milliseconds 500 }; if(-not $started){ exit 1 }"
if errorlevel 1 (
  echo.
  echo The server did not start. Keep the server window open and review its output.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:3000"
