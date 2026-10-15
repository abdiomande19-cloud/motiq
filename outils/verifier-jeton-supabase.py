"""Verifie la presence et la forme du jeton Supabase dans .env.local.

N'affiche JAMAIS la valeur : seulement des booleens et une longueur.
"""
import re

CHEMIN = r"C:\Users\Diomande\Motiq\app\.env.local"

try:
    texte = open(CHEMIN, encoding="utf-8", errors="replace").read()
except OSError as exc:
    print("FICHIER_ILLISIBLE:", exc)
    raise SystemExit(1)

m = re.search(r"^SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$", texte, re.M)
brut = m.group(1) if m else ""
propre = brut.strip().strip('"').strip("'")

print("ligne_trouvee      :", bool(m))
print("valeur_presente    :", bool(propre))
print("longueur           :", len(propre))
print("commence_par_sbp_  :", propre.startswith("sbp_"))
print("caracteres_parasites:", bool(propre) and brut != propre)
print("sentinelle_par_defaut:", propre in ("", "REMPLACE-MOI", "sbp_xxxx"))
