"""Motiq — les medias d'un projet sont-ils proteges ?

  1. A cree un media (fiche + fichier dans le stockage) ;
  2. B tente de SUPPRIMER le media de A      -> doit echouer sans effet ;
  3. on verifie que le media de A est toujours la ;
  4. A supprime son propre media             -> doit reussir ;
  5. on verifie qu'il a disparu.

Piege a eviter : PostgREST repond 200 avec un corps vide quand RLS ecarte la
ligne. On ne conclut donc JAMAIS sur le code HTTP : on relit la donnee.
"""

from __future__ import annotations

import base64
import json
import secrets
import sys
import urllib.error
import urllib.request
import uuid

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

v = lire_env(r"C:\Users\Diomande\Motiq\app\.env.local")
BASE = v.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SECRETE = v.get("SUPABASE_SECRET_KEY", "")
PUBLIQUE = v.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def appel(methode, chemin, cle, corps=None, jeton=None, brut=False, type_contenu=None):
    donnees = corps if brut else (json.dumps(corps).encode() if corps is not None else None)
    e = {"apikey": cle, "Authorization": f"Bearer {jeton or cle}"}
    if donnees is not None:
        e["Content-Type"] = type_contenu or "application/json"
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


def connecter(courriel):
    mdp = secrets.token_urlsafe(18)
    code, corps = appel("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
    for u in json.loads(corps).get("users", []):
        if u.get("email") == courriel:
            appel("PUT", f"/auth/v1/admin/users/{u['id']}", SECRETE,
                  {"password": mdp, "email_confirm": True})
            code, corps = appel("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                                {"email": courriel, "password": mdp})
            d = json.loads(corps)
            return d["access_token"], d["user"]["id"]
    raise SystemExit(f"{courriel} introuvable")


ja, ida = connecter("test-motiq-a@exemple.invalid")
jb, idb = connecter("test-motiq-b@exemple.invalid")
print(f"A = {ida}\nB = {idb}")

print("=" * 78)
print(" MEDIAS — SUPPRESSION CROISEE ENTRE COMPTES")
print("=" * 78)

# --- projet de A
code, corps = appel("GET", "/rest/v1/projects?select=id&limit=1", PUBLIQUE, jeton=ja)
projets = json.loads(corps)
projet_a = projets[0]["id"] if projets else None
if not projet_a:
    code, corps = appel("POST", "/rest/v1/projects", PUBLIQUE,
                        {"titre": "Essai medias", "entree_source": "images"}, jeton=ja)
    projet_a = json.loads(corps)[0]["id"]
print(f"\nprojet de A : {projet_a}")

# --- 1) A depose une image
chemin = f"{ida}/images/{uuid.uuid4().hex}.png"
code, corps = appel("POST", f"/storage/v1/object/medias/{chemin}", PUBLIQUE, PNG,
                    jeton=ja, brut=True, type_contenu="image/png")
print(f"1) A depose le fichier                    HTTP {code}")

code, corps = appel("POST", "/rest/v1/assets", PUBLIQUE,
                    {"projet_id": projet_a, "type": "image", "chemin": chemin,
                     "taille_octets": len(PNG)}, jeton=ja)
if code not in (200, 201):
    raise SystemExit(f"insertion du media impossible : {corps[:200]}")
media_a = json.loads(corps)[0]["id"]
print(f"   fiche du media creee                   id={media_a}")

# --- 2) B tente de supprimer le media de A
code, corps = appel("DELETE", f"/rest/v1/assets?id=eq.{media_a}", PUBLIQUE, jeton=jb)
supprimes = 0
try:
    supprimes = len(json.loads(corps)) if corps.strip().startswith("[") else 0
except Exception:  # noqa: BLE001
    supprimes = 0
print(f"\n2) B tente de SUPPRIMER le media de A     HTTP {code}, {supprimes} ligne(s) supprimee(s)")

# --- 3) le media de A existe-t-il toujours ?
code, corps = appel("GET", f"/rest/v1/assets?select=id&id=eq.{media_a}", PUBLIQUE, jeton=ja)
encore_la = len(json.loads(corps)) if corps.strip().startswith("[") else 0
print(f"3) relecture par A : {encore_la} media(s) trouve(s)")
print(f"   VERDICT : {'media toujours la — B n a rien pu supprimer' if encore_la == 1 else '!! LE MEDIA A DISPARU : FAILLE'}")

# --- 4) A supprime son propre media
code, corps = appel("DELETE", f"/rest/v1/assets?id=eq.{media_a}", PUBLIQUE, jeton=ja)
print(f"\n4) A supprime SON media                   HTTP {code}")

# --- 5) verification
code, corps = appel("GET", f"/rest/v1/assets?select=id&id=eq.{media_a}", PUBLIQUE, jeton=ja)
restant = len(json.loads(corps)) if corps.strip().startswith("[") else 0
print(f"5) relecture par A : {restant} media(s)")
print(f"   VERDICT : {'suppression effective' if restant == 0 else '!! TOUJOURS LA'}")
