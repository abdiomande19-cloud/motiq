"""
Motiq — activer la connexion Google dans Supabase.

COMMENT ON RECUPERE LES IDENTIFIANTS SANS LES AFFICHER
La personne copie une valeur sur Google Cloud, puis lance ce script : il lit
le PRESSE-PAPIERS. Rien n'est tape dans une conversation, rien n'est affiche.

Le script reconnait lui-meme ce qu'il vient de lire :
  - un identifiant client finit par  .apps.googleusercontent.com
  - un secret client commence par  GOCSPX-
Il enregistre celui qu'il reconnait, et dit lequel copier ensuite.

Quand les deux sont la, il active le fournisseur dans Supabase et VERIFIE en
relisant la configuration.

Usage : python outils/activer-google.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

ENV = lire_env(r"C:\Users\Diomande\Motiq\app\.env.local")
TOKEN = (ENV.get("SUPABASE_ACCESS_TOKEN") or "").strip()
REF = "lsdijolrsghaxwopabfu"
PRODUCTION = "https://app-chi-eosin-29.vercel.app"

# Les identifiants sont stockes hors du depot, a cote du jeton Vercel.
STOCKAGE = Path(r"C:\Users\Diomande\Motiq\outils\.google-oauth.json")


def presse_papiers() -> str:
    """Lit le presse-papiers Windows, en tolerant les octets non-UTF8.

    PowerShell renvoie parfois des octets qui ne sont pas de l'UTF-8 valide —
    par exemple quand le presse-papiers contient du texte enrichi ou une image.
    Sans `errors="replace"`, la lecture leve UnicodeDecodeError et le script
    s'arrete sur un message incomprehensible, alors que la valeur cherchee
    n'etait meme pas dans le presse-papiers.
    """
    try:
        sortie = subprocess.run(
            ["powershell.exe", "-NoProfile", "-Command", "Get-Clipboard -Raw"],
            capture_output=True,
            timeout=20,
        )
        brut = sortie.stdout or b""
        return brut.decode("utf-8", errors="replace").strip()
    except Exception:  # noqa: BLE001
        return ""


def api(methode: str, chemin: str, corps: dict | None = None):
    import urllib.error
    import urllib.request

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


def charger() -> dict:
    if STOCKAGE.exists():
        try:
            return json.loads(STOCKAGE.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return {}
    return {}


def enregistrer(donnees: dict) -> None:
    STOCKAGE.write_text(json.dumps(donnees, indent=2), encoding="utf-8")
    try:
        STOCKAGE.chmod(0o600)
    except Exception:  # noqa: BLE001
        pass


def principal() -> None:
    print("=" * 74)
    print(" MOTIQ — CONNEXION GOOGLE")
    print("=" * 74)

    if not TOKEN:
        print("  !! SUPABASE_ACCESS_TOKEN absent")
        sys.exit(1)

    donnees = charger()
    valeur = presse_papiers()

    # ------------------------------------------- 1. reconnaitre la valeur
    if valeur:
        if "apps.googleusercontent.com" in valeur:
            id_client = valeur.split()[0].strip()
            donnees["client_id"] = id_client
            enregistrer(donnees)
            print(f"\n   identifiant client enregistre ({len(id_client)} caracteres)")
        elif valeur.startswith("GOCSPX-"):
            donnees["client_secret"] = valeur.split()[0].strip()
            enregistrer(donnees)
            print(f"\n   secret client enregistre ({len(valeur)} caracteres)")
        else:
            print(f"\n   presse-papiers non reconnu ({len(valeur)} caracteres).")
            print("   Copie l'IDENTIFIANT (.apps.googleusercontent.com) ou le SECRET (GOCSPX-).")

    id_client = donnees.get("client_id")
    secret = donnees.get("client_secret")

    print("\n1) ETAT DES IDENTIFIANTS")
    print(f"   identifiant client : {'present' if id_client else 'MANQUANT'}")
    print(f"   secret client      : {'present' if secret else 'MANQUANT'}")

    if not id_client or not secret:
        print("\n   Il manque une valeur. Fais ceci :")
        if not id_client:
            print("     a) Google Cloud > Identifiants > ton client OAuth")
            print("        -> copie l'IDENTIFIANT (la ligne qui finit par .apps.googleusercontent.com)")
        if not secret:
            print("     b) meme page -> copie le SECRET (la ligne qui commence par GOCSPX-)")
        print("     c) relance ce script")
        print("\n   Adresse de redirection a avoir mise dans Google :")
        print(f"     https://{REF}.supabase.co/auth/v1/callback")
        sys.exit(0)

    # ---------------------------------------- 2. activer dans Supabase
    print("\n2) ACTIVATION DANS SUPABASE")
    code, corps = api(
        "PATCH",
        f"/v1/projects/{REF}/config/auth",
        {
            "external_google_enabled": True,
            "external_google_client_id": id_client,
            "external_google_secret": secret,
            "site_url": PRODUCTION,
        },
    )
    print(f"   HTTP {code}")
    if code >= 400:
        print(f"   !! refus : {str(corps)[:300]}")
        sys.exit(1)

    # --------------------------------------------- 3. verification
    print("\n3) VERIFICATION (relecture, pas la reponse du PATCH)")
    code, apres = api("GET", f"/v1/projects/{REF}/config/auth")
    if code != 200 or not isinstance(apres, dict):
        print(f"   !! relecture impossible (HTTP {code})")
        sys.exit(1)

    actif = apres.get("external_google_enabled")
    id_relu = apres.get("external_google_client_id") or ""
    secret_relu = apres.get("external_google_secret")

    print(f"   external_google_enabled : {actif}")
    print(f"   client_id (debut)       : {id_relu[:18]}…" if id_relu else "   client_id : vide")
    print(f"   secret                  : {'present' if secret_relu else 'ABSENT'}")

    ok = bool(actif) and bool(id_relu) and bool(secret_relu)

    print("\n" + "=" * 74)
    if ok:
        print(" GOOGLE ACTIVE")
        print("=" * 74)
        print("\n Le bouton « Continuer avec Google » doit maintenant fonctionner.")
        print(f" Teste sur {PRODUCTION}/connexion")
        sys.exit(0)

    print(" !! GOOGLE NON ACTIVE")
    print("=" * 74)
    print("\n Verifie que le Client ID est bien celui d'une application Web,")
    print(" et que l'adresse de redirection declaree chez Google est :")
    print(f"   https://{REF}.supabase.co/auth/v1/callback")
    sys.exit(1)


if __name__ == "__main__":
    principal()
