@echo off
chcp 65001 >nul
cd /d "%~dp0"
title MOTIQ - Connexion a Supabase
color 0B

set "SUPABASE=C:\Users\Diomande\AppData\Local\hermes\tools\node-26.7.0-win32-x64\supabase.cmd"

echo ================================================================
echo    MOTIQ  -  Connexion a Supabase
echo ================================================================
echo.
echo   ETAPE 1 : le lien ci-dessous va s'afficher (et le navigateur
echo             peut s'ouvrir tout seul). Ouvre le lien.
echo.
echo   ETAPE 2 : connecte-toi a Supabase, puis clique sur AUTORISER.
echo.
echo   ETAPE 3 : la page affiche un CODE DE VERIFICATION.
echo             Copie ce code, colle-le ici avec le clic droit
echo             (ou Ctrl+V) puis appuie sur ENTREE.
echo.
echo   (Le code n'est jamais transmis a l'agent : il reste ici.)
echo.
echo ================================================================
echo.
pause

call "%SUPABASE%" login --agent no

echo.
echo ================================================================
echo   Termine. Si tu vois "Finished supabase login", c'est bon.
echo   Tu peux fermer cette fenetre et revenir dans l'application.
echo ================================================================
echo.
pause
