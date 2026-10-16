"""Motiq — les avis, la moderation et les compteurs tiennent-ils ?

CE QUI EST VERIFIE, ET POURQUOI CHAQUE POINT COMPTE

  1. un VISITEUR NON CONNECTE lit les avis et les chiffres ;
  2. un utilisateur publie UN avis ;
  3. il ne peut pas en publier un SECOND (c'est la premiere defense contre
     les faux avis : sans elle, cinquante avis a une etoile font tomber la
     moyenne) ;
  4. une note hors bornes est refusee par la BASE, pas seulement par l'ecran ;
  5. un commentaire trop court est refuse ;
  6. les chiffres PUBLICS bougent apres publication (ils sont donc bien lus,
     pas codes en dur) ;
  7. un utilisateur ordinaire NE PEUT PAS masquer un avis ;
  8. un moderateur le peut, et l'avis disparait alors de la liste publique ;
  9. le moderateur peut le REMETTRE en ligne (une moderation irreversible est
     une censure) ;
 10. l'auteur peut supprimer son avis ;
 11. le nom affiche est ABREGE — jamais l'email.

Le compte de test est supprime a la fin.
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
BASE = v["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SECRETE = v["SUPABASE_SECRET_KEY"].strip()
PUBLIQUE = v["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].strip()

resultats: list[tuple[str, bool, str]] = []


def verifier(libelle: str, condition: bool, detail: str = "") -> None:
    resultats.append((libelle, condition, detail))
    print(f"  {'OK  ' if condition else 'ECHEC'}  {libelle}" + (f"   {detail}" if detail else ""))


def requete(methode, chemin, cle, corps=None, jeton=None, entetes=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    e = {"apikey": cle, "Authorization": f"Bearer {jeton or cle}", "Content-Type": "application/json"}
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


print("=" * 78)
print(" AVIS, MODERATION ET COMPTEURS")
print("=" * 78)

# ------------------------------------------------------------- 1. visiteur
print("\n1) CE QUE VOIT UN VISITEUR NON CONNECTE")
code, chiffres = requete("POST", "/rest/v1/rpc/statistiques_publiques", PUBLIQUE, {})
ok = code == 200 and isinstance(chiffres, dict)
verifier("les chiffres sont lisibles sans compte", ok, f"HTTP {code}")
if ok:
    print(f"     {json.dumps(chiffres, ensure_ascii=False)}")
    verifier(
        "aucun champ personnel dans la reponse",
        not any(k in json.dumps(chiffres) for k in ("email", "user_id", "nom")),
    )

code, liste = requete("POST", "/rest/v1/rpc/avis_publies", PUBLIQUE, {"p_limite": 20})
verifier("la liste des avis est lisible sans compte", code == 200, f"HTTP {code}")

avant = chiffres if ok else {"avis": 0}

# ------------------------------------------------------- 2. compte de test
email = "avis-test@exemple.invalid"
mdp = secrets.token_urlsafe(18)
requete("POST", "/auth/v1/admin/users", SECRETE,
        {"email": email, "password": mdp, "email_confirm": True,
         "user_metadata": {"nom": "Awa Diallo"}})
code, donnees = requete("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
comptes = donnees.get("users", []) if isinstance(donnees, dict) else []
moi = next((u["id"] for u in comptes if u.get("email") == email), None)
if not moi:
    raise SystemExit("!! compte de test non cree")

# Le nom sert a verifier l'abreviation.
requete("PATCH", f"/rest/v1/profiles?id=eq.{moi}", SECRETE, {"nom": "Awa Diallo", "est_moderateur": False})

code, jeton = requete("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                      {"email": email, "password": mdp})
JETON = jeton.get("access_token") if isinstance(jeton, dict) else None
if not JETON:
    raise SystemExit("!! jeton non obtenu")
print(f"\n  compte de test : {moi[:8]}... (nom : Awa Diallo)\n")

# ------------------------------------------------------------ 3. publication
print("2) PUBLICATION D'UN AVIS")
code, avis = requete("POST", "/rest/v1/reviews", PUBLIQUE,
                     {"user_id": moi, "note": 5, "commentaire": "Interface claire, la prise en main a ete immediate."},
                     jeton=JETON, entetes={"Prefer": "return=representation"})
cree = code in (200, 201) and isinstance(avis, list) and avis
verifier("l'avis est cree", bool(cree), f"HTTP {code}")

code, relu = requete("GET", f"/rest/v1/reviews?select=id,note,commentaire,statut&user_id=eq.{moi}",
                     PUBLIQUE, jeton=JETON)
existe = isinstance(relu, list) and len(relu) == 1
verifier("relu en base (un POST peut rendre un corps vide)", existe,
         f"{len(relu) if isinstance(relu, list) else '?'} ligne")
avis_id = relu[0]["id"] if existe else None

# ------------------------------------------------------------- 4. anti-spam
print("\n3) ANTI-SPAM — la base refuse, pas seulement l'ecran")
code, _ = requete("POST", "/rest/v1/reviews", PUBLIQUE,
                  {"user_id": moi, "note": 1, "commentaire": "Un deuxieme avis pour faire baisser la note."},
                  jeton=JETON)
verifier("un SECOND avis est refuse", code not in (200, 201), f"HTTP {code} (attendu 409)")

code, _ = requete("POST", "/rest/v1/reviews", PUBLIQUE,
                  {"user_id": moi, "note": 9, "commentaire": "Note impossible mais commentaire assez long."},
                  jeton=JETON)
verifier("une note de 9 est refusee", code not in (200, 201), f"HTTP {code}")

code, _ = requete("POST", "/rest/v1/reviews", PUBLIQUE,
                  {"user_id": moi, "note": 3, "commentaire": "ok"},
                  jeton=JETON)
verifier("un commentaire de 2 caracteres est refuse", code not in (200, 201), f"HTTP {code}")

# ------------------------------------------- 5. ecrire au nom d'un autre
code, _ = requete("POST", "/rest/v1/reviews", PUBLIQUE,
                  {"user_id": "00000000-0000-0000-0000-000000000000", "note": 5,
                   "commentaire": "Avis signe par quelqu'un d'autre, ce serait grave."},
                  jeton=JETON)
verifier("ecrire au nom d'un AUTRE est refuse", code not in (200, 201), f"HTTP {code}")

# -------------------------------------------------- 6. les chiffres bougent
print("\n4) LES COMPTEURS SUIVENT LA BASE")
code, apres = requete("POST", "/rest/v1/rpc/statistiques_publiques", PUBLIQUE, {})
bouge = isinstance(apres, dict) and apres.get("avis", 0) == avant.get("avis", 0) + 1
verifier("le nombre d'avis a augmente de 1", bouge,
         f"avant {avant.get('avis')} -> apres {apres.get('avis') if isinstance(apres, dict) else '?'}")
moyenne_ok = isinstance(apres, dict) and apres.get("note_moyenne") == 5.0
verifier("la note moyenne est de 5.0", moyenne_ok, f"note={apres.get('note_moyenne') if isinstance(apres, dict) else '?'}")

# ------------------------------------------------- 7. nom abrege en public
print("\n5) CE QUE LE PUBLIC VOIT DU NOM")
code, publies = requete("POST", "/rest/v1/rpc/avis_publies", PUBLIQUE, {"p_limite": 20})
miens = [a for a in publies if str(a.get("commentaire", "")).startswith("Interface claire")] if isinstance(publies, list) else []
verifier("l'avis apparait dans la liste publique", len(miens) == 1)
if miens:
    auteur = miens[0].get("auteur")
    verifier("le nom est ABREGE", auteur == "Awa D.", f"affiche : {auteur!r} (attendu 'Awa D.')")
    verifier("aucun email dans la reponse publique", "@" not in json.dumps(miens[0]))

# --------------------------------------------------------- 8. moderation
print("\n6) MODERATION")
code, _ = requete("PATCH", f"/rest/v1/reviews?id=eq.{avis_id}", PUBLIQUE,
                  {"statut": "masque", "motif_masquage": "tentative sans droit"}, jeton=JETON,
                  entetes={"Prefer": "return=representation"})
code, controle = requete("GET", f"/rest/v1/reviews?select=statut&id=eq.{avis_id}", PUBLIQUE, jeton=JETON)
statut = controle[0]["statut"] if isinstance(controle, list) and controle else "?"
verifier("un utilisateur ordinaire NE PEUT PAS masquer", statut != "masque", f"statut={statut}")

# On lui donne le role, puis on masque.
requete("PATCH", f"/rest/v1/profiles?id=eq.{moi}", SECRETE, {"est_moderateur": True})
code, _ = requete("PATCH", f"/rest/v1/reviews?id=eq.{avis_id}", PUBLIQUE,
                  {"statut": "masque", "motif_masquage": "propos hors sujet"}, jeton=JETON,
                  entetes={"Prefer": "return=representation"})
code, controle = requete("GET", f"/rest/v1/reviews?select=statut&id=eq.{avis_id}", PUBLIQUE, jeton=JETON)
statut = controle[0]["statut"] if isinstance(controle, list) and controle else "?"
verifier("un MODERATEUR peut masquer", statut == "masque", f"statut={statut}")

code, publies = requete("POST", "/rest/v1/rpc/avis_publies", PUBLIQUE, {"p_limite": 20})
encore_visible = any(
    str(a.get("commentaire", "")).startswith("Interface claire") for a in (publies or [])
)
verifier("l'avis masque DISPARAIT du public", not encore_visible)

code, sieurs = requete("POST", "/rest/v1/rpc/mon_avis", PUBLIQUE, {}, jeton=JETON)
sien = sieurs[0] if isinstance(sieurs, list) and sieurs else {}
verifier("son auteur le voit encore, avec le motif",
         sien.get("statut") == "masque" and bool(sien.get("motif_masquage")),
         f"statut={sien.get('statut')} motif={sien.get('motif_masquage')!r}")

code, _ = requete("PATCH", f"/rest/v1/reviews?id=eq.{avis_id}", PUBLIQUE,
                  {"statut": "publie", "motif_masquage": None}, jeton=JETON,
                  entetes={"Prefer": "return=representation"})
code, publies = requete("POST", "/rest/v1/rpc/avis_publies", PUBLIQUE, {"p_limite": 20})
revenu = any(str(a.get("commentaire", "")).startswith("Interface claire") for a in (publies or []))
verifier("il peut etre REMIS en ligne", revenu)

# ----------------------------------------------------------- 9. suppression
print("\n7) SUPPRESSION PAR SON AUTEUR")
code, supprimes = requete("DELETE", f"/rest/v1/reviews?id=eq.{avis_id}", PUBLIQUE, jeton=JETON,
                          entetes={"Prefer": "return=representation"})
code, restants = requete("GET", f"/rest/v1/reviews?select=id&user_id=eq.{moi}", PUBLIQUE, jeton=JETON)
verifier("l'avis est supprime", isinstance(restants, list) and len(restants) == 0,
         f"{len(restants) if isinstance(restants, list) else '?'} restant")

code, final = requete("POST", "/rest/v1/rpc/statistiques_publiques", PUBLIQUE, {})
verifier("le compteur est revenu a son niveau initial",
         isinstance(final, dict) and final.get("avis") == avant.get("avis"),
         f"avis={final.get('avis') if isinstance(final, dict) else '?'}")

# ---------------------------------------------------------------- nettoyage
requete("DELETE", f"/auth/v1/admin/users/{moi}", SECRETE)
code, donnees = requete("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
comptes = donnees.get("users", []) if isinstance(donnees, dict) else []
reste = [c for c in comptes if c.get("email") == email]
verifier("compte de test supprime", not reste)

reussis = sum(1 for _, ok, _ in resultats if ok)
print("\n" + "=" * 78)
print(f" {reussis} / {len(resultats)} verifications reussies")
print(" VERDICT :", "les avis tiennent." if reussis == len(resultats) else "!! A REVOIR")
print("=" * 78)
sys.exit(0 if reussis == len(resultats) else 1)
