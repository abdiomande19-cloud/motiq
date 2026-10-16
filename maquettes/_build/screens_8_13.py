# -*- coding: utf-8 -*-
"""MOTIQ — maquettes Phase 1. Écrans 8 à 13 (chapitre 8 du cahier des charges)."""

NAV = [("03-accueil-connecte.html", "Accueil"),
       ("04-creation-entree.html", "Créer"),
       ("10-bibliotheque.html", "Projets"),
       ("13-parametres-compte.html", "Compte")]

SCREENS_8_13 = [
{
 "file": "08-editeur-apercu.html",
 "title": "Éditeur et aperçu",
 "surface": "Commander/Inspecter",
 "why": "On pilote un objet et on inspecte ses propriétés : canevas 9:16 au centre, inspecteur à côté, timeline des scènes en bas.",
 "nav": "10-bibliotheque.html",
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="05-script-scenes.html">←</a>
  <div class="brand"><span class="logo-word">Éditeur</span></div>
  <span class="spacer"></span><span class="badge ok">Enregistré</span>
</header>

<div class="split">
  <div>
    <div class="canvas9x16">
      <div class="deco" aria-hidden="true"></div>
      <div>
        <div class="cap9">Vous perdez des abonnés<br>sans savoir pourquoi.</div>
        <p class="tiny" style="margin-top:var(--sp-2)">Scène 1 / 4 · aperçu</p>
      </div>
    </div>
    <div class="timeline" data-group>
      <button class="tl-scene" aria-current="true">1</button>
      <button class="tl-scene">2</button>
      <button class="tl-scene">3</button>
      <button class="tl-scene">4</button>
    </div>
  </div>

  <div class="glass card">
    <h3>Texte de la scène</h3>
    <input class="input" value="Vous perdez des abonnés sans savoir pourquoi.">

    <h3 style="margin-top:var(--sp-3)">Couleurs</h3>
    <div class="row tight">
      <button class="chip on" style="width:44px;height:44px;padding:0;min-height:44px;background:oklch(80% 0.15 178)"></button>
      <button class="chip" style="width:44px;height:44px;padding:0;min-height:44px;background:oklch(72% 0.16 38)"></button>
      <button class="chip" style="width:44px;height:44px;padding:0;min-height:44px;background:oklch(97% 0.005 250)"></button>
      <button class="chip" style="width:44px;height:44px;padding:0;min-height:44px;background:oklch(22% 0.02 250)"></button>
    </div>

    <h3 style="margin-top:var(--sp-3)">Police</h3>
    <select class="input">
      <option>Segoe UI Variable — moderne</option>
      <option>Georgia — éditorial</option>
      <option>Consolas — technique</option>
    </select>

    <h3 style="margin-top:var(--sp-3)">Musique</h3>
    <div class="row tight">
      <button class="chip on">Calme · 92 bpm</button>
      <button class="chip">Énergique</button>
      <button class="chip">Aucune</button>
    </div>

    <h3 style="margin-top:var(--sp-3)">Sous-titres animés</h3>
    <div class="row tight"><button class="chip on">Activés</button><button class="chip">Désactivés</button></div>
  </div>
</div>

<div class="row">
  <a class="btn" href="07-generation.html">Relancer le rendu</a>
  <a class="btn primary" href="09-export-partage.html" style="flex:1">Exporter la vidéo</a>
</div>
<p class="note">Ajustements sans repasser par l'IA (§5). Aucun rendu n'est relancé automatiquement : l'utilisateur décide.</p>
"""
},
{
 "file": "09-export-partage.html",
 "title": "Export et partage",
 "surface": "Opérer",
 "why": "On agit : format, qualité, destinations. Chaque option indique sa conséquence (qualité, filigrane, plan requis).",
 "nav": "10-bibliotheque.html",
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="08-editeur-apercu.html">←</a>
  <div class="brand"><span class="logo-word">Export</span></div>
  <span class="spacer"></span><span class="badge acc">MP4 · 9:16</span>
</header>

<div class="glass card" style="padding:var(--sp-3)">
  <div class="row" style="gap:var(--sp-3)">
    <span class="thumb v"></span>
    <span style="flex:1">
      <span class="nm" style="font-weight:600">3 astuces pour gagner du temps</span><br>
      <span class="tiny">28 s · 1080 × 1920 · sous-titres animés inclus</span>
    </span>
  </div>
</div>

<div class="section-title"><h2>Qualité</h2><span>selon votre plan</span></div>
<div class="list" data-group>
  <button class="item" aria-pressed="false" style="text-align:left">
    <span style="flex:1"><span class="nm">Standard — 720p</span><br><span class="tiny">Filigrane Motiq · disponible partout</span></span>
    <span class="badge">Gratuit</span>
  </button>
  <button class="item" aria-pressed="true" style="text-align:left">
    <span style="flex:1"><span class="nm">HD — 1080p, sans filigrane</span><br><span class="tiny">Recommandé pour TikTok, Reels et Shorts</span></span>
    <span class="badge acc">Pro</span>
  </button>
  <button class="item" aria-pressed="false" style="text-align:left">
    <span style="flex:1"><span class="nm">Haute qualité + rendu prioritaire</span><br><span class="tiny">File d'attente dédiée</span></span>
    <span class="badge">Business</span>
  </button>
</div>

<div class="section-title"><h2>Où envoyer ?</h2></div>
<div class="row" data-group="multi">
  <button class="chip on" aria-pressed="true">Télécharger</button>
  <button class="chip" aria-pressed="false">TikTok</button>
  <button class="chip" aria-pressed="false">Instagram Reels</button>
  <button class="chip" aria-pressed="false">YouTube Shorts</button>
</div>

<div class="row" style="margin-top:var(--sp-3)"><button class="btn primary wide">Exporter maintenant</button></div>
<p class="tiny">Le rendu dure quelques minutes : vous pouvez fermer l'application, Motiq vous prévient à la fin.</p>
<p class="note">Le partage direct dépend des autorisations de chaque réseau. Version initiale : export et téléchargement,
le partage natif venant ensuite — à confirmer avec vous.</p>
"""
},
{
 "file": "10-bibliotheque.html",
 "title": "Bibliothèque de projets",
 "surface": "Explorer (+ Agir au second plan)",
 "why": "On parcourt : recherche et filtres d'abord, grille ensuite. Les actions (dupliquer, supprimer) restent discrètes pour ne pas dominer.",
 "nav": "10-bibliotheque.html",
 "body": """
<header class="topbar">
  <div class="brand"><span class="mark"></span><span class="logo-word">Mes projets</span></div>
  <span class="spacer"></span><button class="btn sm ghost" id="theme">Clair</button>
</header>

<input class="input" placeholder="Rechercher un projet…" aria-label="Rechercher un projet">
<div class="row" data-group style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">
  <button class="chip" aria-pressed="true">Tous</button>
  <button class="chip" aria-pressed="false">Terminés</button>
  <button class="chip" aria-pressed="false">En cours</button>
  <button class="chip" aria-pressed="false">Brouillons</button>
  <button class="chip" aria-pressed="false">Échecs</button>
</div>

<div class="grid">
  <a class="tile" href="09-export-partage.html"><span class="badge ok" style="position:absolute;top:8px;left:8px">Terminé</span>
    <span class="cap">3 astuces pour gagner du temps</span><span class="sub">28 s · il y a 2 h</span></a>
  <a class="tile" href="07-generation.html"><span class="badge warn" style="position:absolute;top:8px;left:8px">En cours</span>
    <span class="cap">Lancement produit — teaser</span><span class="sub">scène 3/6</span></a>
  <a class="tile" href="05-script-scenes.html"><span class="badge" style="position:absolute;top:8px;left:8px">Brouillon</span>
    <span class="cap">Note vocale — idée de lundi</span><span class="sub">4 scènes</span></a>
  <a class="tile" href="08-editeur-apercu.html"><span class="badge ok" style="position:absolute;top:8px;left:8px">Terminé</span>
    <span class="cap">Recette express — 60 s</span><span class="sub">1:00 · hier</span></a>
  <a class="tile" href="07-generation.html"><span class="badge warn" style="position:absolute;top:8px;left:8px">Échec</span>
    <span class="cap">Promo de printemps</span><span class="sub">rendu à relancer</span></a>
  <div class="tile glass" style="justify-content:center;align-items:center;cursor:default">
    <a class="btn sm" href="04-creation-entree.html">+ Nouvelle vidéo</a>
  </div>
</div>

<div class="glass card" style="margin-top:var(--sp-2)">
  <h3>Projet sélectionné</h3>
  <div class="row tight">
    <button class="btn sm">Ouvrir</button>
    <button class="btn sm">Dupliquer</button>
    <button class="btn sm">Renommer</button>
    <button class="btn sm" style="color:var(--danger);border-color:color-mix(in oklab, var(--danger) 45%, transparent)">Supprimer</button>
  </div>
  <p class="hint" style="margin-top:var(--sp-2)">La suppression demande une confirmation et efface aussi les médias associés.</p>
</div>
<p class="note">Un rendu en échec propose une reprise sans recompter le quota (§13).</p>
"""
},
{
 "file": "11-kit-marque.html",
 "title": "Kit de marque",
 "surface": "Configurer",
 "why": "On règle des valeurs et on voit immédiatement le résultat appliqué : l'aperçu à droite est la validation, pas une décoration.",
 "nav": "13-parametres-compte.html",
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="13-parametres-compte.html">←</a>
  <div class="brand"><span class="logo-word">Kit de marque</span></div>
  <span class="spacer"></span><span class="badge acc">Pro</span>
</header>

<div class="split">
  <div class="glass card">
    <h3>Logo</h3>
    <div class="row">
      <span class="thumb" style="width:64px;height:64px"></span>
      <div><button class="btn sm">Importer un logo</button>
        <p class="hint">PNG ou SVG, 2 Mo maximum, fond transparent conseillé.</p></div>
    </div>

    <h3 style="margin-top:var(--sp-3)">Couleurs (2 à 3)</h3>
    <div class="row tight">
      <div><button class="chip on" style="width:44px;height:44px;padding:0;background:oklch(80% 0.15 178)"></button>
        <p class="tiny mono" style="margin:4px 0 0">#2ED8C4</p></div>
      <div><button class="chip" style="width:44px;height:44px;padding:0;background:oklch(72% 0.16 38)"></button>
        <p class="tiny mono" style="margin:4px 0 0">#FF7A59</p></div>
      <div><button class="chip" style="width:44px;height:44px;padding:0;background:oklch(30% 0.02 250)"></button>
        <p class="tiny mono" style="margin:4px 0 0">#1B1E27</p></div>
    </div>

    <h3 style="margin-top:var(--sp-3)">Police</h3>
    <select class="input"><option>Segoe UI Variable</option><option>Georgia</option><option>Consolas</option></select>

    <div class="row" style="margin-top:var(--sp-3)"><button class="btn primary wide">Enregistrer le kit</button></div>
  </div>

  <div>
    <div class="canvas9x16">
      <div class="deco" aria-hidden="true"></div>
      <div>
        <div class="tiny" style="letter-spacing:.28em;text-transform:uppercase">Awa Cuisine</div>
        <div class="cap9" style="margin-top:var(--sp-2)">Vos couleurs,<br>appliquées partout.</div>
      </div>
      <span class="thumb" style="position:absolute;top:14px;left:14px;width:34px;height:34px"></span>
    </div>
    <p class="note">Aperçu en direct : le kit s'applique automatiquement à chaque nouveau template (§5).</p>
  </div>
</div>
"""
},
{
 "file": "12-abonnement.html",
 "title": "Abonnement et facturation",
 "surface": "Comparer",
 "why": "On met les plans côte à côte, colonnes alignées, un seul différenciateur mis en avant. La facturation reste factuelle.",
 "nav": "13-parametres-compte.html",
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="03-accueil-connecte.html">←</a>
  <div class="brand"><span class="logo-word">Abonnement</span></div>
  <span class="spacer"></span><span class="badge acc">Plan Pro</span>
</header>

<section class="glass card strong">
  <div class="row"><div><h2 style="margin:0">Plan Pro — actif</h2>
    <p class="tiny" style="margin:4px 0 0">Renouvellement le 1ᵉʳ du mois · 2 rendus restants</p></div>
    <span class="spacer"></span><button class="btn sm">Gérer</button></div>
</section>

<div class="plans" data-group>
  <div class="plan">
    <div class="plan-head"><h2 style="margin:0">Gratuit</h2><span class="badge">Toujours gratuit</span></div>
    <div class="price">0 Fr CFA<span class="tiny" style="font-weight:400"> /mois</span></div>
    <ul><li>Peu de vidéos / mois</li><li>Qualité standard</li><li>Filigrane</li>
      <li class="off">Kit de marque</li><li class="off">Rendu prioritaire</li></ul>
    <button class="btn wide" style="margin-top:var(--sp-3)">Revenir au gratuit</button>
  </div>
  <div class="plan hi">
    <div class="plan-head"><h2 style="margin:0">Pro</h2><span class="badge acc">Votre plan</span></div>
    <div class="price">4 900 Fr CFA<span class="tiny" style="font-weight:400"> /mois</span></div>
    <ul><li>Exports HD sans filigrane</li><li>Kit de marque</li><li>Plus de rendus</li>
      <li>Bibliothèque illimitée</li><li class="off">Rendu prioritaire</li></ul>
    <button class="btn wide primary" style="margin-top:var(--sp-3)">Plan actuel</button>
  </div>
  <div class="plan">
    <div class="plan-head"><h2 style="margin:0">Business</h2><span class="badge">à valider</span></div>
    <div class="price">9 900 Fr CFA<span class="tiny" style="font-weight:400"> /mois</span></div>
    <ul><li>Haute qualité</li><li>Rendu prioritaire</li><li>Quotas les plus élevés</li>
      <li class="off">Équipe <span class="tiny">(v2)</span></li><li class="off">Facturation groupée <span class="tiny">(v2)</span></li></ul>
    <button class="btn wide" style="margin-top:var(--sp-3)">Passer à Business</button>
  </div>
</div>

<div class="section-title"><h2>Moyen de paiement et factures</h2></div>
<div class="list">
  <div class="item"><span style="flex:1"><span class="nm">Carte •••• 4242</span><br><span class="tiny">Gérée par Stripe — aucune donnée de carte n'est stockée par Motiq</span></span>
    <button class="btn sm">Modifier</button></div>
  <div class="item"><span style="flex:1"><span class="nm">Facture du 1ᵉʳ septembre</span><br><span class="tiny mono">PDF · 4 900 Fr CFA</span></span>
    <button class="btn sm">Télécharger</button></div>
</div>
<p class="note">Tarifs fixés : 4 900 Fr CFA/mois (Pro), 9 900 Fr CFA/mois (Business). Les quotas par plan restent à fixer d'après le coût réel d'un rendu et des appels IA (§11).
Les webhooks Stripe synchronisent l'état de l'abonnement (§10.4).</p>
"""
},
{
 "file": "13-parametres-compte.html",
 "title": "Paramètres du compte",
 "surface": "Configurer",
 "why": "Réglages empilés par thème, l'action destructive isolée en bas avec sa conséquence écrite — jamais à côté d'un bouton anodin.",
 "nav": "13-parametres-compte.html",
 "body": """
<header class="topbar">
  <div class="brand"><span class="mark"></span><span class="logo-word">Compte</span></div>
  <span class="spacer"></span><button class="btn sm ghost" id="theme">Clair</button>
</header>

<section class="glass card">
  <h3>Profil</h3>
  <div class="field"><label for="n">Nom</label><input class="input" id="n" value="Awa Diomandé"></div>
  <div class="field"><label for="m">Adresse e-mail</label><input class="input" id="m" type="email" value="awa@exemple.com"></div>
  <button class="btn sm">Enregistrer</button>
</section>

<section class="glass card">
  <h3>Sécurité</h3>
  <div class="field"><label for="p1">Nouveau mot de passe</label><input class="input" id="p1" type="password" placeholder="8 caractères minimum"></div>
  <div class="row"><button class="btn sm">Mettre à jour</button><button class="btn sm">Activer la double authentification</button></div>
</section>

<section class="glass card">
  <h3>Préférences</h3>
  <div class="row" data-group><button class="chip" aria-pressed="false">Français</button><button class="chip" aria-pressed="true">Français + anglais</button></div>
  <div class="row" data-group style="margin-top:var(--sp-2)">
    <button class="chip" aria-pressed="true">Thème sombre</button><button class="chip" aria-pressed="false">Thème clair</button>
    <button class="chip" aria-pressed="false">Suivre l'appareil</button>
  </div>
  <div class="row" data-group style="margin-top:var(--sp-2)">
    <button class="chip" aria-pressed="true">Réduire les animations : non</button>
    <button class="chip" aria-pressed="false">Notifications de fin de rendu</button>
  </div>
</section>

<section class="glass card">
  <h3>Votre plan</h3>
  <p class="tiny">Pro · 2 rendus restants ce mois.</p>
  <a class="btn sm" href="12-abonnement.html">Gérer l'abonnement</a>
</section>

<section class="glass card" style="border-color:color-mix(in oklab, var(--danger) 40%, transparent)">
  <h3 style="color:var(--danger)">Zone sensible</h3>
  <p class="tiny">La suppression du compte efface vos projets, vos médias, votre kit de marque et vos factures locales.
     Cette action est définitive et vous sera demandée par confirmation écrite.</p>
  <button class="btn" style="color:var(--danger);border-color:color-mix(in oklab, var(--danger) 45%, transparent)">Supprimer mon compte et mes données</button>
  <p class="hint" style="margin-top:var(--sp-2)">Exigence §12 : possibilité de supprimer son compte et ses données.</p>
</section>
"""
},
]
