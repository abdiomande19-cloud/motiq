# Cahier des charges — Motiq (version complète)

*Application SaaS de création de vidéos motion design, installable sur mobile et ordinateur.*

Nom de l'application : **Motiq**

---

# PARTIE A — CAHIER DES CHARGES D'ORIGINE

## 1. Consignes pour l'agent

- Réponds toujours en français.
- Ne rien inventer : si une information manque, pose la question avant de coder.
- Travaille phase par phase, dans l'ordre du chapitre 14. Ne passe à la phase suivante que lorsque les critères d'acceptation de la phase en cours sont validés.
- Un commit GitHub clair et descriptif par fonctionnalité.
- Aucune clé secrète dans le code du front-end : tout passe par des variables d'environnement côté serveur.
- À la fin de chaque phase, résume en quelques lignes ce qui a été fait, ce qui reste, et les points à valider.

## 2. Contexte et problème

Les créateurs de contenu perdent des heures à monter leurs vidéos courtes. Les outils généralistes d'IA demandent de savoir écrire de bons prompts et d'assembler soi-même le résultat. Il manque un produit fini, rapide, qui transforme une simple idée en vidéo motion design prête à publier.

## 3. Objectif du produit

Permettre à un utilisateur de créer une vidéo motion design professionnelle en quelques minutes, à partir d'une idée écrite, de photos, d'une note vocale ou d'une vidéo, sans compétence technique ni prompt à rédiger.

## 4. Cibles

1. **Cible prioritaire : créateurs de contenu** (TikTok, Reels, Shorts, YouTube).
2. **Cibles secondaires (version 2) : commerces et formateurs.**

L'architecture doit permettre d'ajouter de nouvelles cibles en ajoutant seulement des templates et des formats, sans refonte.

## 5. Différenciation face à un assistant IA généraliste

- Entrée libre : texte, images, note vocale, vidéo.
- Templates de styles motion design prêts à l'emploi.
- Kit de marque (logo, couleurs, polices) appliqué automatiquement.
- Éditeur visuel pour ajuster sans redemander à l'IA.
- Export direct aux formats réseaux sociaux, avec sous-titres animés.
- Bibliothèque de projets et génération en série dans un style cohérent.
- Rendu, stockage et hébergement inclus.

## 6. Fonctionnalités

### 6.1 MVP (obligatoire)

1. Inscription, connexion, déconnexion (email + mot de passe, connexion Google).
2. Création d'un projet à partir de : une idée en texte, des images, ou une note vocale.
3. Transcription de la note vocale, puis génération automatique d'un script découpé en scènes.
4. Choix d'un template motion design parmi une bibliothèque de départ (au moins 8 templates).
5. Génération de la vidéo (format vertical 9:16, durée 15 à 60 secondes) avec sous-titres animés.
6. Éditeur simple : modifier les textes, l'ordre des scènes, les couleurs, la police, la musique.
7. Aperçu avant export, puis export en MP4.
8. Kit de marque : un logo, 2 à 3 couleurs, une police, enregistrés par utilisateur.
9. Bibliothèque : liste des projets, ouverture, duplication, suppression.
10. Abonnements (Gratuit, Pro, Business) avec quotas et paiement.
11. Application installable (PWA) sur mobile et ordinateur.

### 6.2 Version 2 (hors MVP)

