"""Controle rigoureux de l'aller-retour d'un fichier dans le stockage.

Le test precedent affichait « PNG valide : False » a cause d'une erreur
d'ecriture dans MA comparaison (une chaine d'echappement dans une f-string
comparait les caracteres \\x89 et non l'octet 0x89). Ce script refait le
controle proprement : empreintes md5 de ce qui est envoye et de ce qui revient.
"""

from __future__ import annotations

import base64
import hashlib
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

ENVOYE = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def appeler(methode, chemin, cle, corps=None, jeton=None, type_contenu=None):
    donnees = corps if isinstance(corps, bytes) else (
        json.dumps(corps).encode() if corps is not None else None)
    entetes = {}
    if cle:
        entetes["apikey"] = cle
        entetes["Authorization"] = f"Bearer {jeton or cle}"
    if type_contenu:
        entetes["Content-Type"] = type_contenu
    elif corps is not None and not isinstance(corps, bytes):
        # Sans cet en-tete, le serveur ne parvient pas a lire le corps JSON
        # et repond « Could not parse request body as JSON ».
        entetes["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode,
                                 headers=entetes)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # noqa: BLE001
        return 0, str(e).encode()


def jeton_de(courriel):
    mdp = secrets.token_urlsafe(18)
    code, corps = appeler("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
    for u in json.loads(corps).get("users", []):
        if u.get("email") == courriel:
            code, reponse = appeler("PUT", f"/auth/v1/admin/users/{u['id']}", SECRETE,
                                    {"password": mdp, "email_confirm": True})
            if code not in (200, 201):
                raise SystemExit(f"reinitialisation refusee (HTTP {code}) : {reponse[:200]!r}")

            for essai in range(1, 4):
                code, corps = appeler("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                                      {"email": courriel, "password": mdp})
                if code == 200:
                    d = json.loads(corps)
                    if "access_token" in d:
                        return d["access_token"], d["user"]["id"]
                print(f"   connexion : essai {essai}, HTTP {code} -> {corps[:160]!r}")
                import time
                time.sleep(6 * essai)
            raise SystemExit("connexion impossible apres 3 essais")
    raise SystemExit("compte introuvable")


jeton, identifiant = jeton_de("test-motiq-a@exemple.invalid")
chemin = f"{identifiant}/verification/octets.png"

print(f"fichier envoye  : {len(ENVOYE)} octets")
print(f"  premiers octets : {' '.join(f'{o:02x}' for o in ENVOYE[:8])}")
print(f"  md5 envoye      : {hashlib.md5(ENVOYE).hexdigest()}")

code, _ = appeler("POST", f"/storage/v1/object/medias/{chemin}", PUBLIQUE,
                  ENVOYE, jeton=jeton, type_contenu="image/png")
print(f"\ndepot : HTTP {code}")

code, recu = appeler("GET", f"/storage/v1/object/medias/{chemin}", PUBLIQUE, jeton=jeton)
print(f"lecture : HTTP {code}")
if code == 200:
    print(f"fichier recu    : {len(recu)} octets")
    print(f"  premiers octets : {' '.join(f'{o:02x}' for o in recu[:8])}")
    print(f"  md5 recu        : {hashlib.md5(recu).hexdigest()}")
    identique = recu == ENVOYE
    print(f"\n  OCTETS IDENTIQUES : {'OUI' if identique else 'NON'}")
    signature = recu[:8] == bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    print(f"  signature PNG valide (89 50 4e 47 0d 0a 1a 0a) : {'OUI' if signature else 'NON'}")
