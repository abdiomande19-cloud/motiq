"""
Motiq — configurer l'authentification pour la PRODUCTION.

CE QUI ETAIT CASSE
`site_url` valait « http://localhost:3000 ». En production, Supabase s'en sert
comme adresse de retour par defaut : un client qui confirme son inscription
ou demande a reinitialiser son mot de passe recevait un lien vers une adresse
qui n'existe que sur la machine du developpeur. Lien mort, compte inutilisable,
et le client conclut que le produit ne marche pas.

CE SCRIPT FAIT TROIS CHOSES
  1. `site_url` pointe sur le domaine de production ;
  2. `uri_allow_list` accepte la production ET localhost — sans localhost, le
     developpement local cesse de fonctionner, et sans production, les liens
     des clients sont refuses ;
  3. il VERIFIE ce qu'il vient d'ecrire : un 200 de l'API ne prouve pas que la
     valeur a ete retenue.

Il ne touche PAS aux fournisseurs : activer Google demande des identifiants
qui n'existent pas encore ici.

Usage : python outils/configurer-auth-production.py
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

ENV = lire_env(r"C:\Users\Diomande\Motiq\app\.env.local")
TOKEN = (ENV.get("SUPABASE_ACCESS_TOKEN") or "").strip()
REF = "lsdijolrsghaxwopabfu"

PRODUCTION = "https://app-chi-eosin-29.vercel.app"

# Toutes les adresses qui doivent pouvoir recevoir un retour d'authentification.
# Supabase refuse une redirection si elle ne figure pas ici — y compris celle
# qu'il fabrique lui-meme a partir de `site_url`.
AUTORISEES = [
    PRODUCTION,
    f"{PRODUCTION}/auth/callback",
    "http://localhost:3000",
    "http://localhost:3000/auth/callback",
    # Motif generique : les adresses de PREVIEW de Vercel changent a chaque
    # deploiement. Les lister une par une serait un travail sans fin, et
    # oublier la derniere revient a casser les tests sur preview.
    "https://*.vercel.app",
    "https://*.vercel.app/auth/callback",
]


def api(methode: str, chemin: str, corps: dict | None = None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(
        f"https://api.supabase.com{chemin}",
        data=donnees,
        method=methode,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            t = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(t) if t.strip() else {})
    except urllib.error.HTTPError as e:
        t = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(t)
        except Exception:  # noqa: BLE001
            return e.code, t
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def principal() -> None:
    print("=" * 74)
    print(" MOTIQ — AUTHENTIFICATION EN PRODUCTION")
    print("=" * 74)

    if not TOKEN:
        print("  !! SUPABASE_ACCESS_TOKEN absent de app/.env.local")
        sys.exit(1)

    # ------------------------------------------------- 1. etat avant
    print("\n1) ETAT AVANT")
    code, avant = api("GET", f"/v1/projects/{REF}/config/auth")
    if code != 200 or not isinstance(avant, dict):
        print(f"  !! lecture impossible (HTTP {code}) : {str(avant)[:160]}")
        sys.exit(1)

    ancien_site = avant.get("site_url")
    print(f"   site_url      : {ancien_site}")
    print(f"   uri_allow_list: {avant.get('uri_allow_list') or '(vide)'}")

    if ancien_site == PRODUCTION:
        print("\n   site_url est deja correct.")
    else:
        print("\n   !! site_url pointait vers une adresse de developpement.")
        print("      Les liens envoyes aux clients en production etaient morts.")

    # ------------------------------------------------- 2. ecriture
    print("\n2) ECRITURE")
    code, corps = api(
        "PATCH",
        f"/v1/projects/{REF}/config/auth",
        {
            "site_url": PRODUCTION,
            "uri_allow_list": ",".join(AUTORISEES),
        },
    )
    print(f"   HTTP {code}")
    if code >= 400:
        print(f"   !! refus : {str(corps)[:300]}")
        sys.exit(1)

    # ------------------------------------------------- 3. verification
    print("\n3) VERIFICATION (on relit, on ne croit pas la reponse du PATCH)")
    code, apres = api("GET", f"/v1/projects/{REF}/config/auth")
    if code != 200 or not isinstance(apres, dict):
        print(f"   !! relecture impossible (HTTP {code})")
        sys.exit(1)

    nouveau_site = apres.get("site_url")
    liste = (apres.get("uri_allow_list") or "").split(",")
    liste = [x for x in (l.strip() for l in liste) if x]

    print(f"   site_url       : {nouveau_site}")
    print(f"   adresses permises ({len(liste)}) :")
    for a in liste:
        print(f"     - {a}")

    ok_site = nouveau_site == PRODUCTION
    ok_prod = any(PRODUCTION in a for a in liste)
    ok_local = any("localhost:3000" in a for a in liste)

    print()
    print(f"   {'OK  ' if ok_site else 'ECHEC'}  site_url = production")
    print(f"   {'OK  ' if ok_prod else 'ECHEC'}  production dans la liste")
    print(f"   {'OK  ' if ok_local else 'ECHEC'}  localhost conserve (developpement)")

    print("\n" + "=" * 74)
    if ok_site and ok_prod and ok_local:
        print(" AUTHENTIFICATION PRETE POUR LA PRODUCTION")
        print("=" * 74)
        print("\n Il reste a activer Google, ce qui demande le Client ID et le")
        print(" Client Secret crees sur console.cloud.google.com.")
        sys.exit(0)

    print(" !! A REVOIR")
    print("=" * 74)
    sys.exit(1)


if __name__ == "__main__":
    principal()
