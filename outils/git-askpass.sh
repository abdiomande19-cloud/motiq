#!/bin/sh
# MOTIQ — aide d'authentification git (GIT_ASKPASS).
# Repond aux invites de git SANS jamais afficher le jeton :
#   - a l'invite "Username", renvoie un nom d'utilisateur technique
#   - a l'invite "Password", renvoie le jeton lu dans le .env du profil
#     Application Builder, au moment du push uniquement.
# Le jeton n'est donc jamais ecrit dans .git/config, ni dans l'URL distante,
# ni dans la ligne de commande.

if [ -n "$MOTIQ_ENV" ]; then
  ENVF="$MOTIQ_ENV"
elif command -v cygpath >/dev/null 2>&1 && [ -n "$LOCALAPPDATA" ]; then
  ENVF="$(cygpath -u "$LOCALAPPDATA")/hermes/profiles/application-builder-agent/.env"
else
  ENVF="/c/Users/Diomande/AppData/Local/hermes/profiles/application-builder-agent/.env"
fi

invite="$1"
if [ -z "$invite" ]; then
  invite="$(cat)"
fi

case "$invite" in
  *sername*) echo "x-access-token" ;;
  *)         grep -m1 '^GITHUB_TOKEN=' "$ENVF" | cut -d= -f2- ;;
esac
