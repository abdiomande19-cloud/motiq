# -*- coding: utf-8 -*-
"""MOTIQ — maquettes Phase 1. Écrans 1 à 7 (chapitre 8 du cahier des charges).
Chaque écran est un fichier HTML autonome (CSS + JS inlinés) pour être
ouvrable seul : navigateur, aperçu en conversation, ou envoi."""

NAV = [("03-accueil-connecte.html", "Accueil"),
       ("04-creation-entree.html", "Créer"),
       ("10-bibliotheque.html", "Projets"),
       ("13-parametres-compte.html", "Compte")]

SCREENS_1_7 = [
{
 "file": "01-accueil-visiteur.html",
 "title": "Accueil visiteur et tarifs",
 "surface": "Décider/Apprendre (principal) + Comparer (tarifs)",
 "why": "Seul écran où un hero est légitime : on doit convaincre. Les tarifs suivent une grille alignée, pas des cartes décoratives.",
 "nav": None,
 "body": """
<header class="topbar">
  <div class="brand"><span class="mark"></span><span class="logo-word">Motiq<small>vidéo motion design</small></span></div>
  <span class="spacer"></span>
  <button class="btn sm ghost" id="theme">Clair</button>
  <a class="btn sm" href="02-connexion-inscription.html">Se connecter</a>
</header>

<section class="glass card" style="padding:var(--sp-4)">
  <span class="badge acc">MVP</span>
  <h1 style="margin-top:var(--sp-2)">Une idée.<br>Une photo.<br><span class="grad-text">Une vidéo prête à publier.</span></h1>
  <p class="lead">Écrivez une phrase, importez des images ou enregistrez votre voix.
     Motiq écrit le script, découpe les scènes et rend une vidéo motion design verticale.</p>
  <div class="row">
    <a class="btn primary" href="02-connexion-inscription.html">Commencer gratuitement</a>
    <a class="btn" href="#tarifs">Voir les tarifs</a>
  </div>
  <p class="tiny" style="margin-top:var(--sp-3)">15 à 60 secondes · format 9:16 · sous-titres animés · sans savoir écrire de prompt</p>
</section>

<section class="row" style="gap:var(--sp-2);align-items:stretch">
  <div class="glass card" style="flex:1;min-width:150px">
    <h3>1. Vous donnez la matière</h3>
    <p class="tiny">Texte, images ou note vocale. Aucun prompt à rédiger.</p>
  </div>
  <div class="glass card" style="flex:1;min-width:150px">
    <h3>2. Motiq découpe</h3>
    <p class="tiny">Script en scènes, à valider ou corriger avant le rendu.</p>
  </div>
  <div class="glass card" style="flex:1;min-width:150px">
    <h3>3. Vous ajustez et exportez</h3>
    <p class="tiny">Éditeur visuel, aperçu, puis MP4 pour TikTok, Reels ou Shorts.</p>
  </div>
</section>

<div class="section-title"><h2 id="tarifs">Tarifs</h2><span>quotas provisoires — à valider en Phase 2</span></div>
<div class="plans">
  <div class="plan">
    <div class="plan-head"><h2 style="margin:0">Gratuit</h2><span class="badge">Toujours gratuit</span></div>
    <div class="price">0 F CFA<span class="tiny" style="font-weight:400"> /mois</span></div>
    <ul>
      <li>Quelques vidéos par mois <span class="tiny">(nombre à définir)</span></li>
      <li>Qualité standard</li>
      <li>Filigrane Motiq</li>
      <li class="off">Kit de marque</li>
      <li class="off">Export sans filigrane</li>
    </ul>
    <a class="btn wide" style="margin-top:var(--sp-3)" href="02-connexion-inscription.html">Créer un compte</a>
  </div>
  <div class="plan hi">
    <div class="plan-head"><h2 style="margin:0">Pro</h2><span class="badge acc">Populaire</span></div>
    <div class="price">4 900 F CFA<span class="tiny" style="font-weight:400"> /mois</span></div>
    <ul>
      <li>Exports HD sans filigrane</li>
      <li>Kit de marque (logo, couleurs, police)</li>
      <li>Plus de rendus par mois</li>
      <li>Bibliothèque de projets</li>
      <li class="off">Rendu prioritaire</li>
    </ul>
    <a class="btn wide primary" style="margin-top:var(--sp-3)" href="12-abonnement.html">Choisir Pro</a>
  </div>
  <div class="plan">
    <div class="plan-head"><h2 style="margin:0">Business</h2><span class="badge">à valider</span></div>
    <div class="price">9 900 F CFA<span class="tiny" style="font-weight:400"> /mois</span></div>
    <ul>
      <li>Haute qualité</li>
      <li>Rendu prioritaire</li>
      <li>Quotas les plus élevés</li>
      <li class="off">Espace équipe <span class="tiny">(version 2)</span></li>
    </ul>
    <a class="btn wide" style="margin-top:var(--sp-3)" href="12-abonnement.html">Choisir Business</a>
  </div>
</div>

<p class="note">Maquette — Phase 1. Les prix et les quotas sont des emplacements à définir
d'après le coût réel d'un rendu et des appels IA (décision attendue, §5 de l'analyse de projet).</p>
"""
},
{
 "file": "02-connexion-inscription.html",
 "title": "Connexion et inscription",
 "surface": "Configurer",
 "why": "Peu de décoration, divulgation progressive (connexion par défaut), états de validation visibles.",
 "nav": None,
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="01-accueil-visiteur.html">←</a>
  <div class="brand"><span class="mark"></span><span class="logo-word">Motiq</span></div>
  <span class="spacer"></span><button class="btn sm ghost" id="theme">Clair</button>
</header>

<div class="glass card" style="padding:var(--sp-4)">
  <div class="row" data-group style="margin-bottom:var(--sp-4)">
    <button class="chip" aria-pressed="true" data-pane="in">Connexion</button>
    <button class="chip" aria-pressed="false" data-pane="up">Inscription</button>
  </div>

  <h2>Bon retour sur Motiq</h2>
  <p class="tiny" style="margin-bottom:var(--sp-3)">Vos projets et votre kit de marque vous attendent.</p>

  <div class="field">
    <label for="mail">Adresse e-mail</label>
    <input class="input" id="mail" type="email" inputmode="email" placeholder="vous@exemple.com" autocomplete="email">
  </div>
  <div class="field">
    <label for="pass">Mot de passe</label>
    <input class="input" id="pass" type="password" placeholder="8 caractères minimum" autocomplete="current-password">
    <span class="hint">Connexion par défaut : la création de compte est l'onglet « Inscription ».</span>
  </div>

  <button class="btn primary wide">Se connecter</button>
  <div class="row" style="justify-content:center;margin:var(--sp-3) 0;color:var(--muted);font-size:12px">ou</div>
  <button class="btn wide">Continuer avec Google</button>
  <p class="tiny" style="text-align:center;margin-top:var(--sp-3)">
    <a href="#" style="color:var(--muted)">Mot de passe oublié ?</a></p>
</div>

<p class="note">Inscription : e-mail + mot de passe, ou Google (authentification Supabase, Phase 2).
En créant un compte vous acceptez les conditions d'utilisation et la politique de confidentialité (§12).</p>
"""
},
{
 "file": "03-accueil-connecte.html",
 "title": "Accueil connecté",
 "surface": "Opérer",
 "why": "L'utilisateur vient agir : le bouton Créer domine, le quota est lisible d'un coup d'œil, les projets récents sont une liste actionnable — pas un hero.",
 "nav": "03-accueil-connecte.html",
 "body": """
<header class="topbar">
  <div class="brand"><span class="mark"></span><span class="logo-word">Motiq</span></div>
  <span class="spacer"></span><button class="btn sm ghost" id="theme">Clair</button>
</header>

<section class="glass card strong">
  <h2>Bonjour Awa</h2>
  <p class="tiny" style="margin-bottom:var(--sp-3)">Prête à transformer une idée en vidéo ?</p>
  <a class="btn primary wide" href="04-creation-entree.html">+ Créer une vidéo</a>
</section>

<section class="glass card">
  <div class="row"><h3 style="margin:0">Quota du mois</h3><span class="spacer"></span>
    <span class="badge acc">Plan Pro</span></div>
  <p class="tiny" style="margin:var(--sp-2) 0">2 rendus restants sur 10 <span class="tiny">(exemple)</span></p>
  <div class="meter"><i style="width:80%"></i></div>
  <p class="tiny" style="margin-top:var(--sp-2)">Renouvellement le 1er du mois · <a href="12-abonnement.html" style="color:var(--accent)">Gérer l'abonnement</a></p>
</section>

<div class="section-title"><h2>Projets récents</h2><span class="spacer"></span><a class="tiny" href="10-bibliotheque.html" style="color:var(--accent)">Tout voir</a></div>
<div class="list">
  <a class="item" href="08-editeur-apercu.html">
    <span class="thumb v"></span>
    <span style="flex:1"><span class="nm">3 astuces pour gagner du temps</span><br><span class="tiny">Modifié il y a 2 h · 32 s</span></span>
    <span class="badge ok">Terminé</span>
  </a>
  <a class="item" href="07-generation.html">
    <span class="thumb v"></span>
    <span style="flex:1"><span class="nm">Lancement produit — teaser</span><br><span class="tiny">Rendu en cours · scène 3/6</span></span>
    <span class="badge warn">En cours</span>
  </a>
  <a class="item" href="05-script-scenes.html">
    <span class="thumb v"></span>
    <span style="flex:1"><span class="nm">Note vocale — idée de lundi</span><br><span class="tiny">Script à valider · 4 scènes</span></span>
    <span class="badge">Brouillon</span>
  </a>
</div>

<p class="note">Données de démonstration. Cet écran ne montre que ce qui aide à décider : quota, action, projets en cours.</p>
"""
},
{
 "file": "04-creation-entree.html",
 "title": "Création — choix de l'entrée",
 "surface": "Opérer",
 "why": "Trois grandes cibles tactiles, une seule décision à prendre. Pas de grille de fonctionnalités.",
 "nav": "04-creation-entree.html",
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="03-accueil-connecte.html">←</a>
  <div class="brand"><span class="logo-word">Nouvelle vidéo</span></div>
  <span class="spacer"></span><button class="btn sm ghost" id="theme">Clair</button>
</header>

<div class="section-title"><h2>Par où voulez-vous commencer ?</h2></div>
<div class="list" data-group>
  <button class="item" aria-pressed="true" style="text-align:left;cursor:pointer">
    <span class="thumb"></span>
    <span style="flex:1"><span class="nm">Écrire une idée</span><br>
      <span class="tiny">Une phrase suffit : « Les 3 erreurs qui font fuir vos abonnés ».</span></span>
  </button>
  <button class="item" aria-pressed="false" style="text-align:left;cursor:pointer">
    <span class="thumb"></span>
    <span style="flex:1"><span class="nm">Importer des images</span><br>
      <span class="tiny">2 à 8 photos, JPG ou PNG, 10 Mo maximum par fichier.</span></span>
  </button>
  <button class="item" aria-pressed="false" style="text-align:left;cursor:pointer">
    <span class="thumb"></span>
    <span style="flex:1"><span class="nm">Enregistrer ma voix</span><br>
      <span class="tiny">Une note vocale : Motiq la transcrit et en fait un script.</span></span>
  </button>
</div>

<section class="glass card">
  <div class="field" style="margin:0">
    <label for="idea">Votre idée</label>
    <textarea class="input" id="idea" rows="4" style="padding:var(--sp-3);min-height:104px;resize:vertical">Comment garder ses abonnés sur une chaîne qui parle de cuisine rapide ?</textarea>
    <span class="hint">Motiq proposera un script découpé en scènes — vous pourrez tout modifier avant le rendu.</span>
  </div>
</section>

<div class="row">
  <a class="btn primary wide" href="05-script-scenes.html">Générer le script</a>
</div>
<p class="note">Aucune clé d'API ne transite par cette interface : l'appel au modèle se fait côté serveur (§12).</p>
"""
},
{
 "file": "05-script-scenes.html",
 "title": "Validation du script par scènes",
 "surface": "Commander/Inspecter",
 "why": "On édite un objet précis : chaque scène est une ligne modifiable, l'ordre est visible, le total de durée est calculé.",
 "nav": "04-creation-entree.html",
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="04-creation-entree.html">←</a>
  <div class="brand"><span class="logo-word">Script</span></div>
  <span class="spacer"></span><span class="badge acc">4 scènes · 28 s</span>
</header>

<p class="tiny">Relisez, corrigez, réordonnez. Rien n'est rendu avant votre validation.</p>

<div class="list">
  <div class="glass card" style="padding:var(--sp-2) var(--sp-3)">
    <div class="row" style="margin-bottom:6px"><span class="badge">Scène 1</span>
      <span class="spacer"></span><span class="tiny mono">0:00 → 0:06</span></div>
    <input class="input" value="Vous perdez des abonnés sans savoir pourquoi.">
  </div>
  <div class="glass card" style="padding:var(--sp-2) var(--sp-3)">
    <div class="row" style="margin-bottom:6px"><span class="badge">Scène 2</span>
      <span class="spacer"></span><span class="tiny mono">0:06 → 0:15</span></div>
    <input class="input" value="La première cause : un rythme qui ne tient pas la promesse du titre.">
  </div>
  <div class="glass card" style="padding:var(--sp-2) var(--sp-3)">
    <div class="row" style="margin-bottom:6px"><span class="badge">Scène 3</span>
      <span class="spacer"></span><span class="tiny mono">0:15 → 0:23</span></div>
    <input class="input" value="La deuxième : aucune raison de rester jusqu'à la fin.">
  </div>
  <div class="glass card" style="padding:var(--sp-2) var(--sp-3)">
    <div class="row" style="margin-bottom:6px"><span class="badge">Scène 4</span>
      <span class="spacer"></span><span class="tiny mono">0:23 → 0:28</span></div>
    <input class="input" value="Abonnez-vous : la prochaine vidéo corrige les deux.">
  </div>
</div>

<div class="row" style="margin-top:var(--sp-2)">
  <button class="btn sm">+ Ajouter une scène</button>
  <button class="btn sm">Régénérer le script</button>
</div>

<div class="row">
  <a class="btn primary wide" href="06-templates.html">Valider et choisir un style</a>
</div>
<p class="note">Durée cible 15 à 60 s (§6.1). Le découpage est renvoyé par le modèle en JSON strict côté serveur (§10.2).</p>
"""
},
{
 "file": "06-templates.html",
 "title": "Choix du template",
 "surface": "Explorer",
 "why": "Espace ouvert : filtres, grille de vignettes 9:16, une sélection. Le filtre est la composition, pas la décoration.",
 "nav": "04-creation-entree.html",
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="05-script-scenes.html">←</a>
  <div class="brand"><span class="logo-word">Style</span></div>
  <span class="spacer"></span><button class="btn sm ghost" id="theme">Clair</button>
</header>

<div class="row" data-group style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">
  <button class="chip" aria-pressed="true">Tous</button>
  <button class="chip" aria-pressed="false">Éditorial</button>
  <button class="chip" aria-pressed="false">Néon</button>
  <button class="chip" aria-pressed="false">Minimal</button>
  <button class="chip" aria-pressed="false">Rétro</button>
  <button class="chip" aria-pressed="false">Textuel</button>
</div>

<div class="grid" data-group>
  <button class="tile" aria-pressed="true"><span class="cap">Titre plein cadre</span><span class="sub">Éditorial</span></button>
  <button class="tile" aria-pressed="false"><span class="cap">Néon glissant</span><span class="sub">Néon</span></button>
  <button class="tile" aria-pressed="false"><span class="cap">Blanc épuré</span><span class="sub">Minimal</span></button>
  <button class="tile" aria-pressed="false"><span class="cap">Grille rétro</span><span class="sub">Rétro</span></button>
  <button class="tile" aria-pressed="false"><span class="cap">Sous-titres animés</span><span class="sub">Textuel</span></button>
  <button class="tile" aria-pressed="false"><span class="cap">Photo + bandeau</span><span class="sub">Éditorial</span></button>
  <button class="tile" aria-pressed="false"><span class="cap">Dégradé fluide</span><span class="sub">Néon</span></button>
  <button class="tile" aria-pressed="false"><span class="cap">Cartes empilées</span><span class="sub">Minimal</span></button>
</div>

<div class="row"><a class="btn primary wide" href="07-generation.html">Générer avec ce style</a></div>
<p class="note">8 templates au lancement — exigence §6.1 : « au moins 8 templates ». L'architecture permet d'en ajouter
par cible (§4) sans refonte : un template = un composant Remotion + des paramètres.</p>
"""
},
{
 "file": "07-generation.html",
 "title": "Génération — progression animée",
 "surface": "Surveiller",
 "why": "L'état change : l'animation porte l'information (étape en cours, durée estimée). Ce n'est pas une barre décorative.",
 "nav": "04-creation-entree.html",
 "body": """
<header class="topbar">
  <a class="btn sm ghost" href="06-templates.html">←</a>
  <div class="brand"><span class="logo-word">Rendu en cours</span></div>
  <span class="spacer"></span>
</header>

<div data-gen class="glass card" style="padding:var(--sp-4)">
  <div class="gen-wrap">
    <div class="orb"><b data-pct>0 %</b></div>
    <div class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <p class="tiny" style="margin:0">Rendu vidéo estimé : environ 2 minutes <span class="placeholder">(durée de démonstration)</span></p>
  </div>

  <div class="steps" style="margin-top:var(--sp-3)">
    <div class="step"><span class="tick">✓</span> Transcription de la note vocale</div>
    <div class="step"><span class="tick">✓</span> Script découpé en 4 scènes</div>
    <div class="step"><span class="tick">✓</span> Application du template « Titre plein cadre »</div>
    <div class="step"><span class="tick">·</span> Rendu des scènes et sous-titres animés</div>
    <div class="step"><span class="tick">·</span> Assemblage, encodage MP4 et dépôt dans votre bibliothèque</div>
  </div>
</div>

<p class="note">Vous pouvez fermer l'application : le rendu continue et vous recevrez une notification dans Motiq.
En cas d'échec, la reprise est proposée avec un message clair et sans recompter le quota (§13).</p>
<div class="row"><a class="btn wide" href="10-bibliotheque.html">Voir dans mes projets</a></div>
"""
},
]
