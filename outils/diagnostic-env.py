"""Diagnostic du fichier .env.local — structure seulement, JAMAIS la valeur.

Objectif : comprendre pourquoi la ligne du jeton est lue differemment par
Python et par grep, et verifier que la valeur colle au format attendu.
"""
import re

CHEMIN = r"C:\Users\Diomande\Motiq\app\.env.local"

brut = open(CHEMIN, "rb").read()
print("taille fichier      :", len(brut), "octets")
print("BOM UTF-8 present   :", brut.startswith(b"\xef\xbb\xbf"))
print("semble UTF-16       :", brut[:2] in (b"\xff\xfe", b"\xfe\xff"))
print("contient CR (0x0D)  :", b"\r" in brut)

texte = brut.decode("utf-8", errors="replace")
lignes = texte.splitlines()
print("nombre de lignes    :", len(lignes))

# Toutes les lignes qui mentionnent le jeton
print("\n--- lignes concernant SUPABASE_ACCESS_TOKEN ---")
for i, ligne in enumerate(lignes, 1):
    if "SUPABASE_ACCESS_TOKEN" in ligne:
        # On masque la valeur : on ne garde que sa FORME
        m = re.match(r"^(\s*#?\s*SUPABASE_ACCESS_TOKEN\s*=\s*)(.*)$", ligne)
        if m:
            val = m.group(2)
            forme = re.sub(r"[A-Za-z0-9]", "x", val)
            print(f"  ligne {i} : prefixe={m.group(1)!r} valeur_masquee={forme!r}")
            print(f"            longueur_valeur={len(val)}  debut_correct={val.startswith('sbp_')}")
        else:
            print(f"  ligne {i} (non reconnue comme affectation) : {re.sub(r'[A-Za-z0-9]', 'x', ligne)!r}")

print("\n--- presence de motifs attendus / suspects ---")
for motif in ("sbp_", "sb_publishable_", "sb_secret_", "eyJ", "https://", "postgres"):
    print(f"  {motif!r:22} present dans le fichier :", motif in texte)

print("\n--- champs remplis du bloc 2 ---")
for cle in ("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
            "SUPABASE_SECRET_KEY", "SUPABASE_DB_PASSWORD"):
    m = re.search(rf"^{cle}\s*=\s*(.*)$", texte, re.M)
    v = (m.group(1).strip() if m else "")
    print(f"  {cle:38} rempli : {bool(v)}  (longueur {len(v)})")
