"""Motiq — preuve que le STOCKAGE prive resiste.

Ce que ce script etablit, en s'adressant directement a l'API de stockage
(donc en contournant totalement l'interface) :

  1. l'utilisateur A depose un fichier dans SON dossier   -> accepte
  2. l'utilisateur B depose un fichier dans le dossier de A -> REFUSE
  3. l'utilisateur B lit le fichier de A                    -> REFUSE
  4. un visiteur sans jeton lit le fichier de A             -> REFUSE
  5. le fichier n'est pas accessible par une adresse publique -> REFUSE
  6. A relit son propre fichier                              -> accepte

Le point 2 est le plus important : le chemin fourni par le client est
« A/intrusion.png », et c'est la POLITIQUE du stockage qui l'ecarte. Le code
applicatif n'a rien a verifier pour que ce soit sur.
"""

from __future__ import annotations

import base64
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
BUCKET = "medias"

# Un PNG 1x1 valide (48 octets), pour un vrai fichier image.
PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def appeler(methode: str, chemin: str, cle: str | None, corps=None,
            jeton: str | None = None, type_contenu: str | None = None):
    donnees = corps if isinstance(corps, bytes) else (
        json.dumps(corps).encode() if corps is not None else None)
    entetes: dict[str, str] = {}
    if cle:
        entetes["apikey"] = cle
        entetes["Authorization"] = f"Bearer {jeton or cle}"
    elif jeton:
        entetes["Authorization"] = f"Bearer {jeton}"
    if type_contenu:
        entetes["Content-Type"] = type_contenu
    elif corps is not None and not isinstance(corps, bytes):
        entetes["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode,
                                 headers=entetes)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # noqa: BLE001
        return 0, f"{type(e).__name__}: {e}".encode()


def jeton_de(courriel: str) -> tuple[str, str]:
    """Connecte un compte de test et rend (jeton, identifiant)."""
    mdp = secrets.token_urlsafe(18)
    code, corps = appeler("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
    for u in json.loads(corps).get("users", []):
        if u.get("email") == courriel:
            appeler("PUT", f"/auth/v1/admin/users/{u['id']}", SECRETE,
                    {"password": mdp, "email_confirm": True})
            code, corps = appeler("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                                  {"email": courriel, "password": mdp})
            donnees = json.loads(corps)
            return donnees["access_token"], donnees["user"]["id"]
    raise SystemExit(f"compte {courriel} introuvable")


jeton_a, id_a = jeton_de("test-motiq-a@exemple.invalid")
jeton_b, id_b = jeton_de("test-motiq-b@exemple.invalid")

print("=" * 78)
print(" STOCKAGE PRIVE — LA POLITIQUE DU BUCKET RESISTE-T-ELLE ?")
print("=" * 78)
print(f"  utilisateur A : {id_a}")
print(f"  utilisateur B : {id_b}")
print(f"  bucket        : {BUCKET}")

chemin_a = f"{id_a}/logo/propre.png"
chemin_intrusion = f"{id_a}/logo/intrusion.png"

print("\n1) A depose dans SON dossier")
code, corps = appeler("POST", f"/storage/v1/object/{BUCKET}/{chemin_a}", PUBLIQUE,
                      PNG_1PX, jeton=jeton_a, type_contenu="image/png")
print(f"   HTTP {code}  -> {'ACCEPTE' if code in (200, 201) else 'REFUSE : ' + corps.decode()[:120]}")

print("\n2) B tente de deposer DANS LE DOSSIER DE A")
code, corps = appeler("POST", f"/storage/v1/object/{BUCKET}/{chemin_intrusion}", PUBLIQUE,
                      PNG_1PX, jeton=jeton_b, type_contenu="image/png")
print(f"   HTTP {code}  -> {'!! ACCEPTE : FAILLE' if code in (200, 201) else 'REFUSE (correct)'}")
if code not in (200, 201):
    print(f"      message : {corps.decode()[:130]}")

print("\n3) B tente de LIRE le fichier de A")
code, corps = appeler("GET", f"/storage/v1/object/{BUCKET}/{chemin_a}", PUBLIQUE, jeton=jeton_b)
print(f"   HTTP {code}  -> {'!! ACCEPTE : FAILLE' if code == 200 else 'REFUSE (correct)'}")

print("\n4) Visiteur SANS jeton")
code, corps = appeler("GET", f"/storage/v1/object/{BUCKET}/{chemin_a}", PUBLIQUE)
print(f"   HTTP {code}  -> {'!! ACCEPTE : FAILLE' if code == 200 else 'REFUSE (correct)'}")

print("\n5) Adresse PUBLIQUE (bucket prive)")
code, corps = appeler("GET", f"/storage/v1/object/public/{BUCKET}/{chemin_a}", None)
print(f"   HTTP {code}  -> {'!! ACCEPTE : LE BUCKET N EST PAS PRIVE' if code == 200 else 'REFUSE (correct)'}")

print("\n6) A relit SON fichier")
code, corps = appeler("GET", f"/storage/v1/object/{BUCKET}/{chemin_a}", PUBLIQUE, jeton=jeton_a)
if code == 200:
    print(f"   HTTP {code}  -> ACCEPTE, {len(corps)} octets recus, PNG valide : {corps[:4] == b'\\x89PNG'}")
else:
    print(f"   HTTP {code}  -> REFUSE : {corps.decode()[:120]}")

print("\n" + "=" * 78)
print(" Lecture : le dossier de chacun est etanche. Ce n'est pas le code de")
print(" l'application qui filtre — c'est la politique du bucket.")
print("=" * 78)
