"""Motiq — preuve du parcours projet de bout en bout, au niveau des donnees.

Ce que ce script etablit :

  1. l'utilisateur ouvre un projet ;
  2. il enregistre un script VALIDE (scenes, 15 a 60 s) -> accepte ;
  3. il tente un script TROP COURT -> refuse ;
  4. il tente un script TROP LONG   -> refuse ;
  5. il tente un script sans scene   -> refuse ;
  6. il choisit un template du catalogue -> accepte ;
  7. un template inexistant est refuse par la cle etrangere ;
  8. il demande un rendu -> une ligne reelle apparait dans render_jobs.

Les points 3 a 5 sont la preuve qui compte : ces scripts sont envoyes par
l'API, en contournant l'interface. S'ils sont refuses, c'est bien la BASE qui
fait respecter la regle — pas l'ecran.
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
COURRIEL = "test-motiq-a@exemple.invalid"


def appeler(methode: str, chemin: str, cle: str, corps=None, jeton: str | None = None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    entetes = {"apikey": cle, "Content-Type": "application/json",
               "Authorization": f"Bearer {jeton or cle}"}
    if methode in ("POST", "PATCH") and donnees is not None:
        entetes["Prefer"] = "return=representation"
    req = urllib.request.Request(f"{BASE}{chemin}", data=donnees, method=methode,
                                 headers=entetes)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, f"{type(e).__name__}: {e}"


def reinitialiser_mot_de_passe() -> str:
    """Le mot de passe est genere ici, jamais affiche, jamais recopie."""
    motdepasse = secrets.token_urlsafe(18)
    code, corps = appeler("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
    for u in json.loads(corps).get("users", []):
        if u.get("email") == COURRIEL:
            appeler("PUT", f"/auth/v1/admin/users/{u['id']}", SECRETE,
                    {"password": motdepasse, "email_confirm": True})
            return motdepasse
    raise SystemExit(f"compte {COURRIEL} introuvable")


motdepasse = reinitialiser_mot_de_passe()
code, corps = appeler("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                      {"email": COURRIEL, "password": motdepasse})
if code != 200:
    raise SystemExit(f"connexion impossible (HTTP {code}) : {corps[:160]}")

donnees = json.loads(corps)
JETON = donnees["access_token"]
ID = donnees["user"]["id"]
print(f"connecte en tant que {COURRIEL} (id {ID})")

print("\n" + "=" * 78)
print(" PARCOURS PROJET — LES REGLES SONT-ELLES VERIFIEES PAR LA BASE ?")
print("=" * 78)


def creer_projet(titre: str) -> str:
    code, corps = appeler("POST", "/rest/v1/projects", PUBLIQUE,
                          {"titre": titre, "entree_source": "texte"}, jeton=JETON)
    if code not in (200, 201):
        raise SystemExit(f"creation impossible : {corps[:200]}")
    return json.loads(corps)[0]["id"]


def ecrire_script(projet_id: str, scenes: list) -> tuple[int, str]:
    total = sum(s["dureeSecondes"] for s in scenes)
    script = {"titre": "Essai", "scenes": scenes, "dureeTotaleSecondes": total}
    return appeler("PATCH", f"/rest/v1/projects?id=eq.{projet_id}", PUBLIQUE,
                   {"script": script}, jeton=JETON)


projet = creer_projet("Parcours automatise")
print(f"\n1) projet cree : {projet}")

print("\n2) SCRIPT VALIDE (3 scenes, 30 s)")
code, corps = ecrire_script(projet, [
    {"ordre": 1, "texte": "Une flotte mal geree coute cher.", "dureeSecondes": 10},
    {"ordre": 2, "texte": "Motiq suit chaque vehicule.", "dureeSecondes": 10},
    {"ordre": 3, "texte": "Essaie gratuitement.", "dureeSecondes": 10},
])
print(f"   HTTP {code}  -> {'ACCEPTE' if code in (200, 201) else 'REFUSE : ' + corps[:130]}")

print("\n3) SCRIPT TROP COURT (2 scenes, 10 s — minimum 15)")
code, corps = ecrire_script(projet, [
    {"ordre": 1, "texte": "Trop court.", "dureeSecondes": 5},
    {"ordre": 2, "texte": "Vraiment.", "dureeSecondes": 5},
])
print(f"   HTTP {code}  -> {'!! ACCEPTE : REGLE CONTOURNEE' if code in (200, 201) else 'REFUSE (correct)'}")
if code not in (200, 201):
    print(f"      message de la base : {json.loads(corps).get('message', corps)[:110]}")

print("\n4) SCRIPT TROP LONG (4 scenes, 80 s — maximum 60)")
code, corps = ecrire_script(projet, [
    {"ordre": i, "texte": f"Scene {i}", "dureeSecondes": 20} for i in range(1, 5)
])
print(f"   HTTP {code}  -> {'!! ACCEPTE : REGLE CONTOURNEE' if code in (200, 201) else 'REFUSE (correct)'}")

print("\n5) SCRIPT SANS SCENE")
code, corps = appeler("PATCH", f"/rest/v1/projects?id=eq.{projet}", PUBLIQUE,
                      {"script": {"titre": "Vide", "scenes": [], "dureeTotaleSecondes": 30}},
                      jeton=JETON)
print(f"   HTTP {code}  -> {'!! ACCEPTE : REGLE CONTOURNEE' if code in (200, 201) else 'REFUSE (correct)'}")

print("\n6) CHOIX D'UN TEMPLATE EXISTANT")
code, corps = appeler("PATCH", f"/rest/v1/projects?id=eq.{projet}", PUBLIQUE,
                      {"template_id": "punch"}, jeton=JETON)
print(f"   HTTP {code}  -> {'ACCEPTE' if code in (200, 201) else 'REFUSE : ' + corps[:130]}")

print("\n7) TEMPLATE INEXISTANT (la cle etrangere doit refuser)")
code, corps = appeler("PATCH", f"/rest/v1/projects?id=eq.{projet}", PUBLIQUE,
                      {"template_id": "template-fantome"}, jeton=JETON)
print(f"   HTTP {code}  -> {'!! ACCEPTE : REFERENCE FANTOME' if code in (200, 201) else 'REFUSE (correct)'}")

print("\n8) DEMANDE DE RENDU")
code, corps = appeler("POST", "/rest/v1/render_jobs", PUBLIQUE,
                      {"projet_id": projet, "statut": "en_attente", "progression": 0},
                      jeton=JETON)
print(f"   HTTP {code}  -> {'enregistre' if code in (200, 201) else 'REFUSE : ' + corps[:130]}")

code, corps = appeler("GET", f"/rest/v1/render_jobs?select=statut,progression&projet_id=eq.{projet}",
                      PUBLIQUE, jeton=JETON)
rendus = json.loads(corps) if corps.strip().startswith("[") else []
print(f"   relu dans la base : {len(rendus)} rendu(s) {rendus}")

print("\n9) ETAT FINAL DU PROJET (relu sous l'identite de l'utilisateur)")
code, corps = appeler("GET", f"/rest/v1/projects?select=titre,statut,template_id,script&id=eq.{projet}",
                      PUBLIQUE, jeton=JETON)
ligne = json.loads(corps)[0]
script = ligne.get("script") or {}
print(f"   titre={ligne['titre']!r} statut={ligne['statut']} template={ligne['template_id']}")
print(f"   script : {len(script.get('scenes', []))} scene(s), "
      f"{script.get('dureeTotaleSecondes')} s")
