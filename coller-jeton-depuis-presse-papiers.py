#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MOTIQ — place le jeton GitHub depuis le PRESSE-PAPIERS, sans jamais l'afficher.

Différence avec ajouter-jeton-github.py : aucun collage manuel. Le script lit
le presse-papiers (copie que vous venez de faire sur GitHub), VÉRIFIE le jeton
auprès de l'API AVANT d'écrire, et n'écrit que s'il fonctionne.

N'affiche jamais la valeur du jeton : seulement sa forme, son empreinte, le
compte associé, l'expiration et l'accès au dépôt.
"""
import hashlib
import json
import os
import re
import shutil
import sys
import urllib.error
import urllib.request
from datetime import datetime

ENV_PATH = os.path.expandvars(
    r"%LOCALAPPDATA%\hermes\profiles\application-builder-agent\.env")
API = "https://api.github.com"
PREFIXE = re.compile(r"^github_pat_[A-Za-z0-9_]{20,}$|^gh[pousr]_[A-Za-z0-9]{20,}$")


def lire_presse_papiers():
    """Lit le presse-papiers Windows. Ne renvoie rien si vide ou illisible."""
    try:
        import tkinter
        r = tkinter.Tk()
        r.withdraw()
        try:
            return (r.clipboard_get() or "").strip()
        finally:
            r.destroy()
    except Exception:
        return None


def api(chemin, jeton):
    req = urllib.request.Request(API + chemin)
    req.add_header("Authorization", "Bearer " + jeton)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "motiq-presse-papiers")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode()), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, None, dict(e.headers)
    except Exception as e:
        return None, {"exception": type(e).__name__}, {}


def ecrire_env(chemin, valeurs):
    lignes = []
    if os.path.exists(chemin):
        with open(chemin, "r", encoding="utf-8", errors="replace") as f:
            for ligne in f:
                m = re.match(r"^\s*([A-Za-z0-9_]+)\s*=", ligne)
                if m and m.group(1) in valeurs:
                    continue
                lignes.append(ligne.rstrip("\r\n"))
        shutil.copy(chemin, chemin + ".bak-avant-jeton")
    while lignes and not lignes[-1].strip():
        lignes.pop()
    lignes.append("")
    lignes.append("# --- Motiq / GitHub — ajoute le %s ---" % datetime.now().strftime("%d/%m/%Y %H:%M"))
    for cle, val in valeurs.items():
        lignes.append("%s=%s" % (cle, val))
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lignes) + "\n")
    os.chmod(chemin, 0o600)


def main():
    print("=" * 68)
    print(" MOTIQ — jeton GitHub depuis le presse-papiers (aucune valeur affichee)")
    print("=" * 68)

    brut = lire_presse_papiers()
    if brut is None:
        print(" Lecture du presse-papiers impossible (pas d'acces, ou vide).")
        return 1

    jeton = brut.strip().strip('"').strip("'")
    if not PREFIXE.match(jeton):
        print(" Le presse-papiers ne contient PAS un jeton GitHub reconnaissable.")
        print(" Forme attendue : github_pat_... (jeton fin) ou ghp_... (classique).")
        print(" Rien n'a ete lu ni affiche de son contenu. Rien n'a ete ecrit.")
        return 1

    print(" Forme du jeton   : VALIDE")
    print(" Longueur         : %d caracteres" % len(jeton))
    print(" Empreinte        : sha256[:12] = %s" % hashlib.sha256(jeton.encode()).hexdigest()[:12])

    print("\n Verification aupres de GitHub AVANT toute ecriture...")
    code, data, entetes = api("/user", jeton)
    if code != 200 or not data:
        print(" ECHEC : l'API repond %s." % code)
        if code == 401:
            print(" -> Jeton invalide ou REVOQUE. Rien n'a ete ecrit dans le .env.")
            print(" -> C'est le cas si le presse-papiers contient encore l'ancien jeton.")
        else:
            print(" -> Rien n'a ete ecrit dans le .env.")
        return 1

    login = data.get("login")
    expire = entetes.get("Github-Authentication-Token-Expiration")
    print(" Jeton VALIDE.")
    print("   compte GitHub  : %s" % login)
    if expire:
        print("   expiration     : %s" % expire)

    depot = "%s/motiq" % login
    code_d, data_d, _ = api("/repos/" + depot, jeton)
    if code_d == 200 and data_d:
        print("   depot          : %s — accessible (prive=%s)" % (depot, data_d.get("private")))
    elif code_d == 404:
        print("   depot          : %s — NON TROUVE. Creez-le sur https://github.com/new"
              % depot)
        print("                    (prive, sans README ni .gitignore). Le jeton est ecrit quand meme.")
    else:
        print("   depot          : %s — reponse %s" % (depot, code_d))

    ecrire_env(ENV_PATH, {
        "GITHUB_TOKEN": jeton,
        "GITHUB_REPO": depot,
        "GIT_AUTHOR_NAME": login,
        "GIT_AUTHOR_EMAIL": "%s@users.noreply.github.com" % login,
    })
    print("\n .env mis a jour : 4 lignes ecrites, anciennes valeurs remplacees.")
    print("   %s" % ENV_PATH)
    print("   sauvegarde : %s.bak-avant-jeton" % os.path.basename(ENV_PATH))
    print("   identite de commit par defaut : %s <%s@users.noreply.github.com>"
          % (login, login))
    print("   (modifiable ensuite : dites-moi votre nom et votre e-mail reels)")
    print("\n RESULTAT : jeton EN PLACE" + (" et FONCTIONNEL." if code == 200 else "."))
    return 0


if __name__ == "__main__":
    sys.exit(main())
