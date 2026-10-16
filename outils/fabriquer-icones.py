"""Motiq — generation des icones de l'application installee (PWA).

Chrome exige au moins une icone de 192 px et une de 512 px pour proposer
l'installation. Un SVG ne suffit pas toujours : on produit de vrais PNG.

Dessine avec Pillow, sans dependance externe : un carre arrondi sombre, un
« M » degrade (turquoise vers orange) — la charte du projet.
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

SORTIE = r"C:\Users\Diomande\Motiq\app\public"
POLICES = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
]


def police(taille: int):
    for chemin in POLICES:
        if os.path.exists(chemin):
            try:
                return ImageFont.truetype(chemin, taille)
            except OSError:
                continue
    return ImageFont.load_default()


def dessiner(taille: int) -> Image.Image:
    # On dessine en grand puis on reduit : cela lisse les bords.
    echelle = 4
    cote = taille * echelle
    image = Image.new("RGBA", (cote, cote), (0, 0, 0, 0))
    dessin = ImageDraw.Draw(image)

    marge = int(cote * 0.06)
    rayon = int(cote * 0.22)
    dessin.rounded_rectangle(
        [marge, marge, cote - marge, cote - marge],
        radius=rayon,
        fill=(11, 15, 20, 255),
    )

    # Degrade turquoise -> orange, applique au « M » par masque.
    degrade = Image.new("RGB", (cote, cote), (34, 211, 197))
    pinceau = ImageDraw.Draw(degrade)
    for x in range(cote):
        for_y = x / max(cote - 1, 1)
        r = int(34 + (255 - 34) * for_y)
        v = int(211 + (122 - 211) * for_y)
        b = int(197 + (89 - 197) * for_y)
        pinceau.line([(x, 0), (x, cote)], fill=(r, v, b))

    masque = Image.new("L", (cote, cote), 0)
    dessin_masque = ImageDraw.Draw(masque)
    dessin_masque.text(
        (cote / 2, cote / 2 - cote * 0.02),
        "M",
        font=police(int(cote * 0.62)),
        fill=255,
        anchor="mm",
    )
    # Point final, comme dans le logotype.
    r_point = int(cote * 0.075)
    cx, cy = int(cote * 0.74), int(cote * 0.72)
    dessin_masque.ellipse([cx - r_point, cy - r_point, cx + r_point, cy + r_point], fill=255)

    image.paste(degrade, (0, 0), masque)
    return image.resize((taille, taille), Image.LANCZOS)


for taille in (192, 512):
    chemin = os.path.join(SORTIE, f"icone-{taille}.png")
    dessiner(taille).save(chemin, "PNG", optimize=True)
    print(f"ecrit : {chemin} ({os.path.getsize(chemin)} octets)")

# Icone « maskable » : le contenu reste dans les 80 % centraux, pour que les
# formes rondes d'Android ne rognent pas le logo.
cote = 512
image = Image.new("RGBA", (cote, cote), (11, 15, 20, 255))
interne = dessiner(int(cote * 0.72))
decalage = (cote - interne.width) // 2
image.paste(interne, (decalage, decalage), interne)
chemin = os.path.join(SORTIE, "icone-maskable-512.png")
image.save(chemin, "PNG", optimize=True)
print(f"ecrit : {chemin} ({os.path.getsize(chemin)} octets)")
