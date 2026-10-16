"""Motiq — fabrique de VRAIS fichiers de test (PDF, Word, Excel, CSV, texte).

POURQUOI CE SCRIPT
On ne peut pas verifier « l'extraction de texte fonctionne » sans fichiers
reels. Telecharger des exemples ne prouve rien sur ceux-la. On les fabrique
donc ici, octet par octet, avec leur vraie structure :

  - un PDF a la syntaxe PDF complete (objets, table des references, offsets) ;
  - un .docx, qui est une archive ZIP contenant du XML Word ;
  - un .xlsx, meme principe avec du XML Excel ;
  - un .csv et un .txt, en clair.

Chaque fichier contient une PHRASE TEMOIN qu'on recherchera dans le texte
extrait : si elle ressort, l'extraction lit vraiment le document.
"""

from __future__ import annotations

import zipfile
from pathlib import Path

SORTIE = Path(r"C:\Users\Diomande\Motiq\outils\fichiers-essai")
SORTIE.mkdir(parents=True, exist_ok=True)

TEMOIN_PDF = "Le chiffre d'affaires a progresse de 23 pour cent"
TEMOIN_WORD = "Notre nouvelle campagne vise les artisans de Bouake"
TEMOIN_EXCEL = "Bouake"
TEMOIN_TEXTE = "Un texte simple en clair, sans mise en forme"


# ---------------------------------------------------------------------- PDF
def fabriquer_pdf(chemin: Path) -> None:
    """Un PDF minimal mais VALIDE : en-tete, objets, table xref, offsets exacts."""
    lignes_texte = [
        "Rapport Motiq - document de test",
        TEMOIN_PDF,
        "Cette phrase sert a prouver que le texte est bien extrait.",
    ]

    # Le flux de contenu : chaque ligne est ecrite avec la police Helvetica.
    flux = "BT /F1 18 Tf 60 720 Td 24 TL\n"
    for ligne in lignes_texte:
        flux += f"({ligne}) Tj T*\n"
    flux += "ET"
    flux_octets = flux.encode("latin-1")

    objets: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(flux_octets)).encode() + b" >>\nstream\n" + flux_octets + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    contenu = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for numero, corps in enumerate(objets, start=1):
        offsets.append(len(contenu))
        contenu += f"{numero} 0 obj\n".encode() + corps + b"\nendobj\n"

    debut_xref = len(contenu)
    contenu += f"xref\n0 {len(objets) + 1}\n".encode()
    contenu += b"0000000000 65535 f \n"
    for offset in offsets:
        contenu += f"{offset:010d} 00000 n \n".encode()
    contenu += (
        f"trailer\n<< /Size {len(objets) + 1} /Root 1 0 R >>\n"
        f"startxref\n{debut_xref}\n%%EOF\n"
    ).encode()

    chemin.write_bytes(bytes(contenu))


# --------------------------------------------------------------------- DOCX
def fabriquer_docx(chemin: Path) -> None:
    """Un .docx est une archive ZIP : quatre fichiers XML suffisent."""
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Brief de campagne — document de test</w:t></w:r></w:p>
    <w:p><w:r><w:t>{TEMOIN_WORD}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Budget prevu : 1 500 000 francs CFA.</w:t></w:r></w:p>
  </w:body>
</w:document>"""

    with zipfile.ZipFile(chemin, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document)


# --------------------------------------------------------------------- XLSX
def fabriquer_xlsx(chemin: Path) -> None:
    """Un .xlsx est aussi une archive ZIP avec du XML Excel."""
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

    workbook = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Ventes" sheetId="1" r:id="rId1"/></sheets>
</workbook>"""

    # 0=Ville, 1=Montant, 2=Unites
    partagees = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="6" uniqueCount="6">
  <si><t>Ville</t></si><si><t>Montant</t></si><si><t>Unites</t></si>
  <si><t>{TEMOIN_EXCEL}</t></si><si><t>Abidjan</t></si><si><t>Yamoussoukro</t></si>
</sst>"""

    feuille = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>
    <row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>1500000</v></c><c r="C2"><v>320</v></c></row>
    <row r="3"><c r="A3" t="s"><v>4</v></c><c r="B3"><v>980000</v></c><c r="C3"><v>210</v></c></row>
    <row r="4"><c r="A4" t="s"><v>5</v></c><c r="B4"><v>430000</v></c><c r="C4"><v>95</v></c></row>
  </sheetData>
</worksheet>"""

    with zipfile.ZipFile(chemin, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("xl/workbook.xml", workbook)
        z.writestr("xl/sharedStrings.xml", partagees)
        z.writestr("xl/worksheets/sheet1.xml", feuille)


# ------------------------------------------------------------------- en clair
def fabriquer_texte(chemin: Path, contenu: str) -> None:
    chemin.write_text(contenu, encoding="utf-8")


if __name__ == "__main__":
    fabriquer_pdf(SORTIE / "essai.pdf")
    fabriquer_docx(SORTIE / "essai.docx")
    fabriquer_xlsx(SORTIE / "essai.xlsx")
    fabriquer_texte(SORTIE / "essai.txt", f"{TEMOIN_TEXTE}.\nDeuxieme ligne.\n")
    fabriquer_texte(
        SORTIE / "essai.csv",
        "Ville;Montant;Unites\nBouake;1500000;320\nAbidjan;980000;210\n",
    )

    print("Fichiers de test fabriques :")
    for f in sorted(SORTIE.iterdir()):
        print(f"  {f.name:<14} {f.stat().st_size:>8} octets")
    print()
    print("Phrases temoins a retrouver dans le texte extrait :")
    print(f"  PDF   : {TEMOIN_PDF}")
    print(f"  WORD  : {TEMOIN_WORD}")
    print(f"  EXCEL : {TEMOIN_EXCEL} (dans la feuille Ventes)")
    print(f"  TEXTE : {TEMOIN_TEXTE}")
