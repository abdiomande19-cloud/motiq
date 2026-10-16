"""Motiq — cree les plans d'abonnement sur Paystack (mode TEST).

Un « plan » Paystack, c'est l'abonnement mensuel auquel un client souscrit.
On en cree deux, aux prix valides par le donneur d'ordre : 4 900 et 9 900 Fr CFA.

DEUX PRECAUTIONS
  1. Le montant est multiplie par 100. Le F CFA n'a pas de centimes, mais
     Paystack l'exige quand meme : sans cela on facturerait 100 fois moins.
  2. REJOUABLE : si un plan du meme nom existe deja, on le REUTILISE au lieu
     d'en creer un deuxieme. Relancer ce script ne doit pas remplir le compte
     de doublons.

A la fin, les identifiants (PLN_...) sont ecrits dans .env.local, jamais
affiches en entier.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

RACINE = Path(r"C:\Users\Diomande\Motiq")
ENV = RACINE / "app" / ".env.local"

v = lire_env(str(ENV))
SEC = (v.get("PAYSTACK_SECRET_KEY") or "").strip()
if not SEC:
    raise SystemExit("!! PAYSTACK_SECRET_KEY absente")

# Les prix viennent de lib/tarifs.ts — source unique, pas de chiffre recopie ici.
TARIFS_TS = (RACINE / "app" / "lib" / "tarifs.ts").read_text(encoding="utf-8")

PLANS = [
    ("PAYSTACK_PLAN_PRO", "Motiq Pro", "pro"),
    ("PAYSTACK_PLAN_BUSINESS", "Motiq Business", "business"),
]


def prix_du_plan(plan: str) -> int:
    import re

    m = re.search(rf"{plan}:\s*\{{\s*plan:\s*'{plan}'.*?prix:\s*(\d+)", TARIFS_TS, re.S)
    if not m:
        raise SystemExit(f"!! prix introuvable pour « {plan} » dans lib/tarifs.ts")
    return int(m.group(1))


def donnees(reponse):
    """Une reponse d'API peut etre un objet, une liste, ou du texte d'erreur."""
    return reponse if isinstance(reponse, dict) else {}


def appel(methode: str, chemin: str, corps: dict | None = None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(
        f"https://api.paystack.co{chemin}",
        data=donnees,
        method=methode,
        headers={
            "Authorization": f"Bearer {SEC}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            # Sans User-Agent, Cloudflare repond 403 « error code: 1010 » —
            # ce qui ressemble a tort a une cle invalide.
            "User-Agent": "Motiq/0.1",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as ex:
        corps_err = ex.read().decode("utf-8", "replace")
        try:
            return ex.code, json.loads(corps_err)
        except Exception:  # noqa: BLE001
            return ex.code, {"message": corps_err[:200]}
    except Exception as ex:  # noqa: BLE001
        return 0, {"message": str(ex)}


print("=" * 78)
print(" PLANS D'ABONNEMENT PAYSTACK (mode test)")
print("=" * 78)

code, brut = appel("GET", "/plan?perPage=100")
liste = donnees(brut)
if code != 200 or not liste.get("status"):
    raise SystemExit(f"!! lecture des plans impossible (HTTP {code}) : {str(brut)[:200]}")

existants = {p.get("name"): p for p in (liste.get("data") or [])}
print(f"\n{len(existants)} plan(s) deja present(s) sur ce compte.\n")

codes: dict[str, str] = {}

for variable, nom, plan in PLANS:
    prix = prix_du_plan(plan)
    montant = prix * 100  # <- la multiplication exigee par Paystack

    print(f"--- {nom}")
    print(f"    prix valide      : {prix} F CFA")
    print(f"    montant envoye   : {montant}  (x100, exigence Paystack pour le XOF)")

    if nom in existants:
        plan_code = existants[nom].get("plan_code")
        montant_existant = existants[nom].get("amount")
        print(f"    -> deja present, REUTILISE (montant en base : {montant_existant})")
        if montant_existant != montant:
            print(f"    !! ATTENTION : montant different de celui attendu ({montant})")
    else:
        code, brut = appel(
            "POST",
            "/plan",
            {
                "name": nom,
                "interval": "monthly",
                "amount": montant,
                "currency": "XOF",
                "description": f"Abonnement mensuel {nom} — facture en francs CFA",
            },
        )
        reponse = donnees(brut)
        if code in (200, 201) and reponse.get("status"):
            plan_code = donnees(reponse.get("data")).get("plan_code")
            print(f"    -> CREE, identifiant {plan_code}")
        else:
            print(f"    !! ECHEC HTTP {code} : {reponse.get('message')}")
            continue

    if not plan_code:
        print("    !! identifiant de plan introuvable")
        continue

    codes[variable] = plan_code
    masque = plan_code[:8] + "x" * max(0, len(plan_code) - 8)
    print(f"    identifiant      : {masque}   ({len(plan_code)} caracteres)")

if len(codes) != len(PLANS):
    raise SystemExit("\n!! tous les plans n'ont pas pu etre obtenus")

# ------------------------------------------------- ecriture dans .env.local
texte = ENV.read_text(encoding="utf-8")
lignes = texte.splitlines()
for variable, valeur in codes.items():
    trouvee = False
    for i, l in enumerate(lignes):
        if l.strip().startswith(variable + "="):
            lignes[i] = f"{variable}={valeur}"
            trouvee = True
            break
    if not trouvee:
        lignes.append(f"{variable}={valeur}")

contenu = "\n".join(lignes)
if not contenu.endswith("\n"):
    contenu += "\n"
tmp = ENV.with_suffix(".local.tmp")
tmp.write_text(contenu, encoding="utf-8")
tmp.replace(ENV)

print("\n" + "=" * 78)
print(" ECRITURE DANS .env.local")
for variable in codes:
    print(f"   {variable:<28} enregistre")
print("\n VERDICT : les deux plans sont prets, en mode test.")
print("=" * 78)
