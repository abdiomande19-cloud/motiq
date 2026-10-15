@echo off
chcp 65001 >nul
title MOTIQ - Remplir les cles Supabase
color 0E

REM Node n'est pas dans le PATH de Windows : on utilise le chemin complet.
set "NODE=C:\Users\Diomande\AppData\Local\hermes\tools\node-26.7.0-win32-x64\node.exe"

if not exist "%NODE%" (
  echo.
  echo   ERREUR : node.exe introuvable a l'emplacement prevu.
  echo   %NODE%
  echo.
  pause
  exit /b 1
)

"%NODE%" "%~dp0remplir-env.js"

echo.
pause
