@echo off
REM ===================================================================
REM  Motiq - demarrer le moteur de rendu
REM
REM  Double-clique sur ce fichier. Une fenetre noire s'ouvre : elle doit
REM  RESTER OUVERTE. C'est elle qui fabrique les videos.
REM
REM  Tant qu'elle est ouverte, chaque clic sur « Generer » dans
REM  l'application produit une video au bout d'une a deux minutes.
REM
REM  Pour arreter : ferme la fenetre, ou appuie sur Ctrl+C.
REM ===================================================================
title Motiq - moteur de rendu
cd /d "%~dp0..\moteur"

echo.
echo   ================================================================
echo    MOTIQ - MOTEUR DE RENDU
echo   ================================================================
echo.
echo    Cette fenetre fabrique les videos. LAISSE-LA OUVERTE.
echo.
echo    Dans l'application : ouvre un projet, puis clique sur
echo    « Generer ». Compte une a deux minutes.
echo.
echo    Pour arreter : ferme cette fenetre.
echo   ================================================================
echo.

node worker.mjs --boucle
