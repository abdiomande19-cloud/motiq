@echo off
chcp 65001 >nul
title MOTIQ - Jeton Vercel (mise en ligne)
color 0B

REM On appelle node par son chemin complet : il n'est pas dans le PATH
REM de Windows, hors du terminal de l'agent.
set "NODE=C:\Users\Diomande\AppData\Local\hermes\tools\node-26.7.0-win32-x64\node.exe"

if not exist "%NODE%" (
  echo.
  echo   ERREUR : node.exe introuvable a l'emplacement prevu.
  echo   %NODE%
  echo.
  pause
  exit /b 1
)

"%NODE%" "%~dp0saisir-jeton-vercel.js"

echo.
pause
