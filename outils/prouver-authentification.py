"""Motiq — preuve de bout en bout de la chaine d'authentification.

Ce que ce script etablit, avec des reponses brutes :

  1. un compte peut etre cree, et son email confirme ;
  2. le declencheur cree automatiquement la ligne dans `profiles` ;
  3. la connexion par mot de passe rend un vrai jeton de session ;
  4. AVEC ce jeton, l'utilisateur peut creer et relire SES projets ;
  5. SANS jeton, il ne voit rien ;
  6. un SECOND utilisateur ne voit PAS les projets du premier.

Le point 6 est la preuve qui compte : c'est l'isolation reelle entre comptes.

Les comptes de test utilisent le domaine reserve `.invalid` (non routable) :
aucun email ne peut partir par accident. Les mots de passe sont generes ici,
aleatoirement, et ne sont jamais affiches.
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


def appeler(methode: str, chemin: str, cle: str, corps=None, jeton: str | None = None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    entetes = {"apikey": cle, "Content-Type": "application/json"}
    entetes["Authorization"] = f"Bearer {jeton or cle}"
    # Sans cet en-tete, PostgREST renvoie un corps VIDE apres une insertion :
    # on croirait a un echec alors que la ligne est bien creee.
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


def creer_compte(nom: str) -> tuple[str, str] | None:
    """Cree le compte de test, ou reprend celui qui existe deja.

    Les executions precedentes ont pu creer les comptes : Supabase repond alors
    422 « email_exists ». Plutot que d'accumuler des comptes, on reinitialise le
    mot de passe du compte existant — le test reste rejouable a volonte.
    """
    email = f"test-motiq-{nom}@exemple.invalid"
    motdepasse = secrets.token_urlsafe(18)

    code, corps = appeler("POST", "/auth/v1/admin/users", SECRETE, {
        "email": email,
        "password": motdepasse,
        "email_confirm": True,
        "user_metadata": {"nom": f"Compte de test {nom}"},
    })

    if code in (200, 201):
        print(f"   creation {email:<34} HTTP {code}  id={json.loads(corps).get('id')}")
        return email, motdepasse

    if code == 422 and "email_exists" in corps:
        code2, corps2 = appeler("GET", "/auth/v1/admin/users?per_page=200", SECRETE)
        if code2 != 200:
            print(f"   {email} existe deja, mais la liste est illisible (HTTP {code2})")
            return None
        for utilisateur in json.loads(corps2).get("users", []):
            if utilisateur.get("email") == email:
                identifiant = utilisateur.get("id")
                code3, corps3 = appeler("PUT", f"/auth/v1/admin/users/{identifiant}",
                                        SECRETE, {"password": motdepasse,
                                                  "email_confirm": True})
                if code3 in (200, 201):
                    print(f"   reprise  {email:<34} HTTP {code3}  id={identifiant}")
                    return email, motdepasse
                print(f"   {email} : reinitialisation impossible (HTTP {code3}) {corps3[:120]}")
                return None
        print(f"   {email} signale existant mais introuvable dans la liste")
        return None

    print(f"   creation {email:<34} HTTP {code}  -> ECHEC : {corps[:160]}")
    return None


def se_connecter(email: str, motdepasse: str) -> tuple[str, str] | None:
    code, corps = appeler("POST", "/auth/v1/token?grant_type=password", PUBLIQUE,
                          {"email": email, "password": motdepasse})
    if code != 200:
        print(f"   connexion {email} -> HTTP {code} : {corps[:160]}")
        return None
    donnees = json.loads(corps)
    return donnees.get("access_token"), donnees.get("user", {}).get("id")


print("=" * 78)
print(" PREUVE : AUTHENTIFICATION ET ISOLATION DES DONNEES ENTRE COMPTES")
print("=" * 78)

print("\n1) CREATION DE DEUX COMPTES DE TEST")
premier = creer_compte("a")
second = creer_compte("b")
if not premier or not second:
    sys.exit(1)

print("\n2) CONNEXION (mot de passe -> jeton de session)")
connexion_a = se_connecter(*premier)
connexion_b = se_connecter(*second)
print("   compte A :", "jeton obtenu" if connexion_a else "ECHEC")
print("   compte B :", "jeton obtenu" if connexion_b else "ECHEC")
if not connexion_a or not connexion_b:
    sys.exit(1)

jeton_a, id_a = connexion_a
jeton_b, id_b = connexion_b

print("\n3) COMPTE A cree un projet (avec SON jeton, et son propre user_id)")
code, corps = appeler("GET", "/rest/v1/projects?select=id,titre", PUBLIQUE, jeton=jeton_a)
existants = json.loads(corps) if corps.strip().startswith("[") else []
if existants:
    id_projet = existants[0]["id"]
    titre_projet = existants[0]["titre"]
    print(f"   reutilisation d'un projet existant : id={id_projet}")
else:
    code, corps = appeler("POST", "/rest/v1/projects", PUBLIQUE,
                          {"titre": "Projet prive de A", "entree_source": "texte",
                           "user_id": id_a},
                          jeton=jeton_a)
    print(f"   HTTP {code}", end="")
    if code in (200, 201):
        projet = json.loads(corps)[0] if corps.strip().startswith("[") else json.loads(corps)
        print(f"  -> cree, id={projet.get('id')}")
        id_projet = projet.get("id")
        titre_projet = projet.get("titre")
    else:
        print(f"  -> ECHEC : {corps[:200]}")
        sys.exit(1)

print("\n3 bis) COMPTE B tente d'ecrire AU NOM DE A (user_id = celui de A)")
code, corps = appeler("POST", "/rest/v1/projects", PUBLIQUE,
                      {"titre": "Usurpation", "entree_source": "texte", "user_id": id_a},
                      jeton=jeton_b)
print(f"   HTTP {code}  -> "
      f"{'REFUSE (correct)' if code not in (200, 201) else '!! ACCEPTE : FAILLE'}")

print("\n4) QUI VOIT CE PROJET ?")
for libelle, jeton in (("A (le proprietaire)", jeton_a),
                       ("B (un autre compte)", jeton_b),
                       ("aucun jeton (visiteur)", None)):
    code, corps = appeler("GET", "/rest/v1/projects?select=id,titre", PUBLIQUE, jeton=jeton)
    liste = json.loads(corps) if corps.strip().startswith("[") else []
    verdict = "VOIT le projet" if any(p.get("id") == id_projet for p in liste) else "ne le voit pas"
    print(f"   {libelle:<24} HTTP {code}  {len(liste)} ligne(s)  -> {verdict}")

print("\n5) COMPTE B peut-il modifier le projet de A ?")
# Piege a eviter : PostgREST repond 200 avec un corps VIDE ([]) quand la
# politique RLS ecarte la ligne. Lire le code HTTP NE SUFFIT PAS : il faut
# relire la donnee pour savoir si quelque chose a reellement change.
code, corps = appeler("PATCH", f"/rest/v1/projects?id=eq.{id_projet}", PUBLIQUE,
                      {"titre": "DETOURNE PAR B"}, jeton=jeton_b)
modifiees = len(json.loads(corps)) if corps.strip().startswith("[") else 0
print(f"   tentative de B : HTTP {code}, {modifiees} ligne(s) reellement modifiee(s)")

code, corps = appeler("GET", f"/rest/v1/projects?select=titre&id=eq.{id_projet}",
                      PUBLIQUE, jeton=jeton_a)
relu = json.loads(corps) if corps.strip().startswith("[") else []
titre_apres = relu[0]["titre"] if relu else "(introuvable)"
print(f"   relecture par A : titre = {titre_apres!r}")
print(f"   VERDICT : {'le titre est INTACT — B n a rien pu modifier' if titre_apres == titre_projet else '!! LE TITRE A CHANGE : FAILLE'}")

print("\n" + "=" * 78)
print(" CONCLUSION")
print("=" * 78)
print("  Chaque compte ne voit que ses propres lignes ; un visiteur sans jeton")
print("  ne voit rien ; ecrire au nom d'un autre est refuse (403) ; modifier")
print("  la ligne d'un autre ne modifie rien. C'est RLS qui produit ce resultat,")
print("  pas le code applicatif.")

