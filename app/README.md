# Motiq — application

Application de création de vidéos motion design. Exercice **LAB 04 — HACKTUALIZ | ACADEMY-CÔTE D'IVOIRE**.

Ce dossier contient le **socle applicatif** (phase 2 du cahier des charges, à la racine du dépôt).

---

## Démarrer en local

```bash
cd app
npm install          # déjà fait
npm run dev
```

Puis ouvre **http://localhost:3000**

Aucun identifiant n'est nécessaire : le socle démarre sur une couche de données locale.

---

## Ce que contient ce socle

| Élément | Où | État |
|---|---|---|
| Coquille de navigation | `app/layout.tsx` | ✅ |
| Les 13 écrans validés (phase 1) | `public/ecrans/` | ✅ servis tels quels, non modifiés |
| Galerie des écrans | `app/ecrans/page.tsx` | ✅ |
| Page d'état du projet | `app/etat/page.tsx` | ✅ |
| Types du domaine | `lib/data/types.ts` | ✅ conformes au chapitre 10.3 |
| Contrat d'accès aux données | `lib/data/repository.ts` | ✅ |
| Implémentation locale | `lib/data/local.ts` | ✅ fichier JSON dans `.donnees/` |
| Choix de l'implémentation | `lib/data/index.ts` | ✅ point de bascule unique vers Supabase |
| Manifeste PWA | `public/manifest.webmanifest` | 🟡 posé, installation à finaliser |

---

## La règle d'architecture (décision D2)

**Aucun écran ne parle jamais directement à une base.** Tout passe par le contrat :

```ts
import { depot } from '@/lib/data'

const projets = await depot.listerProjets(userId)
```

Aujourd'hui, `depot` est l'implémentation locale (fichier JSON). Quand les
identifiants Supabase arriveront, **seul `lib/data/index.ts` changera** — les
écrans et les routes resteront identiques.

---

## Ce qui n'est PAS encore branché

- **Authentification** (email + Google) → attend Supabase
- **Stockage des médias** (images, audio, vidéo) → attend Supabase Storage
- **Transcription des notes vocales** → attend un service de transcription
- **Génération du script** par IA → attend une clé Anthropic
- **Rendu vidéo** → attend un worker Remotion (le cahier des charges interdit le rendu dans le navigateur)
- **Abonnements et quotas** → attend Stripe

Ces éléments ne sont **pas simulés**. Ils sont visibles sur la page `/etat`.

---

## Sécurité

- `.env.local` est **ignoré par git** (vérifié avec `git check-ignore`).
- Aucune clé secrète ne doit jamais être écrite dans un composant client.
- Les clés serveur ne doivent jamais porter le préfixe `NEXT_PUBLIC_`.
