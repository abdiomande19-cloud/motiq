"""Client minimal de l'API de gestion Supabase (stdlib uniquement).

Permet, avec un jeton personnel (sbp_) :
  - lister les projets                       : python api-supabase.py projets
  - executer du SQL dans un projet           : python api-supabase.py sql <ref> <fichier.sql>

Le jeton n'est JAMAIS affiche (ni dans les messages, ni dans les journaux).
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

CHEMIN = r"C:\Users\Diomande\Motiq\app\.env.local"
BASE_API = "https://api.supabase.com/v1"


def jeton() -> str:
    valeur = lire_env(CHEMIN).get("SUPABASE_ACCESS_TOKEN", "")
    if not valeur:
        print("AUCUN_JETON dans .env.local")
        sys.exit(1)
    return valeur


def appel(methode: str, chemin: str, corps: object | None = None) -> tuple[int, str]:
    donnees = json.dumps(corps).encode() if corps is not None else None
    requete = urllib.request.Request(
        f"{BASE_API}{chemin}",
        data=donnees,
        method=methode,
        headers={
            "Authorization": f"Bearer {jeton()}",
            "Content-Type": "application/json",
            "User-Agent": "motiq-cli",
        },
    )
    try:
        with urllib.request.urlopen(requete, timeout=90) as reponse:
            return reponse.status, reponse.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")
    except Exception as exc:  # noqa: BLE001
        return 0, f"{type(exc).__name__}: {exc}"


def lister_projets() -> int:
    code, corps = appel("GET", "/projects")
    print("HTTP", code)
    if code != 200:
        print(corps[:400])
        return 1
    projets = json.loads(corps)
    print(f"{len(projets)} projet(s) :")
    for p in projets:
        print(f"  - {p.get('name'):<24} ref={p.get('id')}  region={p.get('region')}  "
              f"statut={p.get('status')}")
    return 0


def executer_sql(ref: str, fichier: str) -> int:
    sql = open(fichier, encoding="utf-8").read()
    code, corps = appel("POST", f"/projects/{ref}/database/query", {"query": sql})
    print("HTTP", code)
    print(corps[:3000])
    return 0 if code in (200, 201) else 1


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "projets"
    if action == "projets":
        sys.exit(lister_projets())
    if action == "sql" and len(sys.argv) == 4:
        sys.exit(executer_sql(sys.argv[2], sys.argv[3]))
    print("Usage : api-supabase.py projets | api-supabase.py sql <ref> <fichier.sql>")
    sys.exit(2)
