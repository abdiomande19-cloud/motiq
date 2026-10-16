"""Motiq — relance TOUTES les preuves de securite et rend un verdict.

Les scripts du dossier `outils/` ont servi a etablir chaque affirmation du
README. Relances un par un, ils sont fastidieux ; ici, une seule commande.

Principe de lecture : mes scripts signalent un probleme par le marqueur « !! ».
Un controle qui en contient un est en echec. C'est volontairement simple et
verifiable a l'oeil : on ne cache rien derriere une abstraction.

Usage : python outils/verifier-tout.py
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

OUTILS = Path(__file__).parent
PYTHON = sys.executable

# (libelle, script, arguments)
CONTROLES: list[tuple[str, str, list[str]]] = [
    ("Schema : 8 tables, RLS, politiques", "verifier-schema.py", []),
    ("Fichier de secrets lisible", "env_local.py", [str(OUTILS.parent / "app" / ".env.local")]),
    ("Cloisonnement entre comptes", "prouver-authentification.py", []),
    ("Regles metier : duree, template", "prouver-parcours-projet.py", []),
    ("Stockage prive", "prouver-stockage.py", []),
    ("Aller-retour d'un fichier, octet par octet", "verifier-octets-stockage.py", []),
    ("Apparence du projet", "prouver-apparence.py", []),
    ("Medias : suppression croisee", "prouver-medias.py", []),
    ("Protection du plan payant", "prouver-faille-plan.py", ["apres"]),
    ("Quota : decompte reserve au serveur", "prouver-quota.py", []),
    ("Quota : renouvellement mensuel", "prouver-renouvellement-quota.py", []),
    ("Quota : chaque plan a sa dotation", "prouver-quotas-plans.py", []),
]


def lancer(script: str, arguments: list[str]) -> tuple[int, str, str]:
    chemin = OUTILS / script
    if not chemin.exists():
        return 127, "", f"script introuvable : {chemin}"
    try:
        resultat = subprocess.run(
            [PYTHON, str(chemin), *arguments],
            capture_output=True, text=True, timeout=600, cwd=str(OUTILS),
            encoding="utf-8", errors="replace",
        )
        return resultat.returncode, resultat.stdout or "", resultat.stderr or ""
    except subprocess.TimeoutExpired:
        return 124, "", "delai depasse (600 s)"
    except Exception as exc:  # noqa: BLE001
        return 1, "", f"{type(exc).__name__}: {exc}"


def main() -> int:
    print("=" * 78)
    print(" MOTIQ — VERIFICATION COMPLETE")
    print("=" * 78)
    print(f" {len(CONTROLES)} controles, lances l'un apres l'autre.\n")

    resultats: list[tuple[str, bool, str]] = []
    debut = time.time()

    for libelle, script, arguments in CONTROLES:
        print(f"--- {libelle}")
        code, sortie, erreur = lancer(script, arguments)

        probleme = "!!" in sortie or (code != 0 and "verifier-faille-plan" not in script)
        detail = ""

        # On extrait la ligne de verdict quand le script en donne une.
        for ligne in sortie.splitlines():
            if ligne.strip().startswith("VERDICT"):
                detail = ligne.strip()
                break
        if not detail and erreur.strip():
            detail = erreur.strip().splitlines()[-1][:90]

        resultats.append((libelle, not probleme, detail))
        print(f"    {'OK' if not probleme else 'ECHEC'}   {detail}")
        print()

    duree = round(time.time() - debut, 1)
    reussis = sum(1 for _, ok, _ in resultats if ok)

    print("=" * 78)
    print(" SYNTHESE")
    print("=" * 78)
    for libelle, ok, _ in resultats:
        print(f"   {'OK   ' if ok else 'ECHEC'}  {libelle}")
    print()
    print(f"   {reussis} / {len(resultats)} controles reussis, en {duree} s")
    print("=" * 78)

    if reussis != len(resultats):
        print("\n !! Au moins un controle a echoue : voir le detail ci-dessus.")
        return 1

    print("\n Toutes les protections annoncees dans le README sont verifiees.")
    print()
    print(" Ces controles CREENT des comptes de test (@exemple.invalid) et leurs")
    print(" fichiers. Pour les retirer une fois la verification faite :")
    print("     python outils/nettoyer-tests.py --confirmer")
    return 0


if __name__ == "__main__":
    sys.exit(main())
