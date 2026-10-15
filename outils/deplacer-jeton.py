"""Deplace une valeur mal placee : le jeton Supabase (sbp_...) se trouvait
dans la ligne SUPABASE_DB_PASSWORD.

Aucune valeur n'est affichee : uniquement des booleens et des longueurs.
"""

from __future__ import annotations

import re
import sys

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

CHEMIN = r"C:\Users\Diomande\Motiq\app\.env.local"

valeurs = lire_env(CHEMIN)
mdp = valeurs.get("SUPABASE_DB_PASSWORD", "")
jeton = valeurs.get("SUPABASE_ACCESS_TOKEN", "")

print("SUPABASE_DB_PASSWORD contient :", len(mdp), "caracteres")
print("  -> commence par 'sbp_'      :", mdp.startswith("sbp_"))
print("SUPABASE_ACCESS_TOKEN rempli  :", bool(jeton), f"({len(jeton)} caracteres)")

if not mdp.startswith("sbp_"):
    print("\nRien a deplacer : la valeur de SUPABASE_DB_PASSWORD n'est pas un jeton.")
    sys.exit(1)

lignes = open(CHEMIN, encoding="utf-8", errors="replace").read().split("\n")
resultat = []
for ligne in lignes:
    d = ligne.strip()
    if d.startswith("#") or "=" not in d:
        resultat.append(ligne)
        continue
    cle = d.split("=", 1)[0].strip()
    if cle == "SUPABASE_ACCESS_TOKEN":
        resultat.append(f"SUPABASE_ACCESS_TOKEN={mdp}")
    elif cle == "SUPABASE_DB_PASSWORD":
        # La vraie valeur sera fournie plus tard : on vide la ligne trompeuse.
        resultat.append("SUPABASE_DB_PASSWORD=")
    else:
        resultat.append(ligne)

with open(CHEMIN, "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(resultat))

final = lire_env(CHEMIN)
print("\nAPRES DEPLACEMENT :")
for cle in ("SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD"):
    v = final.get(cle, "")
    print(f"  {cle:26} {('rempli (' + str(len(v)) + ')') if v else 'vide'}")
print("\nOK : le jeton est maintenant dans SUPABASE_ACCESS_TOKEN.")
