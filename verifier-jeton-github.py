#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MOTIQ — verification d'un jeton GitHub SANS JAMAIS AFFICHER SA VALEUR.

Usage :
    python verifier-jeton-github.py

Ce script :
  1. cherche GITHUB_TOKEN dans l'environnement, puis dans le .env du profil
     de l'agent Application Builder ;
  2. affiche seulement : present/absent, longueur approximative, empreinte
     sha256 tronquee (comparable d'une fois a l'autre) ;
  3. interroge l'API GitHub avec ce jeton pour verifier qu'il FONCTIONNE :
     compte, portee (scopes), expiration eventuelle ;
  4. si GITHUB_REPO est renseigne, verifie l'acces a ce depot precis.

Ce qu'il n'affiche jamais : la valeur du jeton.
Sortie : code 0 si le jeton fonctionne, 1 sinon.
"""
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request

PROFIL_AGENT = os.path.expandvars(
    r"%LOCALAPPDATA%\hermes\profiles\application-builder-agent\.env")
API = "https://api.github.com"


def lire_env(chemin, nom):
    """Lit NOM=valeur dans un fichier .env, sans jamais l'afficher."""
    try:
        with open(chemin, "r", encoding="utf-8", errors="replace") as f:
            for ligne in f:
                m = re.match(r"^\s*" + nom + r"\s*=\s*(.*)$", ligne)
                if m:
                    return m.group(1).strip().strip('"').strip("'")
    except OSError:
        return None
    return None


def appel(chemin, jeton):
    req = urllib.request.Request(API + chemin)
    req.add_header("Authorization", "Bearer " + jeton)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "motiq-verif-jeton")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode("utf-8")), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, None, dict(e.headers)
    except Exception as e:                      # reseau, DNS, TLS...
        return None, {"exception": type(e).__name__}, {}


def main():
    jeton = os.environ.get("GITHUB_TOKEN") or lire_env(PROFIL_AGENT, "GITHUB_TOKEN")
    source = "variable d'environnement" if os.environ.get("GITHUB_TOKEN") else PROFIL_AGENT

    if not jeton:
        print("ETAT    : ABSENT — aucun GITHUB_TOKEN trouve")
        print("SOURCE  : %s" % source)
        print("ACTION  : ajoutez la ligne GITHUB_TOKEN=... dans ce fichier, puis relancez.")
        return 1

    print("ETAT         : PRESENT")
    print("SOURCE       : %s" % source)
    print("LONGUEUR     : %d caracteres" % len(jeton))
    print("EMPREINTE    : sha256[:12] = %s   (comparable, non reversible)"
          % hashlib.sha256(jeton.encode()).hexdigest()[:12])
    print("PREFIXE      : %s..." % jeton[:4] if len(jeton) > 8 else "PREFIXE      : (trop court pour etre un jeton GitHub)")

    code, data, entetes = appel("/user", jeton)
    if code == 200 and data:
        print("API /user    : OK — compte = %s" % data.get("login"))
        scopes = entetes.get("X-OAuth-Scopes") or entetes.get("x-oauth-scopes")
        expire = entetes.get("Github-Authentication-Token-Expiration")
        print("PORTEE       : %s" % (scopes if scopes else
                                    "jeton fin (fine-grained) — portee non listee par l'API"))
        if expire:
            print("EXPIRE LE    : %s" % expire)
        print("\nRESULTAT : le jeton FONCTIONNE.")
    elif code == 401:
        print("API /user    : 401 — jeton refuse (invalide, expire ou revoque)")
        print("\nRESULTAT : le jeton NE FONCTIONNE PAS.")
        return 1
    elif code is None:
        print("API /user    : pas de reponse (%s) — probleme reseau, jeton non teste"
              % data.get("exception"))
        return 1
    else:
        print("API /user    : code %s" % code)
        return 1

    depot = lire_env(PROFIL_AGENT, "GITHUB_REPO") or os.environ.get("GITHUB_REPO")
    if depot:
        code, data, _ = appel("/repos/" + depot, jeton)
        if code == 200 and data:
            print("DEPOT %-18s : accessible (prive=%s, branche=%s)"
                  % (depot, data.get("private"), data.get("default_branch")))
        elif code == 404:
            print("DEPOT %-18s : 404 — inexistant OU hors de la portee du jeton" % depot)
        else:
            print("DEPOT %-18s : code %s" % (depot, code))
    else:
        print("DEPOT        : GITHUB_REPO non renseigne — acces au depot non verifie")
    return 0


if __name__ == "__main__":
    sys.exit(main())
