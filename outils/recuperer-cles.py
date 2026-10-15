"""Recupere les cles d'API du projet via l'API de gestion Supabase.

Les valeurs sont ecrites DIRECTEMENT dans .env.local : elles ne sont jamais
affichees, ni dans la sortie, ni dans aucun journal. On ne montre que des
booleens et des longueurs.

Cela evite a l'utilisateur de recopier des cles a la main (source d'erreurs
constatee : un jeton colle dans la mauvaise ligne).
"""

from __future__ import annotations

import json
import sys

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from api_supabase import appel  # noqa: E402

REF = "lsdijolrsghaxwopabfu"
CHEMIN = r"C:\Users\Diomande\Motiq\app\.env.local"


def ecrire_env(cle: str, valeur: str) -> None:
    lignes = open(CHEMIN, encoding="utf-8", errors="replace").read().split("\n")
    trouvee = False
    resultat = []
    for ligne in lignes:
        d = ligne.strip()
        if not d or d.startswith("#") or "=" not in d:
            resultat.append(ligne)
            continue
        if d.split("=", 1)[0].strip() == cle:
            resultat.append(f"{cle}={valeur}")
            trouvee = True
        else:
            resultat.append(ligne)
    if not trouvee:
        resultat.append(f"{cle}={valeur}")
    with open(CHEMIN, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(resultat))


code, corps = appel("GET", f"/projects/{REF}/api-keys?reveal=true")
if code != 200:
    print("ECHEC HTTP", code)
    print(corps[:300])
    sys.exit(1)

cles = json.loads(corps)
print(f"l'API a renvoye {len(cles)} cle(s) :\n")

publiques, secretes = [], []
for c in cles:
    nom = c.get("name", "?")
    valeur = c.get("api_key") or c.get("key") or ""
    type_ = c.get("type", "")
    print(f"  nom={nom:<22} type={type_:<14} longueur={len(valeur)}  "
          f"prefixe={'sb_' + valeur.split('_')[1] + '_...' if valeur.startswith('sb_') else valeur[:6] + '...'}")
    if type_ == "publishable":
        publiques.insert(0, valeur)          # les nouvelles cles ont la priorite
    elif nom == "anon":
        publiques.append(valeur)
    if type_ == "secret":
        secretes.insert(0, valeur)
    elif nom == "service_role":
        secretes.append(valeur)

if not publiques:
    print("\nAucune cle publique identifiee — arret.")
    sys.exit(1)

ecrire_env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publiques[0])
print(f"\n-> NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ecrite ({len(publiques[0])} caracteres)")

if secretes:
    ecrire_env("SUPABASE_SECRET_KEY", secretes[0])
    print(f"-> SUPABASE_SECRET_KEY ecrite ({len(secretes[0])} caracteres)")
else:
    print("-> aucune cle secrete renvoyee (a recuperer dans Settings > API Keys)")

from env_local import lire_env  # noqa: E402

print("\nETAT FINAL DE .env.local (aucune valeur affichee) :")
final = lire_env(CHEMIN)
for cle in ("SUPABASE_ACCESS_TOKEN", "NEXT_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY",
            "SUPABASE_DB_PASSWORD"):
    v = final.get(cle, "")
    print(f"  {cle:<38} {'remplie (' + str(len(v)) + ')' if v else 'VIDE'}")
