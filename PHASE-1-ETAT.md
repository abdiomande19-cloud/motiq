# Motiq — Phase 1 : état et points à valider

**Projet :** Motiq (SaaS de vidéos motion design) · **Phase :** 1/6 — Cadrage et maquettes
**Fait par :** Central Orchestrator Agent · **Date :** 14/10/2026 · **Statut : LIVRÉ, en attente de validation humaine**

---

## Ce qui a été fait

- **13 écrans maquettés** (les 13 du chapitre 8) + un index de navigation, dans
  `C:\Users\Diomande\Motiq\maquettes\`.
- **Design system « liquid glass »** conforme au §9.1 : verre translucide (flou, bord lumineux, relief interne, ombres),
  dégradés fluides, formes organiques animées, **mode sombre par défaut**, mode clair disponible.
- **Chaque écran est un fichier HTML autonome** (CSS + JS inlinés, aucune dépendance réseau) : ouvrable seul, sans serveur.
- **Le parcours du chapitre 7 est cliquable** : 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.
- **Chaque écran assume une surface délibérée** (Décider, Comparer, Opérer, Explorer, Configurer, Surveiller,
  Commander/Inspecter) — c'est ce qui évite 13 écrans identiques. Tableau complet dans `index.html`.
- **Générateur versionné** dans `_build/` (`design-system.css`, `app.js`, `screens_*.py`, `build.py`) : les maquettes se
  régénèrent en une commande après correction.

## Ce qui a été vérifié — et non simplement affirmé

| Contrôle | Méthode | Résultat |
|---|---|---|
| Rendu réel | navigateur, 13 écrans ouverts | ✅ aucune erreur bloquante |
| **Zones tactiles ≥ 44 px (§9.3)** | mesure programmatique, **2 passes** | ✅ **0 écart** (3 liens en ligne dans une phrase, exception WCAG 2.5.5) |
| Animation de génération (§9.2) | observation de la progression | ✅ 1 % → 64 % en 3 s, 3/5 étapes validées |
| Thème sombre par défaut + bascule | clic réel + relecture du DOM | ✅ `dark` → `light`, choix mémorisé |
| Groupes de choix (chips, templates) | clic réel | ✅ état exclusif correct |

**Défauts trouvés par ces contrôles — et corrigés :**
1. Petits boutons à **36 px** et *chips* à **34 px** → portés à 44 px.
2. `select` de l'éditeur bridé à **38 px** → corrigé.
3. **Mode clair trop délavé** (le verre se confondait avec le fond) → verre plus opaque, bordures et ombres renforcées, fond calmé.
4. Placeholder de prix « — € » lu comme un bug d'affichage, et « 0 € » dupliqué sur le plan Gratuit → remplacés par « À définir » et « Toujours gratuit ».

## Ce qui reste

- **Votre validation** : c'est le critère d'acceptation de la Phase 1 (« tous les écrans du chapitre 8 sont maquettés et validés »).
- **Arbitrages** : prix et quotas réels · liste définitive des 8 templates · langues de l'interface · sort du partage direct vers les réseaux.
- **Phase 2 (fondations back-end) : bloquée** — aucun identifiant GitHub / Supabase / Vercel / Stripe / IA disponible.
  Elle ne peut pas commencer, et je ne la déclarerai pas commencée avant.

## Points à valider

1. Le style **liquid glass** tel qu'incarné (sombre **et** clair) — c'est le bon degré de transparence ?
2. La **cible tactile** et la densité : assez aérés, ou plus compacts ?
3. Les **13 surfaces** : l'écran 1 (hero) et l'écran 7 (animation) sont les deux partis pris les plus visibles.
4. Le **ton du contenu** de démonstration (voir les mentions « à définir », « exemple »).
5. Le **partage direct** vers TikTok/Reels/Shorts : version 1 en export seul, ou dès le MVP ?

## Réserves honnêtes

- Ce sont des **maquettes statiques**, pas l'application : aucune donnée réelle, aucune authentification, aucun rendu vidéo.
- Les valeurs marquées « à définir » ou « exemple » ne sont **pas** des décisions — elles attendent les vôtres.
- Le **mode clair** et les points de rupture tablette/ordinateur ont été contrôlés mécaniquement (bascule, mesures)
  et visuellement sur 3 écrans seulement : **je ne les déclare pas validés sur les 13**.
- Le coût du projet ne dépend pas de cette phase : les points qui coûtent (licence Remotion, worker de rendu, appels IA,
  codecs) restent ouverts — voir `motiq_analyse_entree_projet.md`, section 2.
