# Motiq — création de vidéos motion design

Application SaaS qui transforme **une idée, des images ou une note vocale** en vidéo motion
design verticale prête à publier.

Exercice **LAB 04 — HACKTUALIZ | ACADEMY-CÔTE D'IVOIRE**.
Maquettes de phase 1 validées par le client ; ceci est la phase 2 : **l'application réelle**.

---

## Démarrer

```bash
cd app
npm install
npm run dev          # développement, http://localhost:3000
```

Ou, sous Windows, en double-cliquant : `outils/2-demarrer-motiq.bat`
(le dossier des outils est ajouté au `PATH` pour la durée de la fenêtre).

**En production locale** (active l'application installable) :

```bash
npm run build && npm start
```

Aucun identifiant n'est nécessaire pour démarrer : sans configuration Supabase, le dépôt bascule
automatiquement sur une implémentation locale (fichier JSON dans `.donnees/`).

---

## Ce qui fonctionne

| Fonctionnalité | État |
|---|---|
| Inscription, connexion, déconnexion | ✅ session par cookies, routes privées protégées |
| Bibliothèque de projets | ✅ créer, ouvrir, dupliquer, supprimer |
| Script découpé en scènes | ✅ durées, réordonnancement, règle des 15-60 s |
| Choix du template | ✅ 8 styles lus dans la base |
| Apparence du projet | ✅ couleurs, police, musique (héritées du kit de marque) |
| Images du projet | ✅ dépôt et suppression, stockage privé |
| **Aperçu animé** | ✅ scènes jouées avec leur rythme réel |
| Kit de marque | ✅ logo, 2-3 couleurs, police, aperçu fidèle |
| Quotas et consommation | ✅ décomptés par le serveur |
| Réglages du compte | ✅ profil, plan, quota, consommation |
| Accueil visiteur | ✅ accroche, étapes, tarifs, démonstration |
| Application installable (PWA) | ✅ manifeste, icônes, service worker |

## Ce qui n'est PAS branché

Ces éléments sont **absents ou inertes, jamais simulés** :

| Élément | Ce qu'il attend |
|---|---|
| Génération vidéo et export MP4 | une clé d'IA + un moteur de rendu |
| Transcription des notes vocales | un service de transcription |
| Abonnements Gratuit / Pro / Business | les clés Stripe — **les prix, eux, sont fixés** (voir ci-dessous) |
| Connexion Google | une configuration côté Google Cloud |
| Suppression du compte, changement d'email | un envoi d'email de confirmation |

La page **`/etat`** affiche cet état en direct, avec les compteurs lus dans la base.

---

## Tarifs

Source unique : **`lib/tarifs.ts`**. Les prix n'existent qu'à cet endroit — l'accueil et les
maquettes les lisent, ils ne les recopient pas.

| Plan | Prix | Rendus / mois |
|---|---|---|
| Gratuit | 0 F CFA | 3 |
| Pro | **4 900 F CFA** / mois | **10** |
| Business | **9 900 F CFA** / mois | **40** |

Montants et quotas **fixés par le donneur d'ordre** — ils ne sont pas déduits ni estimés. La
maquette de phase 1 les annonçait « à définir » ; c'est remplacé.

**Pourquoi ces quotas et pas davantage.** À 0,30 € le rendu, 20 rendus Pro ne laissaient que
1,47 € de marge sur 7,47 €, et 30 rendus passaient en perte. Les 40 rendus Business laissent
environ 11 € de marge au pire. Le calcul est dans `lib/tarifs.ts`.

Deux points techniques, volontairement :

- **La devise est stockée en entier**, jamais en flottant : 4900 et non 49.00. Un prix qui passe
  par un flottant finit par produire des arrondis faux au moment de facturer.
- **Le renouvellement lit le plan avant de renouveler.** L'ordre compte : renouveler d'abord au
  niveau gratuit priverait un abonné Pro des 10 rendus qu'il paie, et il ne s'en apercevrait qu'en
  tombant à zéro. Vérifié par `outils/prouver-quotas-plans.py`.

---

## Architecture

### Une seule porte vers les données (décision D2)

Aucun écran ne parle jamais directement à une base. Tout passe par un contrat :

```ts
import { depot } from '@/lib/data'
const projets = await depot.listerProjets(userId)
```

| Fichier | Rôle |
|---|---|
| `lib/data/types.ts` | les entités du domaine (chapitre 10.3 du cahier des charges) |
| `lib/data/repository.ts` | le contrat `DepotMotiq`, seule interface connue des écrans |
| `lib/data/local.ts` | implémentation locale sur fichier JSON |
| `lib/data/supabase.ts` | implémentation Supabase (`server-only`) |
| `lib/data/index.ts` | **seul point de bascule** entre les deux |

Ajouter une méthode au contrat oblige les **deux** implémentations à la fournir : un écart est une
erreur de compilation, pas un bug découvert en production.

### Deux régimes de sécurité, volontairement séparés

| Régime | Clé utilisée | RLS |
|---|---|---|
| **Sous l'identité de l'utilisateur** — `obtenirDepotPourJeton(jeton)` | clé **publique** + jeton de l'utilisateur | **appliquée** |
| **Côté serveur** — `obtenirDepot()` | clé **secrète** | contournée |

Le premier est le mode normal dès qu'une session existe : chaque requête arrive dans PostgreSQL
avec l'identité de l'utilisateur, et **c'est la base qui filtre**. Le code applicatif ne peut pas
« oublier » de filtrer — la base refuse d'elle-même.

Le second sert aux opérations qui n'appartiennent pas à l'utilisateur : décompte du quota,
enregistrement de la consommation.

`lib/data/supabase.ts` importe `server-only` : la compilation **échoue** si un composant client
tente de l'importer. La clé secrète ne peut pas fuir dans le navigateur.

### Les règles métier vivent dans la base

Principe appliqué partout : une règle qui n'existe que dans le code applicatif se contourne par une
écriture directe. Chaque règle est donc aussi une contrainte PostgreSQL.

| Règle | Où |
|---|---|
| 15 à 60 secondes, au moins une scène | contrainte `projects_duree_valide` |
| 2 ou 3 couleurs, format `#RRGGBB` | contrainte `projects_apparence_valide` (vérifie **chaque** couleur) |
| Le plan, le quota et l'email ne se modifient pas depuis l'application | déclencheur `trg_proteger_profil` |
| Le décompte du quota est réservé au serveur | fonction `decrementer_quota`, exécution révoquée pour `anon` et `authenticated` |
| Chacun ne voit que ses lignes | RLS sur les 8 tables + politiques sur le stockage |

---

## Base de données

8 tables, RLS activée sur **chacune**, 18 politiques, un bucket de stockage privé.

```
profiles  brand_kits  templates  projects  assets  render_jobs  subscriptions  usage
```

Les migrations sont dans **`app/supabase/migrations/`**, numérotées et commentées : chaque fichier
explique **pourquoi** la migration existe, pas seulement ce qu'elle fait.

| Fichier | Objet |
|---|---|
| `0001` | schéma initial : 8 tables, RLS, politiques, stockage, déclencheurs |
| `0002` | `user_id` prend `auth.uid()` par défaut |
| `0003` | les règles métier passent dans la base |
| `0004` | colonne `apparence` (couleurs, police, musique) |
| `0005` | **empêche un utilisateur de s'offrir un plan payant** |
| `0006` | décompte du quota, réservé au serveur |
| `0007` | **le quota se renouvelle chaque mois** (sinon le plan gratuit se bloquait à vie) |

Application d'une migration : `python outils/api-supabase.py sql <ref> <fichier.sql>`

---

## Sécurité — vérifiée, pas supposée

Chaque affirmation ci-dessous a été **testée en écrivant hors de l'interface**, avec les jetons
de deux comptes réels :

```
Cloisonnement     A voit ses lignes · B voit 0 · visiteur voit 0
Usurpation        B écrivant au nom de A                          -> 403
Modification      B modifiant la ligne de A                       -> 0 ligne touchée
Stockage          B déposant ou lisant dans le dossier de A       -> refusé
Plan              utilisateur s'offrant « business »              -> 403
Quota             utilisateur augmentant son quota                -> 403
Décompte          utilisateur appelant la fonction de décompte    -> permission denied
```

**Un code HTTP ne suffit jamais à conclure.** Un `PATCH` refusé par RLS répond `200` avec un corps
vide : il faut **relire la donnée** pour savoir ce qui s'est réellement passé.

Le service worker ne met **jamais** en cache les pages privées : après une déconnexion, l'occupant
suivant de la machine ne peut pas voir la page de quelqu'un d'autre.

`.env.local` est ignoré par git (vérifié avec `git check-ignore`). Aucune clé secrète ne porte le
préfixe `NEXT_PUBLIC_`.

---

## Outils

Le dossier `outils/` contient les scripts qui ont servi à **prouver** chaque affirmation :
vérification du schéma, preuves de cloisonnement, de stockage, de quota, de la faille de plan,
fabrication des icônes, connexion à Supabase sans CLI.

Ces scripts sont conservés parce qu'ils constituent la démonstration : ils peuvent être relancés.

### Tout re-vérifier en une commande

```bash
python outils/verifier-tout.py
```

Relance les **11 contrôles** et rend un verdict. Dernière exécution : **11 / 11 en 36 secondes**.

```
OK   Schema : 8 tables, RLS, politiques
OK   Fichier de secrets lisible
OK   Cloisonnement entre comptes
OK   Regles metier : duree, template
OK   Stockage prive
OK   Aller-retour d'un fichier, octet par octet
OK   Apparence du projet
OK   Medias : suppression croisee
OK   Protection du plan payant
OK   Quota : decompte reserve au serveur
OK   Quota : renouvellement mensuel
```

Chaque contrôle écrit **hors de l'interface**, avec les jetons de deux comptes réels : il ne peut
pas passer grâce à une protection qui n'existerait que dans le code applicatif.

---

## Notes de développement

- **Next.js 16** : `params` et `searchParams` sont des `Promise` (`await params`) ; l'ancien
  `middleware.ts` s'appelle `proxy.ts`.
- `.next` est exclu de la vérification des types : un fichier généré tronqué faisait échouer la
  compilation.
- L'application installable (service worker) ne s'enregistre qu'en **production**. En
  développement, il mettrait en cache les fichiers de compilation.
- Les maquettes validées de la phase 1 sont servies **telles quelles** dans `public/ecrans/`, sans
  aucune modification : elles restent la référence visuelle.
