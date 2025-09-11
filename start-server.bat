@echo off
echo Stopping any existing Node.js processes...
taskkill /f /im node.exe 2>nul
echo.
echo Starting the server...
node server.js
pause 