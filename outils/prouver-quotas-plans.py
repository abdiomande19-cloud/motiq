"""Motiq — le quota depend-il vraiment du plan ?

Le risque concret : le plan Pro paie pour 10 rendus mais reste bloque a 3
parce qu'un « 3 » traine en dur quelque part. Ce script relie les deux bouts :

  1. il LIT les quotas dans lib/tarifs.ts — le fichier qui fait foi ;
  2. il fait renouveler le quota en base pour chaque plan ;
  3. il compare ce que la base rend a ce que le fichier annonce.

Si les deux divergent, le script echoue. Il verifie aussi qu'aucun ecran
n'ecrit plus un quota en dur.

Le compte de test est SUPPRIME a la fin.
"""

from __future__ import annotations

import json
import re
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

RACINE = Path(r"C:\Users\Diomande\Motiq")
TARIFS_TS = RACINE / "app" / "lib" / "tarifs.ts"

v = lire_env(str(RACINE / "app" / ".env.local"))
BASE = v.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SECRETE = v.get("SUPABASE_SECRET_KEY", "")
PUBLIQUE = v.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")


def appel(methode, chemin, cle, corps=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    e = {"apikey": cle, "Authorization": f"Bearer {cle}", "Content-Type": "application/json"}
    if methode in ("POST", "PATCH"):
        e["Prefer"] = "return=representation"
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode, headers=e)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            texte = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(texte) if texte.strip() else None)
    except urllib.error.HTTPError as ex:
        return ex.code, ex.read().decode("utf-8", "replace")
    except Exception as ex:  # noqa: BLE001
        return 0, str(ex)


def ligne_de(corps):
    """Une reponse PostgREST peut etre un objet, une liste, ou du texte d'erreur.

    Les trois cas arrivent reellement : un RPC rend un objet, une lecture rend
    une liste, et une erreur rend une chaine. Les supposer identiques faisait
    planter le script au lieu de signaler le probleme.
    """
    if isinstance(corps, list):
        return corps[0] if corps else {}
    if isinstance(corps, dict):
        return corps
    return {}


# ---------------------------------------------------- 1. lire la source des tarifs
source = TARIFS_TS.read_text(encoding="utf-8")
attendus: dict[str, int] = {}
for plan in ("gratuit", "pro", "business"):
    m = re.search(rf"{plan}:\s*\{{\s*plan:\s*'{plan}'.*?quotaMensuel:\s*(\d+)", source, re.S)
    if not m:
        raise SystemExit(f"!! quotaMensuel introuvable pour « {plan} » dans lib/tarifs.ts")
    attendus[plan] = int(m.group(1))

prix_attendus: dict[str, int] = {}
for plan in ("gratuit", "pro", "business"):
    m = re.search(rf"{plan}:\s*\{{\s*plan:\s*'{plan}'.*?prix:\s*(\d+)", source, re.S)
    prix_attendus[plan] = int(m.group(1)) if m else -1

print("=" * 78)
print(" LE QUOTA DEPEND-IL DU PLAN ?")
print("=" * 78)
print("\n1) LU DANS lib/tarifs.ts (la source qui fait foi)")
for plan, quota in attendus.items():
    print(f"     {plan:<10} prix {prix_attendus[plan]:>5} F CFA   quota {quota:>3} / mois")

# -------------------------------------------- 2. le domaine ne code rien en dur
print("\n2) AUCUN QUOTA ECRIT EN DUR DANS LE DOMAINE")
suspects = []
for f in list((RACINE / "app" / "app").rglob("*.tsx")) + list((RACINE / "app" / "app").rglob("*.ts")):
    if "node_modules" in str(f):
        continue
    for i, ligne in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if re.search(r"quotaRestant:\s*\d+", ligne):
            suspects.append(f"{f.relative_to(RACINE)}:{i}  {ligne.strip()[:70]}")
for s in suspects:
    print(f"     !! {s}")
print(f"     {'AUCUN (correct)' if not suspects else str(len(suspects)) + ' a corriger'}")

# ------------------------------------------------- 3. et en base, sur un vrai compte
email = "quota-plans@exemple.invalid"
mdp = secrets.token_urlsafe(18)
code, _ = appel("POST", "/auth/v1/admin/users", SECRETE,
                {"email": email, "password": mdp, "email_confirm": True})
code, donnees = appel("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
comptes = donnees.get("users", []) if isinstance(donnees, dict) else []
identifiant = next((u["id"] for u in comptes if u.get("email") == email), None)
if not identifiant:
    raise SystemExit("!! compte de test non cree")
appel("POST", "/auth/v1/token?grant_type=password", PUBLIQUE, {"email": email, "password": mdp})

print("\n3) RENOUVELLEMENT EN BASE, PLAN PAR PLAN")
print(f"     {'plan':<10} {'attendu':>8} {'obtenu':>8}   verdict")
print("     " + "-" * 44)
ok = True
for plan, quota in attendus.items():
    appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", SECRETE,
          {"plan": plan, "quota_restant": 0, "quota_mois": "2026-01-01"})
    code, corps = appel("POST", "/rest/v1/rpc/assurer_quota_du_mois", SECRETE,
                        {"p_user_id": identifiant, "p_quota_par_defaut": quota})
    obtenu = ligne_de(corps).get("quota_restant", f"HTTP {code}") if code in (200, 201) else f"HTTP {code}"
    bon = obtenu == quota
    ok = ok and bon
    print(f"     {plan:<10} {quota:>8} {str(obtenu):>8}   {'OK' if bon else '!! ECART'}")

# ---------------------------------------- 4. un plan ne donne pas le quota d'un autre
print("\n4) UN PLAN GRATUIT NE RECOIT PAS LE QUOTA D'UN PLAN PAYANT")
appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", SECRETE,
      {"plan": "gratuit", "quota_restant": 0, "quota_mois": "2026-01-01"})
code, corps = appel("POST", "/rest/v1/rpc/assurer_quota_du_mois", SECRETE,
                    {"p_user_id": identifiant, "p_quota_par_defaut": attendus["gratuit"]})
ligne = ligne_de(corps)
gratuit_ok = ligne.get("quota_restant") == attendus["gratuit"]
print(f"     gratuit -> {ligne.get('quota_restant')} (attendu {attendus['gratuit']})  "
      f"{'OK' if gratuit_ok else '!! ECART'}")
ok = ok and gratuit_ok

# --------------------------------------------------------- nettoyage
appel("DELETE", f"/auth/v1/admin/users/{identifiant}", SECRETE)
code, donnees = appel("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
comptes = donnees.get("users", []) if isinstance(donnees, dict) else []
reste = any(u.get("email") == email for u in comptes)
print(f"\n     compte de test supprime : {'oui' if not reste else '!! NON'}")

print("\n" + "=" * 78)
verdict = ok and not suspects and not reste
print(" VERDICT :", "les quotas suivent le plan, depuis la source unique."
      if verdict else "!! A REVOIR")
print("=" * 78)
sys.exit(0 if verdict else 1)
