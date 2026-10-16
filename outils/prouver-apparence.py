"""Motiq — l'apparence d'un projet est-elle vraiment verrouillee par la base ?

On ecrit DIRECTEMENT par l'API, hors interface. Si les ecritures invalides
passent, la contrainte ne sert a rien.
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


def appeler(methode, chemin, cle, corps=None, jeton=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    entetes = {}
    if cle:
        entetes["apikey"] = cle
        entetes["Authorization"] = f"Bearer {jeton or cle}"
    if donnees is not None:
        entetes["Content-Type"] = "application/json"
        if methode in ("POST", "PATCH"):
            entetes["Prefer"] = "return=representation"
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode,
                                 headers=entetes)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


# --- session d'un compte de test -------------------------------------------
mdp = secrets.token_urlsafe(18)
code, corps = appeler("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
identifiant = None
for u in json.loads(corps).get("users", []):
    if u.get("email") == "test-motiq-a@exemple.invalid":
        identifiant = u["id"]
        appeler("PUT", f"/auth/v1/admin/users/{identifiant}", SECRETE,
                {"password": mdp, "email_confirm": True})

code, corps = appeler("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                      {"email": "test-motiq-a@exemple.invalid", "password": mdp})
JETON = json.loads(corps)["access_token"]

# --- un projet a modifier ---------------------------------------------------
code, corps = appeler("GET", "/rest/v1/projects?select=id&limit=1", PUBLIQUE, jeton=JETON)
projets = json.loads(corps)
if not projets:
    code, corps = appeler("POST", "/rest/v1/projects", PUBLIQUE,
                          {"titre": "Essai apparence", "entree_source": "texte"}, jeton=JETON)
    projet = json.loads(corps)[0]["id"]
else:
    projet = projets[0]["id"]
print(f"projet utilise : {projet}")

print("=" * 78)
print(" APPARENCE — LA BASE REFUSE-T-ELLE LES VALEURS INVALIDES ?")
print("=" * 78)


def essayer(libelle: str, apparence, attendu: str) -> None:
    code, corps = appeler("PATCH", f"/rest/v1/projects?id=eq.{projet}", PUBLIQUE,
                          {"apparence": apparence}, jeton=JETON)
    accepte = code in (200, 201)
    verdict = "ACCEPTE" if accepte else "REFUSE"
    correct = (verdict == attendu)
    print(f"  {libelle:<44} {verdict:9} {'ok' if correct else '!! INATTENDU'}")
    if not accepte and "message" in corps:
        print(f"      {json.loads(corps).get('message', '')[:100]}")


essayer("couleur au mauvais format (#12345)",
        {"couleurs": ["#12345", "#ff7a59"], "police": "Inter"}, "REFUSE")
essayer("couleur en texte libre (rouge)",
        {"couleurs": ["rouge", "#ff7a59"], "police": "Inter"}, "REFUSE")
essayer("une seule couleur (minimum 2)",
        {"couleurs": ["#22d3c5"], "police": "Inter"}, "REFUSE")
essayer("quatre couleurs (maximum 3)",
        {"couleurs": ["#22d3c5", "#ff7a59", "#e8eef6", "#000000"], "police": "Inter"}, "REFUSE")
essayer("police vide",
        {"couleurs": ["#22d3c5", "#ff7a59"], "police": ""}, "REFUSE")
essayer("couleurs absentes",
        {"police": "Inter"}, "REFUSE")
essayer("police numerique",
        {"couleurs": ["#22d3c5", "#ff7a59"], "police": 42}, "REFUSE")
essayer("apparence complete et valide",
        {"couleurs": ["#22d3c5", "#ff7a59"], "police": "Poppins", "musique": None}, "ACCEPTE")
essayer("avec trois couleurs et une musique",
        {"couleurs": ["#22d3c5", "#ff7a59", "#0b0f14"], "police": "Bebas Neue",
         "musique": f"{identifiant}/musique/piste.mp3"}, "ACCEPTE")

print("\n--- etat final relu ---")
code, corps = appeler("GET", f"/rest/v1/projects?select=apparence&id=eq.{projet}", PUBLIQUE,
                      jeton=JETON)
print(" ", corps[:220])
