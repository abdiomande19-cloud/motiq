/**
 * Motiq — types du domaine.
 *
 * Ils suivent exactement le modele de donnees du cahier des charges (chapitre 10.3).
 * Ce fichier est la reference unique : les implementations (locale aujourd'hui,
 * Supabase demain) doivent s'y conformer.
 */

// ---------------------------------------------------------------- Enumerations

/** Plans d'abonnement (cahier des charges, chapitre 11). */
export type Plan = 'gratuit' | 'pro' | 'business'

/** Cycle de vie d'un projet. */
export type StatutProjet = 'brouillon' | 'script_valide' | 'en_generation' | 'pret' | 'echec'

/** Entree choisie par l'utilisateur pour creer son projet (6.1 point 2). */
export type EntreeSource = 'texte' | 'images' | 'voix' | 'video'

/** Nature d'un media rattache a un projet. */
export type TypeAsset = 'image' | 'audio' | 'video' | 'logo'

/** Etats d'un rendu (cahier des charges, chapitre 10.3 : render_jobs). */
export type StatutRendu = 'en_attente' | 'en_cours' | 'termine' | 'echec'

/** Souverainete du plan sur le filigrane (plan gratuit uniquement). */
export const FILIGRANE_PAR_PLAN: Record<Plan, boolean> = {
  gratuit: true,
  pro: false,
  business: false,
}

// ---------------------------------------------------------------- Entites

/** profiles : id, email, nom, plan, quota restant. */
export interface Profil {
  id: string
  email: string
  nom: string
  plan: Plan
  /** Nombre de rendus encore disponibles ce mois-ci. */
  quotaRestant: number
  creeLe: string
  majLe: string
}

/** brand_kits : id, user_id, logo, couleurs, police. */
export interface KitMarque {
  id: string
  userId: string
  /** Chemin de stockage du logo, ou null si aucun. */
  logo: string | null
  /** 2 a 3 couleurs, format hexa (#RRGGBB). */
  couleurs: string[]
  police: string
  creeLe: string
  majLe: string
}

/** Une scene du script genere (6.1 point 3). */
export interface Scene {
  /** Numero d'ordre, a partir de 1. */
  ordre: number
  /** Texte affiche a l'ecran (et sous-titre anime). */
  texte: string
  /** Duree de la scene, en secondes. */
  dureeSecondes: number
  /** Indication de mise en scene pour le moteur de rendu. */
  note?: string
}

/** Script complet, decoupe en scenes. Stocke en JSON dans la table projects. */
export interface Script {
  titre: string
  scenes: Scene[]
  /** Duree totale en secondes — doit rester entre 15 et 60 (6.1 point 5). */
  dureeTotaleSecondes: number
}

/** Reglages visuels d'un projet. Null = le projet herite du kit de marque. */
export interface Apparence {
  /** 2 ou 3 couleurs, format hexa (#RRGGBB). */
  couleurs: string[]
  police: string
  /** Chemin de la musique dans le stockage, ou null si aucune. */
  musique: string | null
}

/** projects : id, user_id, titre, statut, entree source, script, template, dates. */
export interface Projet {
  id: string
  userId: string
  titre: string
  statut: StatutProjet
  entreeSource: EntreeSource
  /** Idee ecrite par l'utilisateur, si l'entree est de type texte. */
  idee: string | null
  script: Script | null
  templateId: string | null
  /** Couleurs, police et musique. Null tant que rien n'a ete choisi. */
  apparence: Apparence | null
  creeLe: string
  majLe: string
}

/** assets : id, project_id, type, chemin de stockage. */
export interface Asset {
  id: string
  projetId: string
  type: TypeAsset
  /** Chemin dans le stockage (bucket Supabase demain). */
  chemin: string
  tailleOctets: number | null
  creeLe: string
}

/** templates : id, nom, categorie, format, apercu, parametres. */
export interface Template {
  id: string
  nom: string
  categorie: string
  /** Format de sortie — le MVP est vertical 9:16 (6.1 point 5). */
  format: '9:16' | '1:1' | '16:9'
  apercu: string
  /** Parametres libres du template (couleurs, rythme, transitions). */
  parametres: Record<string, unknown>
}

/** render_jobs : id, project_id, statut, progression, url du mp4, erreur. */
export interface Rendu {
  id: string
  projetId: string
  statut: StatutRendu
  /** Progression de 0 a 100. */
  progression: number
  urlMp4: string | null
  erreur: string | null
  creeLe: string
  majLe: string
}

/** subscriptions : id, user_id, plan, statut Stripe, periode en cours. */
export interface Abonnement {
  id: string
  userId: string
  plan: Plan
  /** Identifiant d'abonnement cote Stripe, ou null tant qu'aucun paiement. */
  statutStripe: string | null
  periodeDebut: string
  periodeFin: string
}

/** usage : id, user_id, mois, nombre de rendus, minutes generees. */
export interface Usage {
  id: string
  userId: string
  /** Mois au format AAAA-MM. */
  mois: string
  nombreRendus: number
  minutesGenerees: number
}
