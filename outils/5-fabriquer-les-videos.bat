@echo off
REM ===================================================================
REM  Motiq - fabriquer la video en attente (une seule fois)
REM
REM  Ce fichier est appele par la tache planifiee « Motiq - moteur de rendu ».
REM  Il traite ce qui est en attente, puis s'arrete. C'est volontaire :
REM  une tache planifiee qui se relance toute seule est plus fiable
REM  qu'un programme qui doit rester ouvert pendant des heures.
REM
REM  Le journal est ecrit par le programme lui-meme dans moteur\worker.log.
REM  Aucune redirection ici : Windows verrouille le fichier des qu'une
REM  execution precedente traine encore, et le lancement echouerait.
REM
REM  On peut aussi le lancer a la main, par double-clic.
REM ===================================================================
cd /d "%~dp0..\moteur"

set NODE="%LOCALAPPDATA%\hermes\tools\node-26.7.0-win32-x64\node.exe"
if not exist %NODE% set NODE=node

%NODE% worker.mjs
exit /b %ERRORLEVEL%

