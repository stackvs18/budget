@echo off
title Budget (keep this window open)
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install || goto failed
)

echo Preparing the app...
call npm run build --silent || goto failed

if not defined PORT set PORT=5050
echo.
echo  Budget is running at http://127.0.0.1:%PORT%
echo  Keep this window open while you use it: it's what saves to data.json
echo  and what your phone connects to (see DEPLOY.md, "Private").
echo  Closing it is safe: changes wait in the browser and save next time.
echo.
if not defined OPEN_BROWSER set OPEN_BROWSER=1
call npm run serve --silent
pause
exit /b

:failed
echo.
echo  Something went wrong above. Fix it, or ask for help with the message shown.
pause
