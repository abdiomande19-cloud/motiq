"""Motiq — nettoie les comptes et fichiers crees PENDANT LES TESTS.

POURQUOI
Les preuves de securite ont cree de vrais comptes (test-motiq-a, test-motiq-b,
essai-...) et leurs fichiers. Ce sont MES traces, pas les donnees de
l'utilisateur : elles n'ont rien a faire dans l'application livree.

CE QUE CE SCRIPT NE TOUCHE JAMAIS
Uniquement les adresses en « @exemple.invalid ». C'est un domaine reserve, qui
ne peut pas correspondre a une vraie personne, et il est exclu par construction
les comptes du client (toute autre adresse, notamment @gmail.com).

Deux temps, toujours :
    python outils/nettoyer-tests.py             -> simulation, ne supprime RIEN
    python outils/nettoyer-tests.py --confirmer -> supprime
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

CONFIRMER = "--confirmer" in sys.argv
DOMAINE_TEST = "@exemple.invalid"

v = lire_env(r"C:\Users\Diomande\Motiq\app\.env.local")
BASE = v.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SECRETE = v.get("SUPABASE_SECRET_KEY", "")


def appel(methode, chemin, corps=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    e = {"apikey": SECRETE, "Authorization": f"Bearer {SECRETE}",
         "Content-Type": "application/json"}
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode, headers=e)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            texte = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(texte) if texte.strip() else None)
    except urllib.error.HTTPError as ex:
        return ex.code, ex.read().decode("utf-8", "replace")
    except Exception as ex:  # noqa: BLE001
        return 0, str(ex)


print("=" * 78)
print(" NETTOYAGE DES TRACES DE TEST" + ("" if CONFIRMER else "  (simulation)"))
print("=" * 78)

code, donnees = appel("GET", "/auth/v1/admin/users?per_page=200")
if code != 200 or not isinstance(donnees, dict):
    raise SystemExit(f"liste des comptes illisible (HTTP {code}) : {str(donnees)[:200]}")

tous = donnees.get("users", [])
a_supprimer = [u for u in tous if str(u.get("email", "")).endswith(DOMAINE_TEST)]
conserves = [u for u in tous if not str(u.get("email", "")).endswith(DOMAINE_TEST)]

print(f"\n{len(tous)} compte(s) au total\n")

if not a_supprimer:
    print("  Aucun compte de test a nettoyer.")
else:
    print("  A SUPPRIMER (domaine de test uniquement) :")
    for u in a_supprimer:
        code, projets = appel("GET", f"/rest/v1/projects?select=id&user_id=eq.{u['id']}")
        n_projets = len(projets) if isinstance(projets, list) else "?"
        print(f"    - {u['email']:<38} {n_projets} projet(s)")

print(f"\n  CONSERVES ({len(conserves)} compte(s), non touches) :")
for u in conserves:
    print(f"    - {u['email']}")

if not CONFIRMER:
    print("\n" + "=" * 78)
    print(" SIMULATION : rien n'a ete supprime.")
    print(" Pour executer : python outils/nettoyer-tests.py --confirmer")
    print("=" * 78)
    sys.exit(0)

# ------------------------------------------------------------------ execution
print("\n" + "=" * 78)
print(" SUPPRESSION")
print("=" * 78)

for u in a_supprimer:
    identifiant = u["id"]

    # 1) Fichiers du dossier de l'utilisateur dans le stockage.
    code, objets = appel("POST", "/storage/v1/object/list/medias", {"prefix": identifiant})
    chemins: list[str] = []

    def parcourir(elements, prefixe=""):
        for element in elements or []:
            nom = element.get("name")
            if not nom:
                continue
            chemin = f"{prefixe}{nom}"
            if element.get("id") is None:
                code, sous = appel("POST", "/storage/v1/object/list/medias", {"prefix": chemin})
                parcourir(sous if isinstance(sous, list) else [], f"{chemin}/")
            else:
                chemins.append(chemin)

    if isinstance(objets, list):
        parcourir(objets)

    if chemins:
        code, _ = appel("DELETE", "/storage/v1/object/medias", {"prefixes": chemins})
        print(f"  {u['email']:<38} {len(chemins)} fichier(s) supprime(s)   HTTP {code}")
    else:
        print(f"  {u['email']:<38} aucun fichier")

    # 2) Le compte. Les donnees liees partent en cascade (cle etrangere).
    code, _ = appel("DELETE", f"/auth/v1/admin/users/{identifiant}")
    print(f"  {'':38} compte supprime                HTTP {code}")

# ------------------------------------------------------------------ controle
print("\n--- controle final ---")
code, donnees = appel("GET", "/auth/v1/admin/users?per_page=200")
restants = donnees.get("users", []) if isinstance(donnees, dict) else []
encore = [u for u in restants if str(u.get("email", "")).endswith(DOMAINE_TEST)]
print(f"  comptes restants : {len(restants)}")
print(f"  comptes de test encore presents : {len(encore)}")
for u in restants:
    print(f"    - {u['email']}")
print("\n" + "=" * 78)
print(" RESULTAT :", "nettoyage termine." if not encore else "!! il en reste")
print("=" * 78)
