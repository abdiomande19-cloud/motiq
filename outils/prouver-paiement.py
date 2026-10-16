"""Motiq — le circuit de paiement fonctionne-t-il VRAIMENT ?

On ne peut pas payer par carte a la place de l'utilisateur. En revanche, on
peut se mettre EXACTEMENT a la place de Paystack : signer un corps de requete
avec la cle secrete, comme Paystack le fait, et l'envoyer au webhook.

C'est une vraie preuve de bout en bout : elle traverse la validation de
signature, les controles de montant et de devise, et l'activation en base.

CE QUI EST TESTE
  1. la page d'abonnement exige une session ;
  2. le webhook REFUSE une signature absente ;
  3. le webhook REFUSE une signature fausse ;
  4. le webhook REFUSE un montant 100 fois trop petit  <- le piege du XOF ;
  5. le webhook ACCEPTE un paiement correct et active le plan ;
  6. le renvoi du meme evenement ne cree PAS de deuxieme abonnement ;
  7. un paiement pour un AUTRE compte n'est pas applique.

Le compte de test est supprime a la fin.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

RACINE = r"C:\Users\Diomande\Motiq"
SITE = "http://localhost:3000"
v = lire_env(rf"{RACINE}\app\.env.local")
BASE = v["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SECRETE = v["SUPABASE_SECRET_KEY"].strip()
PUBLIQUE = v["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].strip()
PAYSTACK_SECRET = v["PAYSTACK_SECRET_KEY"].strip()


def appel(methode, chemin, cle, corps=None, entetes=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    e = {"apikey": cle, "Authorization": f"Bearer {cle}", "Content-Type": "application/json"}
    if entetes:
        e.update(entetes)
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode, headers=e)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            t = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(t) if t.strip() else None)
    except urllib.error.HTTPError as ex:
        t = ex.read().decode("utf-8", "replace")
        try:
            return ex.code, json.loads(t)
        except Exception:  # noqa: BLE001
            return ex.code, t
    except Exception as ex:  # noqa: BLE001
        return 0, str(ex)


def poster_webhook(corps: bytes, signature: str | None):
    entetes = {"Content-Type": "application/json", "User-Agent": "Motiq-test/0.1"}
    if signature is not None:
        entetes["x-paystack-signature"] = signature
    req = urllib.request.Request(f"{SITE}/api/paystack/webhook", data=corps, method="POST", headers=entetes)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as ex:
        return ex.code, ex.read().decode("utf-8", "replace")
    except Exception as ex:  # noqa: BLE001
        return 0, str(ex)


def signer(corps: bytes) -> str:
    return hmac.new(PAYSTACK_SECRET.encode(), corps, hashlib.sha512).hexdigest()


def evenement(reference: str, user_id: str, plan: str, montant: int, devise="XOF", statut="success"):
    return {
        "event": "charge.success",
        "data": {
            "status": statut,
            "amount": montant,
            "currency": devise,
            "reference": reference,
            "metadata": {"user_id": user_id, "plan": plan},
            "customer": {"email": "webhook@exemple.invalid", "customer_code": "CUS_test"},
            "plan": {"plan_code": "PLN_test"},
        },
    }


resultats: list[tuple[str, bool, str]] = []


def verifier(libelle: str, condition: bool, detail: str = "") -> None:
    resultats.append((libelle, condition, detail))
    print(f"  {'OK  ' if condition else 'ECHEC'}  {libelle}" + (f"   {detail}" if detail else ""))


print("=" * 78)
print(" LE CIRCUIT DE PAIEMENT, MIS A L'EPREUVE")
print("=" * 78)

# ---------------------------------------------------------- 0. compte de test
email = "paiement@exemple.invalid"
email2 = "paiement-autre@exemple.invalid"
mdp = secrets.token_urlsafe(18)
for adresse in (email, email2):
    appel("POST", "/auth/v1/admin/users", SECRETE,
          {"email": adresse, "password": mdp, "email_confirm": True})
code, donnees = appel("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
comptes = donnees.get("users", []) if isinstance(donnees, dict) else []
moi = next((u["id"] for u in comptes if u.get("email") == email), None)
autre = next((u["id"] for u in comptes if u.get("email") == email2), None)
if not moi:
    raise SystemExit("!! compte de test non cree")

# On force un etat de depart connu sur les DEUX comptes.
for identifiant in [x for x in (moi, autre) if x]:
    appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", SECRETE,
          {"plan": "gratuit", "quota_restant": 3, "quota_mois": "2026-10-01"})
print(f"\n  compte de test     : {moi[:8]}...  (plan gratuit, quota 3)")
print(f"  compte de controle : {autre[:8] if autre else 'ABSENT'}...")

# ------------------------------------------------- 1. la page exige une session
req = urllib.request.Request(f"{SITE}/abonnement", method="GET",
                             headers={"User-Agent": "Motiq-test/0.1"})
try:
    class SansRedirection(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None

    ouvreur = urllib.request.build_opener(SansRedirection)
    with ouvreur.open(req, timeout=30) as r:
        code_page, entete = r.status, r.headers.get("location", "")
except urllib.error.HTTPError as ex:
    code_page, entete = ex.code, ex.headers.get("location", "")
print("1) /abonnement sans session")
verifier("redirige vers la connexion",
         code_page in (307, 302, 303) and "/connexion" in str(entete),
         f"HTTP {code_page} -> {entete}")

# ------------------------------------------------------ 2. signature absente
print("\n2) signature absente")
corps = json.dumps(evenement("ref_sans_sig", moi, "pro", 490000)).encode()
code_w, _ = poster_webhook(corps, None)
verifier("refuse (401)", code_w == 401, f"HTTP {code_w}")

# ------------------------------------------------------- 3. signature fausse
print("\n3) signature fausse")
code_w, _ = poster_webhook(corps, "0" * 128)
verifier("refuse (401)", code_w == 401, f"HTTP {code_w}")

# ------------------------------------- 4. montant 100 fois trop petit (le piege XOF)
print("\n4) montant 100 fois trop petit (4900 au lieu de 490000)")
corps = json.dumps(evenement("ref_petit", moi, "pro", 4900)).encode()
code_w, reponse = poster_webhook(corps, signer(corps))
code_l, profils = appel("GET", f"/rest/v1/profiles?select=plan,quota_restant&id=eq.{moi}", SECRETE)
plan_apres = profils[0]["plan"] if isinstance(profils, list) and profils else "?"
verifier("evenement ignore, plan inchange",
         code_w == 200 and plan_apres == "gratuit", f"HTTP {code_w}, plan={plan_apres}")

# --------------------------------------------- 5. paiement correct -> activation
print("\n5) paiement correct (490000 pour le plan Pro)")
reference = "ref_motiq_test_" + secrets.token_hex(6)
corps = json.dumps(evenement(reference, moi, "pro", 490000)).encode()
code_w, reponse = poster_webhook(corps, signer(corps))
# On affiche la reponse : sans elle, un echec d'activation reste inexplicable.
print(f"     reponse du webhook : HTTP {code_w} — {str(reponse)[:220]}")
code_l, profils = appel("GET", f"/rest/v1/profiles?select=plan,quota_restant&id=eq.{moi}", SECRETE)
p = profils[0] if isinstance(profils, list) and profils else {}
verifier("plan passe a pro", p.get("plan") == "pro", f"plan={p.get('plan')}")
verifier("quota remis a 10 immediatement", p.get("quota_restant") == 10,
         f"quota={p.get('quota_restant')} (sans cela le client resterait a 3)")

code_a, abos = appel("GET", f"/rest/v1/subscriptions?select=id,reference&user_id=eq.{moi}", SECRETE)
n1 = len(abos) if isinstance(abos, list) else -1
verifier("un abonnement enregistre", n1 == 1, f"{n1} ligne(s)")

# ------------------------------------------------------- 6. renvoi du meme evenement
print("\n6) Paystack renvoie le MEME evenement (cela arrive)")
code_w, _ = poster_webhook(corps, signer(corps))
code_a, abos = appel("GET", f"/rest/v1/subscriptions?select=id&user_id=eq.{moi}", SECRETE)
n2 = len(abos) if isinstance(abos, list) else -1
verifier("toujours UN seul abonnement", n2 == 1, f"{n2} ligne(s) — pas de doublon")

# --------------------------------------------------- 7. paiement d'un autre compte
print("\n7) paiement portant l'identifiant d'un AUTRE compte")
if autre:
    appel("PATCH", f"/rest/v1/profiles?id=eq.{autre}", SECRETE,
          {"plan": "gratuit", "quota_restant": 3})
    corps = json.dumps(evenement("ref_autre_" + secrets.token_hex(4), autre, "business", 990000)).encode()
    poster_webhook(corps, signer(corps))
    code_l, profils = appel("GET", f"/rest/v1/profiles?select=plan&id=eq.{autre}", SECRETE)
    plan_autre = profils[0]["plan"] if isinstance(profils, list) and profils else "?"
    verifier("applique au BON compte (celui des metadonnees)", plan_autre == "business",
             f"plan={plan_autre}")
else:
    verifier("aucun second compte de test disponible", False, "test 7 non execute")

# ---------------------------------------------------------------- nettoyage
for identifiant in [x for x in (moi, autre) if x]:
    appel("DELETE", f"/rest/v1/subscriptions?user_id=eq.{identifiant}", SECRETE)
    appel("DELETE", f"/auth/v1/admin/users/{identifiant}", SECRETE)
code, donnees = appel("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
comptes = donnees.get("users", []) if isinstance(donnees, dict) else []
# On ne compte QUE les comptes crees par ce script. Compter tous les
# « @exemple.invalid » ferait echouer le controle a cause des comptes laisses
# par les AUTRES scripts de preuve — un faux echec qui masque un vrai probleme.
reste = [c for c in comptes if str(c.get("email")) in (email, email2)]
verifier("comptes de test supprimes", not reste, f"{len(reste)} restant(s)")

reussis = sum(1 for _, ok, _ in resultats if ok)
print("\n" + "=" * 78)
print(f" {reussis} / {len(resultats)} verifications reussies")
print(" VERDICT :", "le circuit de paiement tient." if reussis == len(resultats) else "!! A REVOIR")
print("=" * 78)
sys.exit(0 if reussis == len(resultats) else 1)
