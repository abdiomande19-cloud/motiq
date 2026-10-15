"""Teste la connexion directe a la base PostgreSQL de Supabase.

N'affiche JAMAIS le mot de passe : toute occurrence est masquee avant impression.
Sert a decider si l'on peut appliquer le schema sans jeton d'API.
"""
import re
import sys

CHEMIN = r"C:\Users\Diomande\Motiq\app\.env.local"
texte = open(CHEMIN, encoding="utf-8", errors="replace").read()


def lire(cle: str) -> str:
    m = re.search(rf"^{cle}\s*=\s*(.*)$", texte, re.M)  # pas de \s* apres '=' : il traverserait la ligne
    return (m.group(1).strip().strip('"').strip("'") if m else "")


url = lire("NEXT_PUBLIC_SUPABASE_URL")
motdepasse = lire("SUPABASE_DB_PASSWORD")

m = re.match(r"^https?://([a-z0-9]+)\.supabase\.co/?$", url)
if not m:
    print("URL_INATTENDUE : la forme attendue est https://<ref>.supabase.co")
    print("forme recue (masquee) :", re.sub(r"[a-z0-9]", "x", url))
    sys.exit(1)

ref = m.group(1)
print("projet detecte        : ref =", ref)
print("mot de passe charge   :", bool(motdepasse), f"({len(motdepasse)} caracteres, non affiche)")

import psycopg  # noqa: E402

# Deux chemins possibles chez Supabase :
#  - connexion directe      : db.<ref>.supabase.co:5432 (parfois IPv6 seulement)
#  - pooler (IPv4 partage)  : aws-0-<region>.pooler.supabase.com:6543
candidats = [
    ("connexion directe 5432", dict(host=f"db.{ref}.supabase.co", port=5432, user="postgres")),
    ("pooler 6543", dict(host=f"aws-0-eu-central-1.pooler.supabase.com", port=6543,
                         user=f"postgres.{ref}")),
    ("pooler 5432", dict(host=f"aws-0-eu-central-1.pooler.supabase.com", port=5432,
                         user=f"postgres.{ref}")),
]

for nom, params in candidats:
    try:
        with psycopg.connect(dbname="postgres", password=motdepasse,
                             connect_timeout=12, **params) as conn:
            with conn.cursor() as cur:
                cur.execute("select current_database(), current_user, version()")
                base, utilisateur, version = cur.fetchone()
            print(f"\nRESULTAT=CONNEXION_OK via {nom}")
            print("  base        :", base)
            print("  utilisateur :", utilisateur)
            print("  version     :", version.split(",")[0])
            sys.exit(0)
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)
        if motdepasse:
            msg = msg.replace(motdepasse, "***")
        msg = re.sub(r"password=\S+", "password=***", msg)
        print(f"  {nom} -> ECHEC : {type(exc).__name__}: {msg[:180]}")

print("\nRESULTAT=AUCUNE_CONNEXION")
sys.exit(2)
