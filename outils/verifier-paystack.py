"""Motiq — les cles Paystack sont-elles valides ET en mode TEST ?

Trois verifications, dans cet ordre :

  1. PRESENCE — les deux lignes sont-elles remplies ?
  2. FORME   — quel prefixe, quelle longueur ? Affiche sous forme masquee :
               on garde la ponctuation et le prefixe, on remplace le reste par
               des « x ». Suffisant pour reperer une erreur de copie, sans
               jamais exposer la cle.
  3. EFFICACITE — on appelle REELLEMENT l'API Paystack avec la cle secrete.
               Une cle presente mais fausse ne doit pas passer pour valide.

GARDE-FOU : si la cle secrete commence par « sk_live_ », on s'arrete net. Une
cle de production ne doit jamais servir a tester, et surtout jamais etre
manipulee sans decision explicite.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

v = lire_env(r"C:\Users\Diomande\Motiq\app\.env.local")
PUB = (v.get("PAYSTACK_PUBLIC_KEY") or "").strip()
SEC = (v.get("PAYSTACK_SECRET_KEY") or "").strip()


def forme(cle: str) -> str:
    """Masque une cle : garde le prefixe (type_etat_) et la longueur."""
    m = re.match(r"^([a-z]+_[a-z]+_)(.*)$", cle)
    if m:
        return f"{m.group(1)}{'x' * len(m.group(2))}  ({len(cle)} caracteres)"
    return f"{'x' * len(cle)}  ({len(cle)} caracteres)"


print("=" * 78)
print(" VERIFICATION DES CLES PAYSTACK")
print("=" * 78)

print("\n1) PRESENCE")
print(f"     PAYSTACK_PUBLIC_KEY  : {'remplie' if PUB else 'VIDE'}")
print(f"     PAYSTACK_SECRET_KEY  : {'remplie' if SEC else 'VIDE'}")

if not PUB or not SEC:
    print("\n !! Une des deux cles est vide.")
    print("    Relance la saisie : outils/3-remplir-les-cles.bat")
    sys.exit(1)

print("\n2) FORME (masquee — aucune valeur affichee)")
print(f"     cle publique : {forme(PUB)}")
print(f"     cle secrete  : {forme(SEC)}")

prefixes_ok = True
if not PUB.startswith("pk_test_"):
    prefixes_ok = False
    print(f"     !! la cle publique ne commence pas par pk_test_")
if SEC.startswith("sk_live_"):
    print("\n" + "!" * 78)
    print(" ARRET : c'est une cle de PRODUCTION (sk_live_).")
    print(" On ne teste jamais avec elle. Reprends la cle de test (sk_test_).")
    print("!" * 78)
    sys.exit(2)
if not SEC.startswith("sk_test_"):
    prefixes_ok = False
    print("     !! la cle secrete ne commence pas par sk_test_")
if prefixes_ok:
    print("     prefixes : pk_test_ et sk_test_  -> MODE TEST (correct)")

print("\n3) EFFICACITE — appel reel a l'API Paystack")
# PIEGE VERIFIE : sans en-tete User-Agent, Cloudflare repond 403 « error code:
# 1010 » — ce qui ressemble a une cle invalide mais n'en est pas une. Le premier
# essai ne prouvait donc rien et faisait conclure a tort a une cle morte.
requete = urllib.request.Request(
    "https://api.paystack.co/balance",
    headers={
        "Authorization": f"Bearer {SEC}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Motiq/0.1",
    },
)
try:
    with urllib.request.urlopen(requete, timeout=45) as r:
        code = r.status
        corps = json.loads(r.read().decode("utf-8", "replace"))
    print(f"     HTTP {code}")
    print(f"     reponse status : {corps.get('status')}")
    print(f"     message        : {corps.get('message')}")
    devises = [d.get("currency") for d in (corps.get("data") or [])]
    print(f"     devises du compte : {', '.join(str(d) for d in devises) or 'aucune'}")
    efficace = code == 200 and corps.get("status") is True
except urllib.error.HTTPError as ex:
    corps = ex.read().decode("utf-8", "replace")
    print(f"     HTTP {ex.code}")
    try:
        print(f"     message : {json.loads(corps).get('message')}")
    except Exception:  # noqa: BLE001
        print(f"     {corps[:200]}")
    efficace = False
except Exception as ex:  # noqa: BLE001
    print(f"     echec reseau : {ex}")
    efficace = False

print("\n" + "=" * 78)
if efficace and prefixes_ok:
    print(" VERDICT : les cles sont valides, en MODE TEST, et l'API repond.")
    print(" Je peux brancher le paiement.")
else:
    print(" VERDICT : !! a corriger avant de continuer")
print("=" * 78)
sys.exit(0 if (efficace and prefixes_ok) else 1)
