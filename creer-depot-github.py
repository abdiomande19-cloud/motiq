#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MOTIQ — cree le depot GitHub prive s'il n'existe pas.

Le jeton est lu dans le .env du profil Application Builder et n'est JAMAIS
affiche : seul le code de reponse de l'API et l'URL du depot le sont.
"""
import json
import os
import sys
import urllib.error
import urllib.request

ENV_PATH = os.path.expandvars(
    r"%LOCALAPPDATA%\hermes\profiles\application-builder-agent\.env")
API = "https://api.github.com"


def lire_env():
    vals = {}
    with open(ENV_PATH, encoding="utf-8", errors="replace") as f:
        for l in f:
            if "=" in l and not l.lstrip().startswith("#"):
                k, v = l.split("=", 1)
                vals[k.strip()] = v.strip()
    return vals


def appel(methode, chemin, jeton, corps=None):
    data = json.dumps(corps).encode() if corps else None
    req = urllib.request.Request(API + chemin, data=data, method=methode)
    req.add_header("Authorization", "Bearer " + jeton)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "motiq-creation-depot")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}
    except Exception as e:
        return None, {"message": "reseau : " + type(e).__name__}


def main():
    env = lire_env()
    jeton, depot = env.get("GITHUB_TOKEN"), env.get("GITHUB_REPO")
    if not jeton or not depot:
        print(" GITHUB_TOKEN ou GITHUB_REPO absent du .env — rien a faire.")
        return 1

    code, data = appel("GET", "/repos/" + depot, jeton)
    if code == 200:
        print(" Depot DEJA PRESENT : %s" % data.get("html_url"))
        print("   prive=%s | branche par defaut=%s | vide=%s"
              % (data.get("private"), data.get("default_branch"),
                 data.get("size") == 0))
        return 0

    print(" Depot absent (reponse %s). Creation en cours..." % code)
    nom = depot.split("/", 1)[1]
    code, data = appel("POST", "/user/repos", jeton, {
        "name": nom,
        "private": True,
        "description": "Motiq - application SaaS de creation de videos motion design (LAB 04, HACKTUALIZ | ACADEMY-COTE D'IVOIRE)",
        "auto_init": False,
        "has_issues": True,
        "has_wiki": False,
    })
    if code == 201:
        print(" RESULTAT : depot CREE.")
        print("   URL    : %s" % data.get("html_url"))
        print("   clone  : %s" % data.get("clone_url"))
        print("   prive  : %s" % data.get("private"))
        return 0
    print(" ECHEC : l'API repond %s." % code)
    print("   message GitHub : %s" % (data or {}).get("message"))
    docs = (data or {}).get("documentation_url")
    if docs:
        print("   doc            : %s" % docs)
    if code in (403, 404):
        print("   -> Le jeton n'a probablement pas la permission 'Administration'")
        print("      (portee compte) necessaire pour creer un depot.")
        print("      Correctif : creez-le a la main sur https://github.com/new")
        print("      (nom 'motiq', prive, sans README ni .gitignore), puis relancez ce script.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
