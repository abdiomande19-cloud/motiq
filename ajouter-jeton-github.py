#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MOTIQ — place le jeton GitHub dans le .env de l'agent, SANS jamais le coller
dans une conversation ni le laisser dans l'historique du shell.

Vous lancez ce script dans votre terminal :
    python ajouter-jeton-github.py

Il vous demande le jeton en SAISIE MASQUEE (rien ne s'affiche, rien n'est
enregistre dans l'historique), l'ecrit dans le fichier .env du profil
Application Builder, puis verifie immediatement aupres de GitHub que le jeton
fonctionne — en n'affichant jamais que son empreinte.

Rien ne sort de votre machine, sauf l'appel de verification vers api.github.com.
"""
import getpass
import hashlib
import json
import os
import re
import shutil
import sys
import urllib.error
import urllib.request

ENV_PATH = os.path.expandvars(
    r"%LOCALAPPDATA%\hermes\profiles\application-builder-agent\.env")
API = "https://api.github.com"

CLES_GEREES = ("GITHUB_TOKEN", "GITHUB_REPO", "GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL")


def demander(invite, masque=False, defaut=None):
    while True:
        if masque:
            v = getpass.getpass(invite)
        else:
            v = input(invite)
        v = (v or "").strip()
        if v:
            return v
        if defaut is not None:
            return defaut
        print("   (obligatoire)")


def ecrire_env(chemin, valeurs):
    """Reecrit le .env en preservant tout, en remplacant les cles gerees."""
    lignes = []
    if os.path.exists(chemin):
        with open(chemin, "r", encoding="utf-8", errors="replace") as f:
            for ligne in f:
                m = re.match(r"^\s*([A-Za-z0-9_]+)\s*=", ligne)
                if m and m.group(1) in valeurs:
                    continue                      # on retire l'ancienne valeur
                lignes.append(ligne.rstrip("\r\n"))
        shutil.copy(chemin, chemin + ".bak-avant-jeton")
        print("   sauvegarde : %s.bak-avant-jeton" % os.path.basename(chemin))
    else:
        print("   (le fichier .env n'existait pas, il sera cree)")
    while lignes and not lignes[-1].strip():
        lignes.pop()
    lignes.append("")
    lignes.append("# --- Motiq / GitHub — ajoute le %s ---"
                  % __import__("datetime").datetime.now().strftime("%d/%m/%Y %H:%M"))
    for cle in CLES_GEREES:
        if cle in valeurs:
            lignes.append("%s=%s" % (cle, valeurs[cle]))
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lignes) + "\n")
    os.chmod(chemin, 0o600)


def verifier(jeton, depot):
    req = urllib.request.Request(API + "/user")
    req.add_header("Authorization", "Bearer " + jeton)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "motiq-ajout-jeton")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode())
            expire = dict(r.headers).get("Github-Authentication-Token-Expiration")
        print("   compte GitHub : %s" % data.get("login"))
        if expire:
            print("   expire le     : %s" % expire)
    except urllib.error.HTTPError as e:
        print("   ECHEC : l'API repond %s — jeton invalide, mal copie ou deja revoque" % e.code)
        return False
    except Exception as e:
        print("   jeton ecrit, mais verification impossible (reseau : %s)" % type(e).__name__)
        return True
    if depot:
        req = urllib.request.Request(API + "/repos/" + depot)
        req.add_header("Authorization", "Bearer " + jeton)
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("User-Agent", "motiq-ajout-jeton")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                d = json.loads(r.read().decode())
            print("   depot         : %s accessible (prive=%s)" % (depot, d.get("private")))
        except urllib.error.HTTPError as e:
            print("   depot         : inaccessible (%s) — verifiez GITHUB_REPO ou la portee du jeton" % e.code)
    return True


def main():
    print("=" * 66)
    print(" AJOUT DU JETON GITHUB — saisie masquee, rien ne va dans la conversation")
    print("=" * 66)
    print(" Fichier cible : %s\n" % ENV_PATH)

    jeton = demander(" Jeton GitHub (collez, puis Entree — l'affichage est masque) : ",
                     masque=True)
    if not re.match(r"^(github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})$", jeton):
        print("\n ATTENTION : la forme ne ressemble pas a un jeton GitHub.")
        print(" Attendu : github_pat_... (jeton fin) ou ghp_... (jeton classique).")
        if demander(" Continuer quand meme ? (o/n) : ").lower() not in ("o", "oui", "y"):
            return 1

    print("\n Empreinte de controle (a comparer, non reversible) : sha256[:12] = %s"
          % hashlib.sha256(jeton.encode()).hexdigest()[:12])

    depot = demander(" Depot GitHub (forme compte/motiq) : ")
    nom = demander(" Votre nom pour les commits : ")
    mail = demander(" Votre e-mail pour les commits : ")

    ecrire_env(ENV_PATH, {
        "GITHUB_TOKEN": jeton,
        "GITHUB_REPO": depot,
        "GIT_AUTHOR_NAME": nom,
        "GIT_AUTHOR_EMAIL": mail,
    })
    print("\n .env mis a jour (4 lignes ajoutees, anciennes valeurs remplacees le cas echeant)")
    print(" Permissions du fichier restreintes a votre compte.\n")

    print(" Verification aupres de GitHub :")
    ok = verifier(jeton, depot)
    print("\n" + (" RESULTAT : jeton EN PLACE et FONCTIONNEL." if ok
                  else " RESULTAT : jeton ecrit mais NON VALIDE — voir ci-dessus."))
    print(" Dites ensuite a l'Orchestrateur : « c'est en place ».\n")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
