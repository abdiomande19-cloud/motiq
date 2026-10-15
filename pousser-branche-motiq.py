#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MOTIQ — pousse la branche main locale sous une branche 'motiq' dans un depot
accessible par le jeton, SANS toucher a sa branche main (aucune destruction).

Affiche d'abord le contenu des depots candidats, choisit celui qui contient le
moins de fichiers, pousse, puis verifie le SHA distant.
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
CANDIDATS = ["abdiomande19-cloud/Site-web-Fitpro", "abdiomande19-cloud/Ambr-lie-th-"]


def jeton():
    for l in open(ENV, encoding="utf-8", errors="replace"):
        if l.startswith("GITHUB_TOKEN="):
            return l.split("=", 1)[1].strip()
    return None


def api(chemin, t):
    r = urllib.request.Request(API + chemin)
    r.add_header("Authorization", "Bearer " + t)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", "motiq-publication")
    try:
        with urllib.request.urlopen(r, timeout=25) as x:
            return x.status, json.loads(x.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}
    except Exception as e:
        return None, {"message": type(e).__name__}


def maj_env(cle, valeur):
    lignes = open(ENV, encoding="utf-8", errors="replace").read().splitlines()
    for i, l in enumerate(lignes):
        if re.match(r"^\s*%s\s*=" % re.escape(cle), l):
            lignes[i] = "%s=%s" % (cle, valeur)
    open(ENV, "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")


def main():
    t = jeton()
    if not t:
        print("  jeton absent")
        return 1

    infos = []
    for nom in CANDIDATS:
        code, det = api("/repos/" + nom, t)
        det = det if isinstance(det, dict) else {}
        code_b, branches = api("/repos/%s/branches" % nom, t)
        liste_b = [b["name"] for b in branches] if isinstance(branches, list) else []
        code_f, fichiers = api("/repos/%s/contents/" % nom, t)
        noms = [f["name"] for f in fichiers] if isinstance(fichiers, list) else []
        infos.append({"nom": nom, "push": (det.get("permissions") or {}).get("push"),
                      "branches": liste_b, "fichiers": noms})
        print("  %s" % nom)
        print("     push=%s | branches=%s" % (infos[-1]["push"], liste_b or "aucune"))
        print("     a la racine : %s" % (", ".join(noms[:8]) or "aucun fichier"))

    utilisables = [i for i in infos if i["push"]]
    if not utilisables:
        print("  aucun depot accessible en ecriture")
        return 1
    cible = min(utilisables, key=lambda i: len(i["fichiers"]))
    print("\n  Depot retenu pour la branche 'motiq' : %s" % cible["nom"])

    subprocess.run(["git", "remote", "remove", "origin"], cwd=PROJET, capture_output=True)
    subprocess.run(["git", "remote", "add", "origin",
                    "https://github.com/%s.git" % cible["nom"]], cwd=PROJET, check=True)

    e = dict(os.environ)
    e["GIT_ASKPASS"] = PROJET + r"\outils\git-askpass.sh"
    e["GIT_TERMINAL_PROMPT"] = "0"
    p = subprocess.run(["git", "push", "origin", "main:motiq"],
                       cwd=PROJET, env=e, capture_output=True, text=True)
    print("  push main -> branche 'motiq' : code %s" % p.returncode)
    for l in (p.stderr or "").splitlines()[-5:]:
        print("     %s" % l)
    if p.returncode != 0:
        return 1

    code, d = api("/repos/%s/commits/motiq" % cible["nom"], t)
    sha_d = d.get("sha", "?") if isinstance(d, dict) else "?"
    sha_l = subprocess.run(["git", "rev-parse", "HEAD"], cwd=PROJET,
                           capture_output=True, text=True).stdout.strip()
    print("\n  SHA local   : %s" % sha_l)
    print("  SHA distant : %s" % sha_d)
    print("  %s" % ("VERIFIE : la branche distante pointe le meme commit."
                     if sha_l == sha_d else "DIVERGENCE — a examiner."))
    maj_env("GITHUB_REPO", cible["nom"])
    print("\n  URL du projet : https://github.com/%s/tree/motiq" % cible["nom"])
    print("  GITHUB_REPO mis a jour dans le .env.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
