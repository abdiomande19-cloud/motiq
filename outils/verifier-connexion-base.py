"""Teste la connexion a la base PostgreSQL de Supabase.

Utilise l'analyseur robuste de env_local (lecture ligne par ligne) : la version
precedente contenait un `\\s*` qui traversait les sauts de ligne et lisait la
mauvaise valeur.

N'affiche JAMAIS le mot de passe : toute occurrence est masquee avant impression.
"""

from __future__ import annotations

import re
import sys

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

CHEMIN = r"C:\Users\Diomande\Motiq\app\.env.local"
valeurs = lire_env(CHEMIN)

url = valeurs.get("NEXT_PUBLIC_SUPABASE_URL", "")
motdepasse = valeurs.get("SUPABASE_DB_PASSWORD", "")

m = re.search(r"([a-z0-9]{20})\.supabase\.co", url)
if not m:
    print("REF_INTROUVABLE dans NEXT_PUBLIC_SUPABASE_URL")
    print("  valeur presente :", bool(url), f"(longueur {len(url)})")
    sys.exit(1)

ref = m.group(1)
print("ref du projet      :", ref)
print("mot de passe       :", "charge" if motdepasse else "ABSENT",
      f"({len(motdepasse)} caracteres, jamais affiche)")

if not motdepasse:
    print("\nRESULTAT=PAS_DE_MOT_DE_PASSE")
    sys.exit(3)

import psycopg  # noqa: E402

REGIONS = [
    "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-north-1",
    "us-east-1", "us-east-2", "us-west-1", "ca-central-1", "sa-east-1",
    "ap-southeast-1", "ap-northeast-1",
]

candidats = [("direct IPv6 5432",
              dict(host=f"db.{ref}.supabase.co", port=5432, user="postgres"))]
for region in REGIONS:
    candidats.append((f"pooler {region} 6543",
                      dict(host=f"aws-0-{region}.pooler.supabase.com", port=6543,
                           user=f"postgres.{ref}")))


def nettoyer(message: str) -> str:
    if motdepasse:
        message = message.replace(motdepasse, "***")
    return re.sub(r"password=\S+", "password=***", message)[:140]


for nom, params in candidats:
    try:
        with psycopg.connect(dbname="postgres", password=motdepasse,
                             connect_timeout=8, **params) as conn:
            with conn.cursor() as cur:
                cur.execute("select current_database(), current_user, version()")
                base, utilisateur, version = cur.fetchone()
            print(f"\nRESULTAT=CONNEXION_OK via {nom}")
            print("  base        :", base)
            print("  utilisateur :", utilisateur)
            print("  version     :", version.split(",")[0])
            print("  HOTE        :", params["host"], "port", params["port"])
            print("  UTILISATEUR :", params["user"])
            sys.exit(0)
    except Exception as exc:  # noqa: BLE001
        print(f"  {nom:30} ECHEC {type(exc).__name__}: {nettoyer(str(exc))}")

print("\nRESULTAT=AUCUNE_CONNEXION")
sys.exit(2)
