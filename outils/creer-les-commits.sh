#!/bin/sh
# MOTIQ — cree la sequence de commits (un commit par fonctionnalite / par ecran).
# Aucun identifiant n'est necessaire : travail purement local.
# Re-executable : les commits deja presents sont ignores.

cd "$(dirname "$0")/.."
ENVF="$(cygpath -u "$LOCALAPPDATA")/hermes/profiles/application-builder-agent/.env"
[ -n "$MOTIQ_ENV" ] && ENVF="$MOTIQ_ENV"
val() { grep -m1 "^$1=" "$ENVF" 2>/dev/null | cut -d= -f2- ; }

git config --local user.name  "$(val GIT_AUTHOR_NAME)"
git config --local user.email "$(val GIT_AUTHOR_EMAIL)"
git config --local commit.gpgsign false
echo "  identite : $(git config --local user.name) <$(git config --local user.email)>"

git reset -q          # on repart d'un index vide : le staging se fait commit par commit

c() {  # c "message" fichier...
  msg="$1"; shift
  ajoutes=""
  for f in "$@"; do
    [ -e "$f" ] || continue
    git add -- "$f" && ajoutes="$ajoutes $f"
  done
  [ -z "$ajoutes" ] && return 0
  if git diff --cached --quiet; then return 0; fi
  git commit -q -m "$msg"
  printf "  %-6s %s\n" "$(git rev-parse --short HEAD)" "$msg"
}

# 1. Outils, gabarits, configuration
c "chore: initialisation du projet — gabarits de configuration, outils de publication et de verification" \
  .gitignore .env.example env-agents.example demarrer-ici.bat outils \
  ajouter-jeton-github.py coller-jeton-depuis-presse-papiers.py verifier-jeton-github.py creer-depot-github.py

# 2. Design system
c "feat(design): design system liquid glass — jetons de couleur, verre, mouvement, accessibilite" \
  maquettes/_build/design-system.css

# 3. Un commit par ecran
for f in maquettes/[0-9][0-9]-*.html; do
  [ -e "$f" ] || continue
  base=$(basename "$f" .html)
  num=$(printf '%s' "$base" | cut -d- -f1)
  titre=$(printf '%s' "$base" | cut -d- -f2- | tr '-' ' ')
  c "feat(maquette): ecran $num — $titre" "$f"
done

# 4. Index de navigation
c "feat(maquettes): index de navigation des 13 ecrans" maquettes/index.html

# 5. Sources du generateur
c "chore(build): generateur des maquettes — sources des ecrans et assemblage" \
  maquettes/_build/app.js maquettes/_build/build.py maquettes/_build/screens_01_04.py \
  maquettes/_build/screens_05_08.py maquettes/_build/screens_09_13.py

# 6. Captures d'ecran
c "docs(captures): captures d'ecran des ecrans valides" maquettes/_captures

# 7. Documentation de phase
c "docs: etat de la phase 1 — analyse d'entree, perimetre et points a valider" PHASE-1-ETAT.md

echo
echo "  total : $(git rev-list --count HEAD) commits"
echo "  fichiers suivis : $(git ls-files | wc -l | tr -d ' ')"
