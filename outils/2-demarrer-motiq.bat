@echo off
chcp 65001 >nul
title MOTIQ - Application
color 0A

REM Motiq n'est pas installe dans le PATH de Windows : on ajoute le dossier
REM des outils pour la duree de cette fenetre uniquement.
set "OUTILS=C:\Users\Diomande\AppData\Local\hermes\tools\node-26.7.0-win32-x64"
set "PATH=%OUTILS%;%PATH%"

cd /d "%~dp0..\app"

echo ================================================================
echo    MOTIQ  -  Demarrage de l'application
echo ================================================================
echo.
echo   L'application va se lancer.
echo.
echo   Ouvre ensuite ton navigateur sur :
echo.
echo        http://localhost:3000
echo.
echo   Pour ARRETER : ferme cette fenetre, ou appuie sur Ctrl+C.
echo.
echo ================================================================
echo.

start "" http://localhost:3000
call npm run dev

echo.
echo   L'application est arretee.
echo.
pause
