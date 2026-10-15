# MOTIQ — LIVRAISON

**Projet** : Motiq — application SaaS de création de vidéos motion design
**Exercice** : LAB 04 — HACKTUALIZ | ACADEMY-CÔTE D'IVOIRE
**Date** : 15/10/2026

---

## 1. CE QUI EST LIVRÉ

| Élément | État | Où |
|---|---|---|
| **Dépôt GitHub `motiq`** — historique complet poussé et vérifié | **livré** | https://github.com/abdiomande19-cloud/motiq |
| Analyse d'entrée + périmètre + arbitrages | livré | `PHASE-1-ETAT.md` |
| Design system (liquid glass, mode clair et sombre) | livré | `maquettes/_build/design-system.css` |
| **13 écrans HTML autonomes** couvrant le parcours complet | livré | `maquettes/01-…` à `maquettes/13-…` |
| Index de navigation des 13 écrans | livré | `maquettes/index.html` |
| Générateur des maquettes (sources reproductibles) | livré | `maquettes/_build/` |
| Captures d'écran des écrans validés | livré | `maquettes/_captures/` |
| **Historique git : un commit par fonctionnalité et un par écran** | livré | dépôt local `C:\Users\Diomande\Motiq` |
| **Dépôt complet en un seul fichier** (livrable de secours) | livré | `motiq.bundle` (1,98 Mo, vérifié) |
| **Archive de remise** | livré | `Motiq-livraison.zip` (2,09 Mo) |

**Preuve du dépôt distant** : le commit local et la référence distante portent le même
SHA — `8f4d29baa02a267117b4da8de296b0e050d764fe` — et l'API GitHub confirme l'historique
complet de la branche `main`.

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
| Identité de commit | humain | les commits sont signés `abdiomande19-cloud <…@users.noreply.github.com>` (adresse anonyme GitHub) |
| Sort du jeton GitHub de livraison | humain | portée `repo` (écriture complète) valable 7 jours : à révoquer si vous n'en avez plus besoin |
| Phase 2 — développement réel (Supabase, Vercel, Stripe, transcription, rendu vidéo) | Application Builder | dépend d'identifiants de production, non fournis à ce jour |

## 4. POINTS À VALIDER

1. **Les 13 maquettes** : validez l'interface avant tout développement.
2. **Visibilité du dépôt** : `motiq` a été créé **PUBLIC** (et non privé comme prévu).
   À basculer en privé si le projet ne doit pas être visible — *Settings → General →
   Danger Zone → Change visibility*.
3. **L'identité des commits** : vraie identité ou adresse anonyme GitHub ?
4. **Les trois fichiers parasites** `forme`, `la`, `pour` (artefacts d'une erreur de
   l'agent dans un lanceur `.bat`) : **supprimés** — du disque, du commit courant et de
   tout l'historique — après votre accord. Le lanceur `.bat` est corrigé et re-committé.

## 5. LIMITES — CE QUI N'EST PAS FAIT ET NE SERA PAS PRÉTENDU

- Aucune ligne de code applicatif : **ce sont des maquettes**, pas l'application.
- Aucun test automatisé, aucune chaîne de build, aucun déploiement.
- Aucune connexion Supabase / Vercel / Stripe : identifiants absents.
- Aucune vérification par un tiers : l'Orchestrateur reste son propre vérificateur sur ce projet.