- Import d'une vidéo existante pour la monter en motion design.
- Formats 1:1 et 16:9.
- Templates commerces (promos, offres) et formateurs (schémas animés, chapitrage).
- Génération en série (plusieurs vidéos d'un coup).
- Espace équipe, partage et commentaires.
- Bibliothèque de musiques et de sons.

## 7. Parcours utilisateur principal

1. L'utilisateur ouvre l'application et se connecte.
2. Il appuie sur **Créer** et choisit son entrée : écrire, importer des images, ou enregistrer sa voix.
3. L'application transcrit, propose un script en scènes, et l'utilisateur valide ou modifie.
4. Il choisit un style (template).
5. L'application génère la vidéo (écran de progression animé).
6. Il ajuste dans l'éditeur, regarde l'aperçu.
7. Il exporte et télécharge ou partage la vidéo.
8. Le projet apparaît dans la bibliothèque.

## 8. Écrans à réaliser

1. Page d'accueil / présentation (visiteurs non connectés) avec tarifs.
2. Connexion / inscription.
3. Accueil connecté : bouton Créer, projets récents, quota restant.
4. Création : choix de l'entrée (texte, images, voix).
5. Validation du script par scènes.
6. Choix du template (galerie).
7. Génération : progression animée.
8. Éditeur et aperçu.
9. Export et partage.
10. Bibliothèque de projets.
11. Kit de marque.
12. Abonnement et facturation.
13. Paramètres du compte.

## 9. Design et expérience

### 9.1 Style visuel : liquid glass + motion design

- Surfaces en verre translucide : fond flou (backdrop blur), bordures fines lumineuses, reflets doux, ombres légères.
- Dégradés fluides en arrière-plan, formes organiques qui bougent lentement.
- Mode sombre par défaut, mode clair disponible.
- Typographie moderne, lisible, avec une hiérarchie claire.

### 9.2 Motion dans l'interface

- Transitions fluides entre les écrans, effet de ressort sur les boutons et cartes.
- Micro-animations (appui, chargement, succès).
- L'écran de génération est une animation soignée, pas une barre de chargement basique.
- Respect du réglage « réduire les animations » de l'appareil.

### 9.3 Contraintes

- Mobile d'abord (écran étroit), puis adaptation tablette et ordinateur.
- Zones tactiles d'au moins 44 px.
- Contrastes suffisants malgré la transparence du verre.
- Chargement rapide : animations légères, images optimisées.

## 10. Architecture technique

### 10.1 Stack

- **Code et versions : GitHub.**
- **Front-end : PWA** (application web installable) hébergée sur **Vercel**.
- **Back-end : Supabase** : authentification, base de données PostgreSQL, stockage des fichiers, règles d'accès par utilisateur.
- **Paiement : Stripe** (abonnements et webhooks).
- **IA** : API Claude pour le script et les scènes ; service de transcription pour les notes vocales.
- **Moteur vidéo : Remotion** (vidéo en code React). Le rendu tourne sur un service dédié (worker ou rendu cloud), pas dans le navigateur ni sur Vercel. À vérifier : conditions de licence de Remotion pour un usage commercial.

### 10.2 Pipeline de génération

1. Upload des médias vers le stockage.
2. Transcription (si voix).
3. Génération du script et du découpage en scènes (format JSON strict).
4. Association des scènes au template choisi.
5. Mise en file d'attente du rendu.
6. Rendu vidéo par le worker.
7. Enregistrement du MP4 dans le stockage, mise à jour du statut du projet.
8. Notification à l'utilisateur dans l'application.

### 10.3 Modèle de données (tables principales)

- **profiles** : id, email, nom, plan, quota restant.
- **brand_kits** : id, user_id, logo, couleurs, police.
- **projects** : id, user_id, titre, statut, entrée source, script (JSON), template_id, dates.
- **assets** : id, project_id, type (image, audio, vidéo), chemin de stockage.
- **templates** : id, nom, catégorie, format, aperçu, paramètres.
- **render_jobs** : id, project_id, statut (en attente, en cours, terminé, échec), progression, URL du MP4, erreur.
- **subscriptions** : id, user_id, plan, statut Stripe, période en cours.
- **usage** : id, user_id, mois, nombre de rendus, minutes générées.

Chaque table utilisateur est protégée par des règles d'accès : un utilisateur ne voit que ses propres données.

### 10.4 Fonctions serveur principales

- Créer un projet, lancer une génération, suivre le statut d'un rendu.
- Webhook Stripe pour synchroniser les abonnements.
- Vérification des quotas avant chaque génération.

## 11. Abonnements

| Plan | Contenu |
|---|---|
| Gratuit | Quelques vidéos par mois, filigrane, qualité standard |
| Pro | Exports en HD sans filigrane, kit de marque, plus de rendus |
| Business | Haute qualité, rendu prioritaire, équipe (version 2) |

Les quotas exacts sont à définir selon le coût réel d'un rendu et des appels IA.

## 12. Sécurité et conformité

- Aucune clé API dans le front-end.
- Règles d'accès aux données par utilisateur sur toutes les tables.
- Validation des fichiers envoyés (type et taille maximale).
- Limitation du nombre de requêtes par utilisateur.
- Paiements gérés uniquement par Stripe, aucune donnée de carte stockée.
- Politique de confidentialité et conditions d'utilisation à fournir, avec possibilité de supprimer son compte et ses données.

## 13. Performance

- Première page utile en moins de 3 secondes sur mobile.
- Rendu d'une vidéo de 30 secondes en quelques minutes, avec progression visible.
- Reprise possible en cas d'échec de rendu, avec message clair.

## 14. Plan de réalisation par phases

**Phase 1 - Cadrage et maquettes (semaine 1)**
Maquettes des écrans en liquid glass, validation du périmètre MVP.
Critère : tous les écrans du chapitre 8 sont maquettés et validés.

**Phase 2 - Fondations back-end (semaines 2-3)**
Dépôt GitHub, projet Supabase, authentification, tables, stockage, règles d'accès.
Critère : un utilisateur peut s'inscrire, se connecter et ne voit que ses données.

**Phase 3 - Front-end (semaines 3-4)**
PWA installable, design system liquid glass, écrans de base, bibliothèque.
Critère : navigation complète, installation possible sur mobile et ordinateur.

**Phase 4 - Moteur motion design (semaines 4-5)**
Templates Remotion, pipeline voix vers script vers scènes vers vidéo, file de rendu, éditeur.
Critère : un utilisateur obtient un MP4 à partir d'une idée, de photos ou d'une voix.

**Phase 5 - Abonnements (semaine 5)**
Stripe, plans, quotas, filigrane pour le plan gratuit.
Critère : un paiement test débloque le plan Pro et les quotas s'appliquent.

**Phase 6 - Finition et soumission (semaine 6)**
Tests de bout en bout, correction des bugs, démo, présentation du problème résolu.
Critère : le parcours complet du chapitre 7 fonctionne sans erreur sur mobile et ordinateur.

## 15. Critères d'acceptation globaux

- Le parcours complet (idée vers vidéo exportée) fonctionne sur mobile et ordinateur.
- L'application est installable.
- Les quotas et abonnements fonctionnent.
- L'interface respecte le style liquid glass et les animations décrites.
- Aucune donnée d'un utilisateur n'est visible par un autre.
- Aucune clé secrète n'est exposée côté client.

## 16. Phrase de présentation pour la soumission

> Les créateurs perdent des heures à monter leurs vidéos. Motiq leur permet de créer du motion design professionnel à partir d'une idée, d'une photo ou d'une voix, en quelques minutes.

---

# PARTIE B — ÉTAT DU PROJET ET CADRE D'EXÉCUTION

*Ajout de l'Orchestrateur central, 15/10/2026. Vérifié sur disque, pas déclaratif.*

## B.1 Phase 1 — livrée et validée

Le critère du chapitre 14 (« tous les écrans du chapitre 8 maquettés et validés ») est **rempli** :
les 13 écrans existent, ont été audités (zones tactiles, contrastes, mode clair et sombre) et
le donneur d'ordre a validé.

| Écran attendu (chap. 8) | Fichier livré |
|---|---|
| 1. Accueil visiteur + tarifs | `maquettes/01-accueil-visiteur.html` |
| 2. Connexion / inscription | `maquettes/02-connexion-inscription.html` |
| 3. Accueil connecté | `maquettes/03-accueil-connecte.html` |
| 4. Création — choix de l'entrée | `maquettes/04-creation-entree.html` |
| 5. Validation du script par scènes | `maquettes/05-script-scenes.html` |
| 6. Choix du template | `maquettes/06-templates.html` |
| 7. Génération — progression | `maquettes/07-generation.html` |
| 8. Éditeur et aperçu | `maquettes/08-editeur-apercu.html` |
| 9. Export et partage | `maquettes/09-export-partage.html` |
| 10. Bibliothèque de projets | `maquettes/10-bibliotheque.html` |
| 11. Kit de marque | `maquettes/11-kit-marque.html` |
| 12. Abonnement et facturation | `maquettes/12-abonnement.html` |
| 13. Paramètres du compte | `maquettes/13-parametres-compte.html` |

Design system : `maquettes/_build/design-system.css` (liquid glass, mode clair et sombre).
Index de navigation : `maquettes/index.html`. Captures : `maquettes/_captures/`.

## B.2 Dépôt et artefacts

- Dépôt GitHub : https://github.com/abdiomande19-cloud/motiq (branche `main`, public).
- Un commit descriptif par fonctionnalité et par écran.
- Archive de remise : `Motiq-livraison.zip` · dépôt en un fichier : `motiq.bundle`.

## B.3 Environnement technique réellement disponible (vérifié)

| Outil | Version / état |
|---|---|
| python | 3.14.7 (pip 26.2.1) |
| node / npm | v26.7.0 / 11.19.0 |
| git | 2.53.0 |
| ffmpeg, sqlite3, flask, tkinter | présents |
| `gh`, `vercel`, `supabase` (CLI) | **absents** |
| Identifiants disponibles | **GitHub uniquement** (`GITHUB_TOKEN`, `GITHUB_REPO`, `GIT_AUTHOR_*`) |
| Identifiants absents | **Supabase, Vercel, Stripe, API Claude, service de transcription** |

## B.4 Conséquence directe : ce qui est bloqué sans identifiants

- Phase 2 : projet Supabase, authentification réelle, tables, stockage, règles d'accès → **bloquée** (il faut `SUPABASE_ACCESS_TOKEN` + la référence du projet).
- Phase 3 : hébergement PWA sur Vercel → **bloquée** (`VERCEL_TOKEN`).
- Phase 5 : abonnements Stripe → **bloquée** (clé Stripe + webhook).
- Phases 4 : script/scènes et transcription → **bloquées** pour la partie IA (clé Claude, service de transcription) ; le moteur vidéo peut être développé en local, Remotion étant installable par npm.

**Ce qui peut avancer immédiatement sans aucun identifiant** : le socle applicatif qui tourne en
local, le design system transposé des maquettes, la navigation complète, le modèle de données,
le moteur vidéo local et l'export MP4 (ffmpeg est présent).

## B.5 Règles imposées aux agents exécutants

1. Lire ce document **en entier** avant de coder ; il fait foi.
2. Travailler dans `C:\Users\Diomande\Motiq\app\` — ne pas modifier les maquettes validées.
3. Phase par phase, dans l'ordre du chapitre 14 : ne pas passer à la suivante sans que ses critères d'acceptation soient vérifiés, tests réellement exécutés à l'appui.
4. Un commit descriptif par fonctionnalité, en français ; aucune clé dans le front-end.
5. Pousser ainsi, sans jamais écrire le jeton sur disque :
   `GIT_ASKPASS="C:/Users/Diomande/Motiq/outils/askpass.bat" GIT_TERMINAL_PROMPT=0 git -c credential.helper= push origin main`
   **Ne jamais utiliser Git Credential Manager** : sa fenêtre ne peut pas s'afficher depuis un shell d'agent et le push bloque indéfiniment (mesuré : 7 minutes).
6. Interdits sans validation humaine : déploiement en production, suppression de données, achat, envoi externe, publication.
7. Fin de phase : résumé « fait / reste / à valider ».
8. Ne jamais revendiquer un succès sans preuve vérifiable. Un échec documenté vaut mieux qu'un faux succès.
9. Si une information manque : poser la question, ne pas supposer.

## B.6 Limites de l'état actuel — à ne pas confondre avec un produit fini

Aucune ligne de code applicatif n'existe à ce jour : la Phase 1 est **uniquement** la maquette
validée. Aucun test automatisé, aucune chaîne de build, aucun déploiement, aucune intégration
Supabase/Vercel/Stripe/IA n'a été exercé. Le projet ne peut pas être déclaré conforme aux
critères d'acceptation du chapitre 15 tant que les phases 2 à 6 ne sont pas réalisées et vérifiées.
