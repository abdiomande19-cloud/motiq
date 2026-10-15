@echo off
chcp 65001 >nul
cd /d "%~dp0"
cls
echo ================================================================
echo    MOTIQ  -  ajout du jeton GitHub
echo ================================================================
echo.
echo   Ce que ce script va vous demander :
echo     1. le jeton GitHub   -> la saisie est MASQUEE (rien ne s'affiche)
echo     2. le depot          -> forme  votre-compte/motiq
echo     3. votre nom         -> pour les commits
echo     4. votre e-mail      -> pour les commits
echo.
echo   Rien ne part dans une conversation. Le jeton est ecrit
echo   directement dans le fichier .env du profil de l'agent.
echo.
echo   (Vous pouvez fermer cette fenetre si vous voulez le faire plus tard.)
echo.
echo ----------------------------------------------------------------
echo.
python ajouter-jeton-github.py
echo.
echo ----------------------------------------------------------------
echo   Termine. Vous pouvez fermer cette fenetre.
pause
