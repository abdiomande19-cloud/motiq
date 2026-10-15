# MOTIQ — LIVRAISON

**Projet** : Motiq — application SaaS de création de vidéos motion design
**Exercice** : LAB 04 — HACKTUALIZ | ACADEMY-CÔTE D'IVOIRE
**Date** : 15/10/2026

---

## 1. CE QUI EST LIVRÉ

| Élément | État | Où |
|---|---|---|
| Analyse d'entrée + périmètre + arbitrages | livré | `PHASE-1-ETAT.md` |
| Design system (liquid glass, mode clair et sombre) | livré | `maquettes/_build/design-system.css` |
| **13 écrans HTML autonomes** couvrant le parcours complet | livré | `maquettes/01-…` à `maquettes/13-…` |
| Index de navigation des 13 écrans | livré | `maquettes/index.html` |
| Générateur des maquettes (sources reproductibles) | livré | `maquettes/_build/` |
| Captures d'écran des écrans validés | livré | `maquettes/_captures/` |
| **Historique git : 21 commits, un par fonctionnalité et un par écran** | livré | dépôt local `C:\Users\Diomande\Motiq` |
| **Dépôt complet en un seul fichier** (livrable de secours) | livré | `motiq.bundle` (1,98 Mo, vérifié) |

**Conformité au mode de travail demandé** : travail phase par phase, aucun passage à la
phase suivante sans validation, un commit descriptif par fonctionnalité, aucune clé
secrète dans le code, résumé de fin de phase.

## 2. LES 13 ÉCRANS

1. Accueil visiteur et tarifs · 2. Connexion / inscription · 3. Accueil connecté ·
4. Création — choix de l'entrée · 5. Script et scènes · 6. Templates · 7. Génération ·
8. Éditeur et aperçu · 9. Export et partage · 10. Bibliothèque · 11. Kit de marque ·
12. Abonnement · 13. Paramètres du compte

Parcours utilisateur du cahier des charges couvert de bout en bout :
connexion → Créer → texte / images / voix → script en scènes → style →
génération → éditeur → aperçu → export MP4.

## 3. CE QUI RESTE

| Point | Qui | Pourquoi |
|---|---|---|
| Créer le dépôt distant `motiq` et pousser | humain + agent | le jeton actuel n'a pas la permission *Administration* et ne couvre que 2 dépôts existants |
| Identité de commit | humain | les 21 commits sont signés `abdiomande19-cloud <…@users.noreply.github.com>` |
| Phase 2 — développement réel (Supabase, Vercel, Stripe, transcription, rendu vidéo) | Application Builder | dépend d'identifiants de production, non fournis à ce jour |

## 4. POINTS À VALIDER

1. **Les 13 maquettes** : validez l'interface avant tout développement.
2. **Les trois fichiers parasites** `forme`, `la`, `pour` (40-67 octets, artefacts d'une
   erreur de ma part dans un lanceur `.bat`) : retirés du dépôt, encore sur le disque,
   **en attente de votre accord pour suppression** (règle DELETE).
3. **L'identité des commits** : vraie identité ou adresse anonyme GitHub ?

## 5. LIMITES — CE QUI N'EST PAS FAIT ET NE SERA PAS PRÉTENDU

- Aucune ligne de code applicatif : **ce sont des maquettes**, pas l'application.
- Aucun test automatisé, aucune chaîne de build, aucun déploiement.
- Aucune connexion Supabase / Vercel / Stripe : identifiants absents.
- Aucune vérification par un tiers : l'Orchestrateur reste son propre vérificateur sur ce projet.
