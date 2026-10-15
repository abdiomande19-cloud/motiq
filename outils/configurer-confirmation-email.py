"""Motiq — rendre la connexion possible en developpement.

PROBLEME : le projet exige une confirmation par email a l'inscription
(mailer_autoconfirm = False). Or l'envoi d'emails par defaut de Supabase est
fortement limite : l'email de confirmation n'arrive pas, et le compte reste
inutilisable. Impossible de tester l'application dans ces conditions.

CE QUE FAIT CE SCRIPT : il active la confirmation automatique, le temps du
developpement. Un compte cree est donc immediatement utilisable.

A REACTIVER AVANT LA MISE EN LIGNE : en production, la confirmation par email
doit etre remise en service (c'est la protection contre l'inscription avec
l'adresse de quelqu'un d'autre). Le script sait aussi la remettre.
"""

from __future__ import annotations

import json
import secrets
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from api_supabase import appel  # noqa: E402
from env_local import lire_env  # noqa: E402

REF = "lsdijolrsghaxwopabfu"
ACTION = sys.argv[1] if len(sys.argv) > 1 else "activer"


def appel_projet(methode: str, chemin: str, cle: str, corps=None):
    """Appel sur l'API DU PROJET (auth/v1), pas sur l'API de gestion."""
    base = lire_env(r"C:\Users\Diomande\Motiq\app\.env.local").get(
        "NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    donnees = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(
        f"{base}{chemin}", data=donnees, method=methode,
        headers={"apikey": cle, "Content-Type": "application/json",
                 "Authorization": f"Bearer {cle}"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, f"{type(e).__name__}: {e}"

valeur = ACTION == "activer"


def lire_config():
    code, corps = appel("GET", f"/projects/{REF}/config/auth")
    if code != 200:
        print(f"lecture impossible (HTTP {code}) : {corps[:200]}")
        sys.exit(1)
    return json.loads(corps)


avant = lire_config()
print(f"avant : mailer_autoconfirm = {avant.get('mailer_autoconfirm')}")

code, corps = appel("PATCH", f"/projects/{REF}/config/auth",
                    {"mailer_autoconfirm": valeur})
print(f"ecriture : HTTP {code}")

apres = lire_config()
obtenu = apres.get("mailer_autoconfirm")
print(f"apres : mailer_autoconfirm = {obtenu}")

if obtenu is not valeur:
    print("!! la modification n'a pas ete prise en compte")
    sys.exit(1)

if valeur:
    print("\nUn compte cree est maintenant utilisable tout de suite.")
    print("RAPPEL : remettre la confirmation par email avant la mise en ligne")
    print("         (python outils/configurer-confirmation-email.py desactiver)")

    # --- Verification reelle : on cree un compte et on regarde la reponse ---
    print("\nVERIFICATION : creation d'un compte, la session est-elle ouverte aussitot ?")
    courriel = f"essai-{secrets.token_hex(4)}@exemple.invalid"
    motdepasse = secrets.token_urlsafe(16)
    publiques = json.loads(appel("GET", f"/projects/{REF}/api-keys?reveal=true")[1])
    cle_pub = next((c["api_key"] for c in publiques if c.get("type") == "publishable"), None)

    code, corps = appel_projet("POST", "/auth/v1/signup", cle_pub,
                               {"email": courriel, "password": motdepasse})
    if code not in (200, 201):
        print(f"   HTTP {code} -> ECHEC : {corps[:200]}")
        sys.exit(1)

    donnees = json.loads(corps)
    session = donnees.get("access_token")
    print(f"   HTTP {code}")
    print(f"   compte cree       : {courriel}")
    print(f"   session ouverte   : {'OUI' if session else 'NON'}")
    print(f"   identifiant       : {donnees.get('user', {}).get('id')}")
    print(f"\n   -> {'Une inscription connecte directement : le parcours fonctionne.' if session else 'PROBLEME : toujours pas de session.'}")
else:
    print("\nLa confirmation par email est de nouveau exigee.")
