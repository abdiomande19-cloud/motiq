#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MOTIQ — pousse le depot sur GitHub dans un depot accessible par le jeton.

Le jeton ne peut pas CREER de depot (permission Administration absente), mais il
peut ecrire dans les depots existants qu'il couvre. On choisit donc un depot
EXISTANT et VIDE, on y pousse la branche main, puis on met a jour GITHUB_REPO.

Ne supprime rien, n'ecrase aucun contenu : si le depot n'est pas vide, on
s'arrete et on le signale. Le jeton n'est jamais affiche.
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

ENV = os.path.expandvars(r"%LOCALAPPDATA%\hermes\profiles\application-builder-agent\.env")
API = "https://api.github.com"
PROJET = r"C:\Users\Diomande\Motiq"
PREFERENCE = ["Site-web-Fitpro", "Ambr-lie-th-"]   # du plus recent au plus ancien


def lire_env():
    d = {}
    for l in open(ENV, encoding="utf-8", errors="replace"):
        if "=" in l and not l.lstrip().startswith("#"):
            k, v = l.split("=", 1)
            d[k.strip()] = v.strip()
    return d


def maj_env(cle, valeur):
    lignes = open(ENV, encoding="utf-8", errors="replace").read().splitlines()
    trouve = False
    for i, l in enumerate(lignes):
        if re.match(r"^\s*%s\s*=" % re.escape(cle), l):
            lignes[i] = "%s=%s" % (cle, valeur)
            trouve = True
    if not trouve:
        lignes.append("%s=%s" % (cle, valeur))
    open(ENV, "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")


def api(chemin, jeton, methode="GET", corps=None):
    data = json.dumps(corps).encode() if corps else None
    r = urllib.request.Request(API + chemin, data=data, method=methode)
    r.add_header("Authorization", "Bearer " + jeton)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", "motiq-publication")
    if data:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=25) as x:
            return x.status, json.loads(x.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}
    except Exception as e:
        return None, {"message": "reseau : " + type(e).__name__}


def main():
    env = lire_env()
    jeton = env.get("GITHUB_TOKEN")
    if not jeton:
        print("  GITHUB_TOKEN absent du .env")
        return 1

    code, liste = api("/user/repos?per_page=100&sort=updated", jeton)
    if code != 200 or not isinstance(liste, list):
        print("  impossible de lister les depots (%s)" % code)
        return 1

    candidats = sorted(
        [r for r in liste if r["full_name"].split("/")[1] in PREFERENCE],
        key=lambda r: PREFERENCE.index(r["full_name"].split("/")[1]))

    for r in candidats:
        nom = r["full_name"]
        code, det = api("/repos/" + nom, jeton)
        det = det if isinstance(det, dict) else {}
        push = (det.get("permissions") or {}).get("push")
        code_f, fichiers = api("/repos/%s/contents/" % nom, jeton)
        vide = isinstance(fichiers, list) and len(fichiers) == 0
        print("  %s : push=%s | vide=%s | prive=%s" % (nom, push, vide, det.get("private")))
        if not push:
            continue
        if not vide:
            print("     -> contient deja des fichiers : on n'y touche pas.")
            continue

        print("\n  Depot retenu : %s" % nom)
        subprocess.run(["git", "remote", "remove", "origin"], cwd=PROJET,
                       capture_output=True)
        subprocess.run(["git", "remote", "add", "origin",
                        "https://github.com/%s.git" % nom], cwd=PROJET, check=True)

        e = dict(os.environ)
        e["GIT_ASKPASS"] = PROJET + r"\outils\git-askpass.sh"
        e["GIT_TERMINAL_PROMPT"] = "0"
        p = subprocess.run(["git", "push", "--set-upstream", "origin", "main"],
                           cwd=PROJET, env=e, capture_output=True, text=True)
        print("  push : code %s" % p.returncode)
        for ligne in (p.stderr or "").splitlines()[-4:]:
            print("     %s" % ligne)

        if p.returncode != 0:
            return 1

        code, det2 = api("/repos/%s/commits/main" % nom, jeton)
        sha = det2.get("sha", "?") if code == 200 else "?"
        local = subprocess.run(["git", "rev-parse", "HEAD"], cwd=PROJET,
                               capture_output=True, text=True).stdout.strip()
        print("\n  SHA local   : %s" % local)
        print("  SHA distant : %s" % sha)
        print("  %s" % ("VERIFIE : identiques." if sha == local else "DIVERGENCE"))
        maj_env("GITHUB_REPO", nom)
        print("  GITHUB_REPO mis a jour dans le .env : %s" % nom)
        print("\n  URL : https://github.com/%s" % nom)
        print("  -> Renommez le depot en 'motiq' (Settings > Repository name) :")
        print("     les commits et l'historique sont conserves.")
        return 0
    print("  Aucun depot vide et accessible en ecriture.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
