"""Motiq — le decompte du quota est-il bien reserve au serveur ?

  1. on remet le quota a 2 avec la CLE SECRETE ;
  2. l'UTILISATEUR tente d'augmenter son quota        -> refuse ;
  3. l'UTILISATEUR tente d'appeler la fonction de
     decomposition                                     -> refuse (permission) ;
  4. le SERVEUR decompte deux fois                    -> 2 puis 1 puis 0 ;
  5. le SERVEUR decompte une troisieme fois           -> reste a 0, jamais negatif ;
  6. le SERVEUR enregistre la consommation du mois.
"""

from __future__ import annotations

import json
import secrets
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

v = lire_env(r"C:\Users\Diomande\Motiq\app\.env.local")
BASE = v.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SECRETE = v.get("SUPABASE_SECRET_KEY", "")
PUBLIQUE = v.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")


def appel(methode, chemin, cle, corps=None, jeton=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    e = {"apikey": cle, "Content-Type": "application/json",
         "Authorization": f"Bearer {jeton or cle}"}
    if methode in ("POST", "PATCH"):
        e["Prefer"] = "return=representation"
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode, headers=e)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as ex:
        return ex.code, ex.read().decode("utf-8", "replace")
    except Exception as ex:  # noqa: BLE001
        return 0, str(ex)


def message(corps: str) -> str:
    try:
        return json.loads(corps).get("message", corps[:110])[:120]
    except Exception:  # noqa: BLE001
        return corps[:110]


mdp = secrets.token_urlsafe(18)
code, corps = appel("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
identifiant = None
for u in json.loads(corps).get("users", []):
    if u.get("email") == "test-motiq-a@exemple.invalid":
        identifiant = u["id"]
        appel("PUT", f"/auth/v1/admin/users/{identifiant}", SECRETE,
              {"password": mdp, "email_confirm": True})
code, corps = appel("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                    {"email": "test-motiq-a@exemple.invalid", "password": mdp})
JETON = json.loads(corps)["access_token"]

print("=" * 78)
print(" QUOTA — SEUL LE SERVEUR DOIT POUVOIR LE DECOMPTER")
print("=" * 78)

# 1
code, _ = appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", SECRETE,
                {"plan": "gratuit", "quota_restant": 2})
print(f"\n1) serveur : quota remis a 2                       HTTP {code}")

# 2
code, corps = appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", PUBLIQUE,
                    {"quota_restant": 999}, jeton=JETON)
print(f"2) utilisateur : quota -> 999                      HTTP {code} -> "
      f"{'REFUSE (correct)' if code not in (200, 201) else '!! ACCEPTE : FAILLE'}")
if code not in (200, 201):
    print(f"      {message(corps)}")

# 3
code, corps = appel("POST", "/rest/v1/rpc/decrementer_quota", PUBLIQUE,
                    {"p_user_id": identifiant, "p_nombre": 1}, jeton=JETON)
print(f"3) utilisateur : appel de la fonction de decompte  HTTP {code} -> "
      f"{'REFUSE (correct)' if code not in (200, 201) else '!! ACCEPTE : FAILLE'}")
if code not in (200, 201):
    print(f"      {message(corps)}")

# 4
print("\n4) serveur : decompte successif")
for tour in (1, 2, 3):
    code, corps = appel("POST", "/rest/v1/rpc/decrementer_quota", SECRETE,
                        {"p_user_id": identifiant, "p_nombre": 1})
    if code in (200, 201):
        ligne = json.loads(corps)
        ligne = ligne[0] if isinstance(ligne, list) and ligne else ligne
        print(f"   tour {tour} : HTTP {code}  quota_restant = {ligne.get('quota_restant')}")
    else:
        print(f"   tour {tour} : HTTP {code}  {message(corps)}")

# 5
code, corps = appel("GET", f"/rest/v1/profiles?select=quota_restant&id=eq.{identifiant}", SECRETE)
final = json.loads(corps)[0]["quota_restant"]
print(f"\n5) quota final : {final}  -> "
      f"{'jamais negatif (correct)' if final == 0 else '!! VALEUR INATTENDUE'}")

# 6
mois = "2026-10"
code, corps = appel("POST", "/rest/v1/usage", SECRETE,
                    {"user_id": identifiant, "mois": mois, "nombre_rendus": 1,
                     "minutes_generees": 0.5})
deja = code in (409, 400)
if deja:
    code, corps = appel("PATCH", f"/rest/v1/usage?user_id=eq.{identifiant}&mois=eq.{mois}",
                        SECRETE, {"nombre_rendus": 2, "minutes_generees": 1.0})
print(f"6) serveur : consommation enregistree pour {mois}   HTTP {code}")
code, corps = appel("GET",
                    f"/rest/v1/usage?select=mois,nombre_rendus,minutes_generees&user_id=eq.{identifiant}",
                    SECRETE)
print(f"   relu : {corps[:180]}")

# 7
code, corps = appel("GET", f"/rest/v1/usage?select=id&user_id=eq.{identifiant}", PUBLIQUE, jeton=JETON)
n = len(json.loads(corps)) if corps.strip().startswith("[") else "n/a"
print(f"\n7) l'utilisateur relit SA consommation              HTTP {code}, {n} ligne(s)")

print("\n" + "=" * 78)
