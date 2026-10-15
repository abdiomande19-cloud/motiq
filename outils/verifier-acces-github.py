"""Verifie l'acces GitHub reel, sans jamais afficher le jeton.

Lit GITHUB_TOKEN / GITHUB_REPO depuis le .env du profil, puis interroge l'API GitHub :
identite du compte, droits de poussee sur le depot, branches existantes.
"""
import json
import os
import re
import urllib.error
import urllib.request

ENV = r"C:\Users\Diomande\AppData\Local\hermes\profiles\application-builder-agent\.env"
text = open(ENV, encoding="utf-8", errors="replace").read()


def lire(cle):
    m = re.search(rf"^(?:export\s+)?{cle}\s*=\s*(.*)$", text, re.M)
    return m.group(1).strip().strip('"').strip("'") if m else None


tok = lire("GITHUB_TOKEN")
repo = lire("GITHUB_REPO")
print("GITHUB_TOKEN present :", bool(tok), "| longueur :", len(tok or ""))
print("GITHUB_REPO          :", repo)

if not tok:
    raise SystemExit("Jeton absent du .env")


def api(chemin):
    req = urllib.request.Request(
        "https://api.github.com" + chemin,
        headers={
            "Authorization": f"Bearer {tok}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "motiq-verif",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:200]}


code, data = api("/user")
print("\n--- /user ->", code)
if code == 200:
    print("login        :", data.get("login"))
    print("nom affiche  :", data.get("name"))
    print("scopes lus   :", data.get("scopes", "non fourni"))
else:
    print(data)

if repo:
    code, data = api(f"/repos/{repo}")
    print(f"\n--- /repos/{repo} ->", code)
    if code == 200:
        perms = data.get("permissions", {})
        print("private            :", data.get("private"))
        print("permissions.push   :", perms.get("push"))
        print("permissions.admin  :", perms.get("admin"))
        print("branche par defaut :", data.get("default_branch"))
        print("poids du depot     :", data.get("size"), "Ko")
    else:
        print(data)

    code, data = api(f"/repos/{repo}/branches")
    print(f"\n--- branches ->", code)
    if code == 200:
        print("branches :", [b.get("name") for b in data])

    code, data = api(f"/repos/{repo}/commits?per_page=1")
    print(f"\n--- dernier commit ->", code)
    if code == 200 and data:
        c = data[0]
        print("sha    :", c["sha"][:12])
        print("auteur :", c["commit"]["author"]["name"], "|", c["commit"]["author"]["email"])
        print("date   :", c["commit"]["author"]["date"])
        print("message:", c["commit"]["message"].splitlines()[0][:90])
