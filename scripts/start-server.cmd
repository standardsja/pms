@echo off
cd /d "%~dp0"
echo Starting SPINX Backend Server...
echo ================================
npm run server:dev
pause
