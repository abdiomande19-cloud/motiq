# -*- coding: utf-8 -*-
"""MOTIQ — assemble les 13 maquettes à partir du design system + des écrans.
Sortie : C:/Users/Diomande/Motiq/maquettes/<ecran>.html (autonome) + index.html
Usage : python build.py
"""
import os, sys, io

BUILD = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(BUILD)
sys.path.insert(0, BUILD)

from screens_1_7 import SCREENS_1_7, NAV
from screens_8_13 import SCREENS_8_13

CSS = io.open(os.path.join(BUILD, "design-system.css"), encoding="utf-8").read()
JS  = io.open(os.path.join(BUILD, "app.js"), encoding="utf-8").read()
SCREENS = SCREENS_1_7 + SCREENS_8_13

SHELL = """<!doctype html>
<html lang="fr" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Motiq — __TITLE__</title>
<meta name="color-scheme" content="dark light">
<meta name="description" content="Motiq, maquette Phase 1 (LAB 04) — écran __NUM__ : __TITLE__. Contenu de démonstration.">
<!-- Maquette statique. Surface : __SURFACE__.
     Généré par le Central Orchestrator Agent — Phase 1 du cahier des charges Motiq.
     Autonome : CSS et JS inlinés, aucune dépendance réseau. -->
<style>
__CSS__
</style>
</head>
<body>
<div class="bg" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span></div>
<div class="stage">
  <main class="app">
__BODY__
__NAV__
  </main>
</div>
<script>
__JS__
</script>
</body>
</html>
"""

def nav_html(active, ind):
    if not active:
        return ""
    links = []
    for href, label in NAV:
        cur = ' aria-current="page"' if href == active else ""
        links.append('        <a href="%s"%s><span class="ic"></span>%s</a>' % (href, cur, label))
    return ('      <nav class="tabbar glass" aria-label="Navigation principale">\n'
            + "\n".join(links) + "\n      </nav>")

written = []
for i, s in enumerate(SCREENS, start=1):
    num = "%02d" % i
    html = (SHELL
            .replace("__TITLE__", s["title"])
            .replace("__NUM__", num)
            .replace("__SURFACE__", s["surface"])
            .replace("__BODY__", s["body"].strip("\n"))
            .replace("__NAV__", nav_html(s.get("nav"), num))
            .replace("__CSS__", CSS)
            .replace("__JS__", JS))
    path = os.path.join(OUT, s["file"])
    with io.open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    written.append((s["file"], len(html), s["title"], s["surface"]))

# ---------- index.html ----------
rows = []
for i, s in enumerate(SCREENS, start=1):
    rows.append(
      '      <a class="item" href="%s" style="text-decoration:none;color:inherit">\n'
      '        <span class="thumb" style="display:grid;place-items:center;font-weight:700">%02d</span>\n'
      '        <span style="flex:1"><span class="nm">%s</span><br><span class="tiny">%s</span></span>\n'
      '        <span class="badge">ouvrir</span>\n      </a>' % (s["file"], i, s["title"], s["surface"]))

index_body = """
<header class="topbar">
  <div class="brand"><span class="mark"></span><span class="logo-word">Motiq<small>Phase 1 — maquettes</small></span></div>
  <span class="spacer"></span><button class="btn sm ghost" id="theme">Clair</button>
</header>

<section class="glass card">
  <span class="badge acc">Phase 1 · 13 écrans</span>
  <h1 style="margin-top:var(--sp-2);font-size:26px">Les 13 écrans du chapitre 8</h1>
  <p class="lead">Maquettes cliquables, mobile d'abord, style <em>liquid glass</em>, mode sombre par défaut.
     Chaque écran est un fichier autonome : ouvrez-le, il fonctionne seul.</p>
  <p class="tiny">Contenu de démonstration — aucun chiffre, prix ou quota n'est décidé. Les valeurs marquées « à définir » attendent vos arbitrages.</p>
</section>

<div class="section-title"><h2>Parcours principal</h2><span>chapitre 7</span></div>
<section class="glass card">
  <p class="tiny" style="margin:0">2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 :
     se connecter, créer, valider le script, choisir un style, générer, ajuster, exporter.</p>
  <div class="row" style="margin-top:var(--sp-2)">
    <a class="btn sm primary" href="02-connexion-inscription.html">Commencer le parcours</a>
    <a class="btn sm" href="01-accueil-visiteur.html">Accueil visiteur</a>
  </div>
</section>

<div class="section-title"><h2>Les écrans</h2><span>et la surface de chacun</span></div>
<div class="list">
__ROWS__
</div>

<div class="section-title"><h2>Ce que chaque écran est — et n'est pas</h2></div>
<section class="glass card">
  <p class="tiny">Chaque maquette assume une <strong>surface</strong> : on surveille un état, on agit, on compare, on configure,
     on apprend, on explore, ou on inspecte un objet. Un tableau de bord n'a pas de hero ; une page de tarifs n'a pas de
     filtre. C'est ce qui évite les 13 écrans identiques.</p>
  <ul class="plan" style="list-style:none;padding:0;margin:0">
    <li>Décider/Apprendre → écran 1 (le seul hero légitime)</li>
    <li>Comparer → écrans 1 (tarifs) et 12</li>
    <li>Opérer → écrans 3, 4, 9</li>
    <li>Explorer → écrans 6, 10</li>
    <li>Configurer → écrans 2, 11, 13</li>
    <li>Surveiller → écran 7</li>
    <li>Commander/Inspecter → écrans 5, 8</li>
  </ul>
</section>
"""

index_html = (SHELL
              .replace("__TITLE__", "Maquettes — index")
              .replace("__NUM__", "00")
              .replace("__SURFACE__", "Index (hors produit)")
              .replace("__BODY__", index_body.replace("__ROWS__", "\n".join(rows)).strip("\n"))
              .replace("__NAV__", "")
              .replace("__CSS__", CSS)
              .replace("__JS__", JS))
with io.open(os.path.join(OUT, "index.html"), "w", encoding="utf-8", newline="\n") as f:
    f.write(index_html)

print("Fichiers ecrits dans %s :" % OUT)
for f_, n, t, s in written:
    print("  %-32s %6d o  %s" % (f_, n, t))
print("  %-32s %6d o  index" % ("index.html", len(index_html)))
print("TOTAL : %d fichiers HTML" % (len(written) + 1))
