"""Motiq — un utilisateur peut-il s'offrir un plan payant ?

A executer DEUX FOIS : avant et apres la migration 0005.

  python prouver-faille-plan.py avant
  python prouver-faille-plan.py apres

« avant » doit montrer la faille (l'auto-promotion passe).
« apres » doit montrer la correction (elle est refusee, et le nom reste
modifiable).
"""

from __future__ import annotations

import json
import secrets
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

MODE = sys.argv[1] if len(sys.argv) > 1 else "avant"

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
print(f" AUTO-PROMOTION DE PLAN — MODE « {MODE.upper()} »")
print("=" * 78)
print(f"  utilisateur : {identifiant}")
print("  1) on remet le plan a « gratuit » avec la CLE SECRETE (cote serveur)")
code, corps = appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", SECRETE,
                    {"plan": "gratuit", "quota_restant": 3})
print(f"     HTTP {code}")

print("\n  2) l'utilisateur tente de S'OFFRIR le plan « business » avec SON jeton")
code, corps = appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", PUBLIQUE,
                    {"plan": "business"}, jeton=JETON)
reussi = code in (200, 201) and corps.strip().startswith("[") and len(json.loads(corps)) > 0
print(f"     HTTP {code}  -> {'PROMOTION ACCEPTEE' if reussi else 'PROMOTION REFUSEE'}")
if not reussi and corps.strip():
    try:
        print(f"     message : {json.loads(corps).get('message', corps[:100])[:130]}")
    except Exception:  # noqa: BLE001
        print(f"     reponse : {corps[:130]}")

print("\n  3) et peut-il encore corriger son NOM ? (doit rester possible)")
code, corps = appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", PUBLIQUE,
                    {"nom": "Compte de test a"}, jeton=JETON)
nom_ok = code in (200, 201) and corps.strip().startswith("[") and len(json.loads(corps)) > 0
print(f"     HTTP {code}  -> {'NOM MODIFIE (correct)' if nom_ok else 'NOM REFUSE (probleme)'}")

print("\n  4) lecture finale avec la cle secrete")
code, corps = appel("GET", f"/rest/v1/profiles?select=nom,plan,quota_restant&id=eq.{identifiant}",
                    SECRETE)
print(f"     {corps[:200]}")

print("\n" + "=" * 78)
if MODE == "avant":
    print(" ATTENDU AVANT CORRECTION  : promotion ACCEPTEE (c'est la faille)")
    print(" VERDICT :", "faille CONFIRMEE." if reussi else "promotion deja refusee — faille absente ?")
else:
    print(" ATTENDU APRES CORRECTION  : promotion REFUSEE, nom toujours modifiable")
    bon = (not reussi) and nom_ok
    print(" VERDICT :", "correction EFFECTIVE." if bon else "!! LA CORRECTION NE SUFFIT PAS")
print("=" * 78)
