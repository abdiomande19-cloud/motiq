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
  Plan,
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
  /**
   * Met a jour les champs modifiables d'un profil.
   *
   * Remplace l'ancienne `mettreAJourPlan` : un utilisateur doit pouvoir
   * corriger son nom, pas seulement changer de plan. Les champs autorises sont
   * volontairement limites — le quota restant, lui, ne se modifie pas depuis
   * l'interface.
   */
  mettreAJourProfil(
    userId: string,
    changements: Partial<Pick<Profil, 'nom' | 'plan'>>,
  ): Promise<Profil>

  /**
   * Decompte le quota d'un rendu.
   *
   * Cette operation appartient au SERVEUR : un utilisateur ne doit pas pouvoir
   * augmenter son propre quota. La migration 0005 le lui interdit deja cote
   * base ; l'implementation Supabase passe par une fonction reservee au role
   * `service_role`, donc la cle secrete.
   */
  decrementerQuota(userId: string, nombre?: number): Promise<Profil>

  /**
   * Renouvelle le quota s'il date d'un mois precedent, puis rend le profil.
   *
   * A appeler AVANT toute verification de quota : sans cela, un utilisateur du
   * plan gratuit resterait bloque pour toujours apres ses premiers rendus, alors
   * que le cahier des charges promet « quelques videos par mois ».
   *
   * Operation serveur, comme le decompte : un utilisateur ne doit pas pouvoir
   * se renouveler son quota a volonte.
   */
  assurerQuotaDuMois(userId: string, quotaParDefaut: number): Promise<Profil>

  /**
   * Active un abonnement APRES verification du paiement.
   *
   * Fait trois choses en une transaction : change le plan, remet le quota du
   * mois a la dotation du nouveau plan, et enregistre l'abonnement. Cet ordre
   * evite l'etat intermediaire ou le client a paye mais reste bloque a 3 rendus.
   *
   * Operation serveur : un utilisateur ne doit jamais pouvoir s'ecrire un
   * abonnement.
   */
  activerAbonnement(params: {
    userId: string
    plan: Plan
    reference: string
    statut: string
    planCode: string | null
    codeClient: string | null
  }): Promise<void>

  /**
   * Resilit un abonnement et retombe au plan gratuit s'il ne reste rien
   * d'actif.
   *
   * Prend le code client et l'email — PAS l'identifiant utilisateur : les
   * evenements de resiliation de Paystack ne les transportent pas, et une
   * fonction qui les exigerait serait inutilisable au moment ou elle sert.
   */
  desactiverAbonnement(params: {
    codeClient: string | null
    email: string | null
    statut: string
  }): Promise<void>

  // --- Projets ---------------------------------------------------------
  listerProjets(userId: string, filtres?: FiltresProjets): Promise<Projet[]>
  obtenirProjet(userId: string, projetId: string): Promise<Projet | null>
  creerProjet(nouveau: NouveauProjet): Promise<Projet>
  mettreAJourProjet(
    userId: string,
    projetId: string,
    changements: Partial<Pick<Projet, 'titre' | 'statut' | 'script' | 'templateId' | 'apparence'>>,
  ): Promise<Projet>
  dupliquerProjet(userId: string, projetId: string): Promise<Projet>
  supprimerProjet(userId: string, projetId: string): Promise<void>

  // --- Medias ----------------------------------------------------------
  listerAssets(userId: string, projetId: string): Promise<Asset[]>
  enregistrerAsset(asset: Omit<Asset, 'creeLe'>): Promise<Asset>
  /**
   * Supprime un media et rend ce qui a ete supprime (null s'il n'existe pas ou
   * n'appartient pas a cet utilisateur). Rendre l'objet permet a l'appelant de
   * retirer aussi le fichier du stockage, sans lecture supplementaire.
   */
  supprimerAsset(userId: string, assetId: string): Promise<Asset | null>

  // --- Templates -------------------------------------------------------
  listerTemplates(): Promise<Template[]>
  obtenirTemplate(templateId: string): Promise<Template | null>

  // --- Rendus ----------------------------------------------------------
  creerRendu(nouveau: NouveauRendu): Promise<Rendu>
  obtenirRendu(userId: string, renduId: string): Promise<Rendu | null>
  /** Tous les rendus d'un projet, du plus recent au plus ancien. */
  listerRendus(userId: string, projetId: string): Promise<Rendu[]>
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
