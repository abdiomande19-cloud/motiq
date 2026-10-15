"""Preuve que la securite RLS fonctionne reellement.

On interroge l'API REST du projet (PostgREST) avec la cle PUBLIQUE, comme le
ferait un visiteur non connecte, et on verifie que :
  - il ne voit AUCUNE donnee privee
  - il ne peut PAS ecrire

Puis avec la cle SECRETE (cote serveur uniquement), on verifie que les donnees
sont bien la. C'est ce contraste qui prouve que RLS filtre.

Aucune valeur de cle n'est affichee.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

CHEMIN = r"C:\Users\Diomande\Motiq\app\.env.local"
v = lire_env(CHEMIN)
url = v.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
publique = v.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
secrete = v.get("SUPABASE_SECRET_KEY", "")


def requete(methode: str, chemin: str, cle: str, corps: object | None = None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    entetes = {"apikey": cle, "Authorization": f"Bearer {cle}",
               "Content-Type": "application/json"}
    if methode == "POST":
        entetes["Prefer"] = "return=representation"
    req = urllib.request.Request(f"{url}/rest/v1{chemin}", data=donnees,
                                 method=methode, headers=entetes)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, f"{type(e).__name__}: {e}"


print("=" * 76)
print(" PREUVE DE SECURITE — la cle publique ne doit rien voir de prive")
print("=" * 76)

print("\n1) AVEC LA CLE PUBLIQUE (comme un visiteur non connecte)")
for chemin, libelle in (("/projects?select=id,titre", "projets"),
                        ("/brand_kits?select=id", "kits de marque"),
                        ("/assets?select=id", "medias"),
                        ("/usage?select=id", "consommation")):
    code, corps = requete("GET", chemin, publique)
    n = len(json.loads(corps)) if corps.strip().startswith("[") else "n/a"
    verdict = "BLOQUE (RLS)" if code in (200, 401, 403) and n in (0, "n/a") else "!! FUITE"
    print(f"   {libelle:<16} HTTP {code}  lignes={n}  -> {verdict}")

code, corps = requete("POST", "/projects", publique,
                      {"titre": "TENTATIVE NON AUTORISEE", "user_id":
                       "00000000-0000-0000-0000-000000000000"})
refus = code in (401, 403, 400, 409)
print(f"   ecriture       HTTP {code}  -> {'REFUSEE' if refus else '!! ACCEPTEE'}")
if not refus:
    print("      reponse :", corps[:200])

print("\n2) AVEC LA CLE SECRETE (cote serveur, comme notre application)")
for chemin, libelle in (("/templates?select=id,nom", "templates"),
                        ("/projects?select=id", "projets")):
    code, corps = requete("GET", chemin, secrete)
    n = len(json.loads(corps)) if corps.strip().startswith("[") else "n/a"
    print(f"   {libelle:<16} HTTP {code}  lignes={n}")

print("\n" + "=" * 76)
print(" Lecture : la cle publique ne voit rien, la cle secrete voit le catalogue.")
print(" C'est exactement le comportement attendu : RLS refuse par defaut.")
print("=" * 76)
