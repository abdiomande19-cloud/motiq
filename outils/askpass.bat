@echo off
rem MOTIQ — aide d'authentification git pour Windows (version batch).
rem Repond a l'invite de git sans jamais afficher le jeton ni l'ecrire ailleurs.
setlocal
set "ENVF=%LOCALAPPDATA%\hermes\profiles\application-builder-agent\.env"
set "INVITE=%~1"
if "%INVITE%"=="" set /p INVITE=
echo %INVITE% | findstr /i "sername" >nul
if %errorlevel%==0 (
  echo x-access-token
) else (
  for /f "usebackq tokens=2 delims==" %%a in (`findstr /b /c:"GITHUB_TOKEN=" "%ENVF%"`) do echo %%a
)
endlocal
