@echo off
REM ===================================================================
REM  Motiq - demarrer l'application (le site)
REM
REM  Appele par la tache planifiee « Motiq - application » a chaque
REM  ouverture de session, et utilisable a la main par double-clic.
REM
REM  On appelle next directement plutot que « npm start » : npm ajoute
REM  une couche de processus supplementaire, et c'est une couche de plus
REM  qui peut mourir en laissant le site inaccessible.
REM
REM  L'application sert le build de production (.next) deja construit.
REM  Si le site affiche une erreur apres une modification du code,
REM  il faut reconstruire : npm run build
REM ===================================================================
cd /d "%~dp0..\app"

set NODE="%LOCALAPPDATA%\hermes\tools\node-26.7.0-win32-x64\node.exe"
if not exist %NODE% set NODE=node

REM Le port doit etre libre : si une ancienne instance traine, on la
REM laisse tomber d'abord, sinon le demarrage echoue avec EADDRINUSE
REM et le site reste inaccessible sans explication.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do (
  taskkill /PID %%p /F >nul 2>&1
)

%NODE% node_modules\next\dist\bin\next start -p 3000
