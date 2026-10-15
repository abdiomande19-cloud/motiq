/**
 * Motiq — contrat d'acces aux donnees (decision D2).
 *
 * Toute l'application parle a cette interface, jamais directement a une base.
 * Aujourd'hui : implementation locale (fichier JSON) — le socle tourne sans
 * aucun identifiant. Demain : implementation Supabase, sans toucher aux ecrans.
 *
 * Regle de securite (cahier des charges 12) : chaque methode qui rend des
 * donnees utilisateur exige le userId. L'implementation Supabase s'appuiera
 * sur les regles RLS ; l'implementation locale filtre explicitement.
 */

import type {
  Abonnement,
  Asset,
  KitMarque,
  Profil,
  Projet,
  Rendu,
  Template,
  Usage,
} from './types'

/** Donnees necessaires pour ouvrir un projet. */
export interface NouveauProjet {
  userId: string
  titre: string
  entreeSource: Projet['entreeSource']
  idee?: string | null
}

/** Donnees necessaires pour creer un rendu. */
export interface NouveauRendu {
  projetId: string
  /** Le plan sert a decider du filigrane (plan gratuit). */
  plan: Profil['plan']
}

/** Filtres de liste pour la bibliotheque de projets (6.1 point 9). */
export interface FiltresProjets {
  statut?: Projet['statut']
  limite?: number
}

/**
 * Contrat complet. Volontairement limite au perimetre MVP : tout ce qui n'est
 * pas encore implemente est declare ici et leve une erreur explicite, jamais
 * une valeur inventee.
 */
export interface DepotMotiq {
  /** Nom de l'implementation active, pour l'affichage et le diagnostic. */
  readonly nom: string

  // --- Profils ---------------------------------------------------------
  obtenirProfil(userId: string): Promise<Profil | null>
  creerProfil(profil: Omit<Profil, 'creeLe' | 'majLe'>): Promise<Profil>
  mettreAJourPlan(userId: string, plan: Profil['plan']): Promise<Profil>

  // --- Projets ---------------------------------------------------------
  listerProjets(userId: string, filtres?: FiltresProjets): Promise<Projet[]>
  obtenirProjet(userId: string, projetId: string): Promise<Projet | null>
  creerProjet(nouveau: NouveauProjet): Promise<Projet>
  mettreAJourProjet(
    userId: string,
    projetId: string,
    changements: Partial<Pick<Projet, 'titre' | 'statut' | 'script' | 'templateId'>>,
  ): Promise<Projet>
  dupliquerProjet(userId: string, projetId: string): Promise<Projet>
  supprimerProjet(userId: string, projetId: string): Promise<void>

  // --- Medias ----------------------------------------------------------
  listerAssets(userId: string, projetId: string): Promise<Asset[]>
  enregistrerAsset(asset: Omit<Asset, 'creeLe'>): Promise<Asset>

  // --- Templates -------------------------------------------------------
  listerTemplates(): Promise<Template[]>
  obtenirTemplate(templateId: string): Promise<Template | null>

  // --- Rendus ----------------------------------------------------------
  creerRendu(nouveau: NouveauRendu): Promise<Rendu>
  obtenirRendu(userId: string, renduId: string): Promise<Rendu | null>
  majProgressionRendu(renduId: string, progression: number, statut: Rendu['statut']): Promise<Rendu>

  // --- Kit de marque ---------------------------------------------------
  obtenirKitMarque(userId: string): Promise<KitMarque | null>
  enregistrerKitMarque(kit: Omit<KitMarque, 'creeLe' | 'majLe'>): Promise<KitMarque>

  // --- Abonnements et usage --------------------------------------------
  obtenirAbonnement(userId: string): Promise<Abonnement | null>
  enregistrerAbonnement(abo: Omit<Abonnement, 'id'>): Promise<Abonnement>
  obtenirUsage(userId: string, mois: string): Promise<Usage | null>
  incrementerUsage(userId: string, mois: string, minutes: number): Promise<Usage>
}

/** Erreur levee quand une implementation n'a pas encore la fonctionnalite. */
export class NonImplementeError extends Error {
  constructor(methode: string, implementation: string) {
    super(
      `Motiq : « ${methode} » n'est pas encore implemente dans « ${implementation} ». ` +
        `Aucune valeur n'est inventee — voir le plan de phases.`,
    )
    this.name = 'NonImplementeError'
  }
}
