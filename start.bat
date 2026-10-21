@echo off
title Budget (keep this window open)
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo.
echo  Budget is running at http://127.0.0.1:5050
echo  Keep this window open while you use it. Closing it stops saving to data.json.
echo  (Nothing is lost if you do: changes wait in the browser and save next time.)
echo.
call npm start
pause
