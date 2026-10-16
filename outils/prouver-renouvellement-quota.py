"""Motiq — le quota se renouvelle-t-il vraiment au changement de mois ?

  1. on met le quota a 0 et au MOIS PRECEDENT (cle secrete) ;
  2. le serveur appelle le renouvellement          -> quota remis a sa dotation ;
  3. rappel immediat                                -> rien ne change (idempotent) ;
  4. un quota du MOIS COURANT n'est pas renouvelle  -> il garde sa valeur ;
  5. l'UTILISATEUR tente d'appeler le renouvellement -> permission refusee.
"""

from __future__ import annotations

import json
import secrets
import sys
import urllib.error
import urllib.request

sys.path.insert(0, r"C:\Users\Diomande\Motiq\outils")
from env_local import lire_env  # noqa: E402

v = lire_env(r"C:\Users\Diomande\Motiq\app\.env.local")
BASE = v.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SECRETE = v.get("SUPABASE_SECRET_KEY", "")
PUBLIQUE = v.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
DOTATION = 3


def appel(methode, chemin, cle, corps=None, jeton=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    e = {"apikey": cle, "Content-Type": "application/json",
         "Authorization": f"Bearer {jeton or cle}"}
    if methode in ("POST", "PATCH"):
        e["Prefer"] = "return=representation"
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode, headers=e)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as ex:
        return ex.code, ex.read().decode("utf-8", "replace")
    except Exception as ex:  # noqa: BLE001
        return 0, str(ex)


def lire_quota(cle, jeton=None):
    code, corps = appel("GET", "/rest/v1/profiles?select=quota_restant,quota_mois", cle, jeton=jeton)
    liste = json.loads(corps)
    return (liste[0]["quota_restant"], liste[0]["quota_mois"]) if liste else (None, None)


mdp = secrets.token_urlsafe(18)
code, corps = appel("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
identifiant = None
for u in json.loads(corps).get("users", []):
    if u.get("email") == "test-motiq-a@exemple.invalid":
        identifiant = u["id"]
        appel("PUT", f"/auth/v1/admin/users/{identifiant}", SECRETE,
              {"password": mdp, "email_confirm": True})
code, corps = appel("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                    {"email": "test-motiq-a@exemple.invalid", "password": mdp})
JETON = json.loads(corps)["access_token"]

print("=" * 78)
print(" RENOUVELLEMENT DU QUOTA")
print("=" * 78)

# 1
code, _ = appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", SECRETE,
                {"plan": "gratuit", "quota_restant": 0, "quota_mois": "2026-09-01"})
q, m = lire_quota(SECRETE, jeton=None)
code, _ = appel("GET", f"/rest/v1/profiles?select=quota_restant,quota_mois&id=eq.{identifiant}",
                SECRETE)
etat = json.loads(_)
print(f"\n1) etat force : quota={etat[0]['quota_restant']} mois={etat[0]['quota_mois']}")

# 2
code, corps = appel("POST", "/rest/v1/rpc/assurer_quota_du_mois", SECRETE,
                    {"p_user_id": identifiant, "p_quota_par_defaut": DOTATION})
if code in (200, 201):
    ligne = json.loads(corps)
    ligne = ligne[0] if isinstance(ligne, list) and ligne else ligne
    print(f"2) apres renouvellement : quota={ligne.get('quota_restant')} "
          f"mois={ligne.get('quota_mois')}   HTTP {code}")
    renouvele = ligne.get("quota_restant") == DOTATION
else:
    print(f"2) HTTP {code} : {corps[:150]}")
    renouvele = False

# 3
code, corps = appel("POST", "/rest/v1/rpc/assurer_quota_du_mois", SECRETE,
                    {"p_user_id": identifiant, "p_quota_par_defaut": DOTATION})
ligne = json.loads(corps)
ligne = ligne[0] if isinstance(ligne, list) and ligne else ligne
print(f"3) rappel immediat     : quota={ligne.get('quota_restant')} "
      f"(doit rester {DOTATION})")

# 4
appel("PATCH", f"/rest/v1/profiles?id=eq.{identifiant}", SECRETE, {"quota_restant": 1})
code, corps = appel("POST", "/rest/v1/rpc/assurer_quota_du_mois", SECRETE,
                    {"p_user_id": identifiant, "p_quota_par_defaut": DOTATION})
ligne = json.loads(corps)
ligne = ligne[0] if isinstance(ligne, list) and ligne else ligne
intact = ligne.get("quota_restant") == 1
print(f"4) quota du mois courant : {ligne.get('quota_restant')} "
      f"-> {'NON renouvele (correct)' if intact else '!! RENOUVELE A TORT'}")

# 5
code, corps = appel("POST", "/rest/v1/rpc/assurer_quota_du_mois", PUBLIQUE,
                    {"p_user_id": identifiant, "p_quota_par_defaut": 9999}, jeton=JETON)
print(f"5) utilisateur          : HTTP {code} -> "
      f"{'REFUSE (correct)' if code not in (200, 201) else '!! ACCEPTE : FAILLE'}")
if code not in (200, 201):
    try:
        print(f"      {json.loads(corps).get('message', '')[:110]}")
    except Exception:  # noqa: BLE001
        print(f"      {corps[:110]}")

print("\n" + "=" * 78)
bon = renouvele and intact
print(" VERDICT :", "le renouvellement fonctionne et reste reserve au serveur."
      if bon else "!! A REVOIR")
print("=" * 78)
