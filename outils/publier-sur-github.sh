#!/bin/sh
# MOTIQ — publie le projet sur GitHub.
# 1. lit l'identite de commit dans le .env du profil (valeurs non secretes)
# 2. configure l'identite LOCALE du depot
# 3. ajoute le depot distant
# 4. pousse la branche main en utilisant l'aide d'authentification (jamais le jeton en clair)
# 5. verifie que la reference distante correspond bien au commit local

set -e
cd "$(dirname "$0")/.."

ENVF="$(cygpath -u "$LOCALAPPDATA")/hermes/profiles/application-builder-agent/.env"
[ -n "$MOTIQ_ENV" ] && ENVF="$MOTIQ_ENV"

val() { grep -m1 "^$1=" "$ENVF" 2>/dev/null | cut -d= -f2- ; }

REPO="$(val GITHUB_REPO)"
NOM="$(val GIT_AUTHOR_NAME)"
MAIL="$(val GIT_AUTHOR_EMAIL)"

if [ -z "$REPO" ]; then
  echo "  ERREUR : GITHUB_REPO absent du .env — rien a faire."
  exit 1
fi

echo "  depot distant : https://github.com/$REPO.git"
echo "  identite      : $NOM <$MAIL>"

git config --local user.name  "$NOM"
git config --local user.email "$MAIL"

if git remote | grep -qx origin; then
  git remote set-url origin "https://github.com/$REPO.git"
else
  git remote add origin "https://github.com/$REPO.git"
fi

echo "  commits locaux : $(git rev-list --count HEAD 2>/dev/null || echo 0)"

echo "  push en cours..."
GIT_ASKPASS="$(pwd)/outils/git-askpass.sh" GIT_TERMINAL_PROMPT=0 \
  git push --set-upstream origin main

echo
echo "  SHA local  : $(git rev-parse HEAD)"
echo "  SHA distant: $(git rev-parse origin/main 2>/dev/null || echo indisponible)"
if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main 2>/dev/null)" ]; then
  echo "  VERIFIE : la reference distante correspond au commit local."
else
  echo "  ATTENTION : divergence entre local et distant — a examiner."
fi
