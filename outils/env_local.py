"""Lecture ROBUSTE d'un fichier .env — ligne par ligne, sans piege de regex.

Le bug precedent : une expression du type `^CLE\\s*=\\s*(.*)$` avec re.M. Comme
`\\s` englobe le saut de ligne, `\\s*` traverse la ligne et `(.*)` capture la
ligne SUIVANTE (souvent un commentaire). Resultat : on croit une valeur remplie
alors que la ligne est vide.

Ici : on decoupe en lignes, on ignore les commentaires, on coupe au PREMIER '='.
Aucune valeur n'est affichee : uniquement des booleens, des longueurs et des
formes masquees.
"""

from __future__ import annotations

import re


def lire_env(chemin: str) -> dict[str, str]:
    """Retourne {CLE: valeur} pour toutes les affectations non commentees."""
    valeurs: dict[str, str] = {}
    with open(chemin, encoding="utf-8", errors="replace") as f:
        for brute in f:
            ligne = brute.rstrip("\r\n")
            depouillee = ligne.strip()
            if not depouillee or depouillee.startswith("#"):
                continue
            if "=" not in depouillee:
                continue
            cle, _, valeur = depouillee.partition("=")  # coupe au PREMIER '='
            valeurs[cle.strip()] = valeur.strip().strip('"').strip("'")
    return valeurs


def masquer(valeur: str) -> str:
    """Forme masquee : lettres et chiffres remplaces par x, ponctuation gardee."""
    return re.sub(r"[A-Za-z0-9]", "x", valeur)


if __name__ == "__main__":
    import sys

    chemin = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Diomande\Motiq\app\.env.local"
    valeurs = lire_env(chemin)

    print(f"cles trouvees (hors commentaires) : {len(valeurs)}")
    print()
    attendues = [
        "SUPABASE_ACCESS_TOKEN",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SECRET_KEY",
        "SUPABASE_DB_PASSWORD",
    ]
    for cle in attendues:
        presence = cle in valeurs
        valeur = valeurs.get(cle, "")
        print(f"{cle:38} definie={str(presence):5} remplie={str(bool(valeur)):5} longueur={len(valeur)}")
        if valeur:
            print(f"{'':38} forme = {masquer(valeur)}")

    print()
    print("--- toutes les cles reellement presentes ---")
    for cle, valeur in sorted(valeurs.items()):
        print(f"  {cle:38} longueur={len(valeur)}")
