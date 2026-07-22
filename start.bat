@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Start Pixel Agent Buddy
npm start
