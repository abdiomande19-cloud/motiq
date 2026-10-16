/**
 * Motiq — implementation Supabase du depot de donnees (decision D2).
 *
 * Ce fichier est le SEUL endroit qui connait Supabase. Les ecrans continuent
 * d'appeler `depot.listerProjets(...)` sans savoir ce qu'il y a derriere.
 *
 * SECURITE — deux regimes, volontairement separes :
 *
 *  1. Sans jeton utilisateur : on utilise la cle secrete du projet. Ce client
 *     ne doit JAMAIS etre importe cote navigateur (la cle n'a pas le prefixe
 *     NEXT_PUBLIC_ : Next.js la retire donc de tout bundle client).
 *     En contrepartie, cette cle contourne RLS — c'est l'usage prevu pour le
 *     serveur, et la raison pour laquelle ce fichier est marque « server only ».
 *
 *  2. Avec un jeton utilisateur (plus tard, a la phase 3) : on passe ce jeton,
 *     et c'est RLS qui filtre. Chaque requete ne voit alors que les donnees du
 *     proprietaire. C'est le mode a privilegier des que l'authentification
 *     existe.
 *
 * Les colonnes PostgreSQL sont en snake_case ; le domaine est en camelCase.
 * Les conversions sont faites ici, et nulle part ailleurs.
 */

import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Abonnement,
  Asset,
  Avis,
  KitMarque,
  MonAvis,
  Plan,
  Profil,
  Projet,
  Rendu,
  Script,
  Statistiques,
  Template,
  Usage,
} from './types'
import type { DepotMotiq, FiltresProjets, NouveauProjet, NouveauRendu } from './repository'

// ------------------------------------------------------------------ lignes brutes

interface LigneProfil {
  id: string
  email: string
  nom: string
  plan: Profil['plan']
  quota_restant: number
  quota_mois: string
  est_moderateur: boolean
  cree_le: string
  maj_le: string
}

interface LigneKit {
  id: string
  user_id: string
  logo: string | null
  couleurs: string[]
  police: string
  cree_le: string
  maj_le: string
}

interface LigneTemplate {
  id: string
  nom: string
  categorie: string
  format: Template['format']
  apercu: string
  parametres: Record<string, unknown>
}

interface LigneProjet {
  id: string
  user_id: string
  titre: string
  statut: Projet['statut']
  entree_source: Projet['entreeSource']
  idee: string | null
  script: Script | null
  template_id: string | null
  apparence: Projet['apparence']
  cree_le: string
  maj_le: string
}

interface LigneAsset {
  id: string
  projet_id: string
  type: Asset['type']
  chemin: string
  taille_octets: number | null
  cree_le: string
}

interface LigneRendu {
  id: string
  projet_id: string
  statut: Rendu['statut']
  progression: number
  url_mp4: string | null
  erreur: string | null
  cree_le: string
  maj_le: string
}

interface LigneAbonnement {
  id: string
  user_id: string
  plan: Abonnement['plan']
  statut_paiement: string | null
  fournisseur: string
  reference: string | null
  plan_code: string | null
  code_client: string | null
  periode_debut: string
  periode_fin: string | null
  annule_le: string | null
}

interface LigneUsage {
  id: string
  user_id: string
  mois: string
  nombre_rendus: number
  minutes_generees: number
}

// ------------------------------------------------------------------ conversions

const versProfil = (l: LigneProfil): Profil => ({
  id: l.id,
  email: l.email,
  nom: l.nom,
  plan: l.plan,
  quotaRestant: l.quota_restant,
  quotaMois: l.quota_mois,
  estModerateur: Boolean(l.est_moderateur),
  creeLe: l.cree_le,
  majLe: l.maj_le,
})

const versKit = (l: LigneKit): KitMarque => ({
  id: l.id,
  userId: l.user_id,
  logo: l.logo,
  couleurs: l.couleurs ?? [],
  police: l.police,
  creeLe: l.cree_le,
  majLe: l.maj_le,
})

const versTemplate = (l: LigneTemplate): Template => ({
  id: l.id,
  nom: l.nom,
  categorie: l.categorie,
  format: l.format,
  apercu: l.apercu,
  parametres: l.parametres ?? {},
})

const versProjet = (l: LigneProjet): Projet => ({
  id: l.id,
  userId: l.user_id,
  titre: l.titre,
  statut: l.statut,
  entreeSource: l.entree_source,
  idee: l.idee,
  script: l.script,
  templateId: l.template_id,
  apparence: l.apparence ?? null,
  creeLe: l.cree_le,
  majLe: l.maj_le,
})

const versAsset = (l: LigneAsset): Asset => ({
  id: l.id,
  projetId: l.projet_id,
  type: l.type,
  chemin: l.chemin,
  tailleOctets: l.taille_octets,
  creeLe: l.cree_le,
})

const versRendu = (l: LigneRendu): Rendu => ({
  id: l.id,
  projetId: l.projet_id,
  statut: l.statut,
  progression: l.progression,
  urlMp4: l.url_mp4,
  erreur: l.erreur,
  creeLe: l.cree_le,
  majLe: l.maj_le,
})

/** Convertit une ligne `reviews` en objet du domaine. */
const versMonAvis = (l: Record<string, unknown>): MonAvis => ({
  id: String(l.id),
  note: Number(l.note),
  commentaire: String(l.commentaire),
  statut: (l.statut as MonAvis['statut']) ?? 'publie',
  motifMasquage: l.motif_masquage ? String(l.motif_masquage) : null,
  creeLe: String(l.cree_le),
  majLe: String(l.maj_le ?? l.cree_le),
})

const versAbonnement = (l: LigneAbonnement): Abonnement => ({
  id: l.id,
  userId: l.user_id,
  plan: l.plan,
  statutPaiement: l.statut_paiement,
  fournisseur: l.fournisseur,
  reference: l.reference,
  planCode: l.plan_code,
  codeClient: l.code_client,
  periodeDebut: l.periode_debut,
  periodeFin: l.periode_fin,
  annuleLe: l.annule_le,
})

const versUsage = (l: LigneUsage): Usage => ({
  id: l.id,
  userId: l.user_id,
  mois: l.mois,
  nombreRendus: l.nombre_rendus,
  minutesGenerees: Number(l.minutes_generees),
})

/** Transforme une erreur Supabase en erreur explicite (jamais silencieuse). */
function verifier(erreur: { message: string } | null, quoi: string): void {
  if (erreur) {
    throw new Error(`Motiq / Supabase — ${quoi} : ${erreur.message}`)
  }
}

// ------------------------------------------------------------------ implementation

export class DepotSupabase implements DepotMotiq {
  readonly nom = 'supabase (projet motiq, eu-west-1)'

  private readonly client: SupabaseClient

  constructor(
    url: string,
    cle: string,
    /** Jeton d'acces de l'utilisateur : quand il est fourni, RLS s'applique. */
    private readonly jetonUtilisateur?: string,
  ) {
    this.client = createClient(url, cle, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: jetonUtilisateur
        ? { headers: { Authorization: `Bearer ${jetonUtilisateur}` } }
        : {},
    })
  }

  // ---------------------------------------------------------------- profils
  async obtenirProfil(userId: string): Promise<Profil | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    verifier(error, 'lecture du profil')
    return data ? versProfil(data as LigneProfil) : null
  }

  async creerProfil(profil: Omit<Profil, 'creeLe' | 'majLe'>): Promise<Profil> {
    const { data, error } = await this.client
      .from('profiles')
      .insert({
        id: profil.id,
        email: profil.email,
        nom: profil.nom,
        plan: profil.plan,
        quota_restant: profil.quotaRestant,
      })
      .select('*')
      .single()
    verifier(error, 'creation du profil')
    return versProfil(data as LigneProfil)
  }

  async mettreAJourProfil(
    userId: string,
    changements: Partial<Pick<Profil, 'nom' | 'plan'>>,
  ): Promise<Profil> {
    const charge: Record<string, unknown> = {}
    if (changements.nom !== undefined) charge.nom = changements.nom
    if (changements.plan !== undefined) charge.plan = changements.plan

    if (Object.keys(charge).length === 0) {
      const existant = await this.obtenirProfil(userId)
      if (!existant) throw new Error(`Motiq : profil introuvable (${userId}).`)
      return existant
    }

    const { data, error } = await this.client
      .from('profiles')
      .update(charge)
      .eq('id', userId)
      .select('*')
      .single()
    verifier(error, 'mise a jour du profil')
    return versProfil(data as LigneProfil)
  }

  async decrementerQuota(userId: string, nombre = 1): Promise<Profil> {
    // Fonction SQL : la soustraction est atomique. Deux rendus lances en meme
    // temps consomment bien deux credits, ce qu'un lire-puis-ecrire raterait.
    const { data, error } = await this.client.rpc('decrementer_quota', {
      p_user_id: userId,
      p_nombre: nombre,
    })
    verifier(error, 'decompte du quota')

    const ligne = Array.isArray(data) ? data[0] : data
    if (!ligne) {
      throw new Error('Motiq : le quota n a pas pu etre decremente (profil introuvable ?).')
    }
    return versProfil(ligne as LigneProfil)
  }

  async assurerQuotaDuMois(userId: string, quotaParDefaut: number): Promise<Profil> {
    const { data, error } = await this.client.rpc('assurer_quota_du_mois', {
      p_user_id: userId,
      p_quota_par_defaut: quotaParDefaut,
    })
    verifier(error, 'renouvellement du quota')

    const ligne = Array.isArray(data) ? data[0] : data
    if (!ligne) {
      throw new Error('Motiq : le quota n a pas pu etre renouvele (profil introuvable ?).')
    }
    return versProfil(ligne as LigneProfil)
  }

  async activerAbonnement(params: {
    userId: string
    plan: Plan
    reference: string
    statut: string
    planCode: string | null
    codeClient: string | null
  }): Promise<void> {
    const { error } = await this.client.rpc('activer_abonnement', {
      p_user_id: params.userId,
      p_plan: params.plan,
      p_reference: params.reference,
      p_statut: params.statut,
      p_plan_code: params.planCode,
      p_code_client: params.codeClient,
    })
    verifier(error, 'activation de l abonnement')
  }

  async desactiverAbonnement(params: {
    codeClient: string | null
    email: string | null
    statut: string
  }): Promise<void> {
    const { error } = await this.client.rpc('desactiver_abonnement', {
      p_code_client: params.codeClient,
      p_email: params.email,
      p_statut: params.statut,
    })
    verifier(error, 'resiliation de l abonnement')
  }

  // ------------------------------------------------------ avis et stats
  async statistiquesPubliques(): Promise<Statistiques> {
    const { data, error } = await this.client.rpc('statistiques_publiques')
    verifier(error, 'lecture des statistiques')
    const d = (data ?? {}) as Record<string, unknown>
    return {
      utilisateurs: Number(d.utilisateurs ?? 0),
      projets: Number(d.projets ?? 0),
      avis: Number(d.avis ?? 0),
      // null reste null : « pas encore de note » n'est pas « note de zero ».
      noteMoyenne:
        d.note_moyenne === null || d.note_moyenne === undefined ? null : Number(d.note_moyenne),
      clientsSatisfaits: Number(d.clients_satisfaits ?? 0),
    }
  }

  async listerAvis(limite = 50): Promise<Avis[]> {
    const { data, error } = await this.client.rpc('avis_publies', { p_limite: limite })
    verifier(error, 'lecture des avis')
    return ((data ?? []) as Record<string, unknown>[]).map((l) => ({
      id: String(l.id),
      note: Number(l.note),
      commentaire: String(l.commentaire),
      auteur: String(l.auteur),
      creeLe: String(l.cree_le),
      estAMoi: Boolean(l.est_a_moi),
    }))
  }

  async monAvis(): Promise<MonAvis | null> {
    const { data, error } = await this.client.rpc('mon_avis')
    verifier(error, 'lecture de mon avis')
    const l = Array.isArray(data) ? data[0] : data
    if (!l) return null
    return versMonAvis(l as Record<string, unknown>)
  }

  async enregistrerAvis(params: {
    userId: string
    note: number
    commentaire: string
  }): Promise<MonAvis> {
    const { data, error } = await this.client
      .from('reviews')
      .insert({ user_id: params.userId, note: params.note, commentaire: params.commentaire })
      .select('*')
      .single()
    verifier(error, 'enregistrement de l avis')
    return versMonAvis(data as Record<string, unknown>)
  }

  async modifierAvis(params: {
    userId: string
    avisId: string
    note: number
    commentaire: string
  }): Promise<boolean> {
    const { data, error } = await this.client
      .from('reviews')
      .update({ note: params.note, commentaire: params.commentaire, maj_le: new Date().toISOString() })
      .eq('id', params.avisId)
      .eq('user_id', params.userId)
      .select('id')
    verifier(error, 'modification de l avis')
    return Array.isArray(data) && data.length > 0
  }

  async supprimerAvis(userId: string, avisId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('reviews')
      .delete()
      .eq('id', avisId)
      .eq('user_id', userId)
      .select('id')
    verifier(error, 'suppression de l avis')
    return Array.isArray(data) && data.length > 0
  }

  async modererAvis(params: {
    avisId: string
    statut: 'publie' | 'masque'
    motif: string | null
  }): Promise<boolean> {
    // Aucun controle de role ici : la politique RLS « avis: moderer » refuse
    // deja la mise a jour a quiconque n'est pas moderateur. Un filtre
    // supplementaire dans le code donnerait l'illusion que c'est lui qui
    // protege — et il suffirait de l'oublier ailleurs pour ouvrir la porte.
    const { data, error } = await this.client
      .from('reviews')
      .update({
        statut: params.statut,
        motif_masquage: params.statut === 'masque' ? params.motif : null,
        maj_le: new Date().toISOString(),
      })
      .eq('id', params.avisId)
      .select('id')
    verifier(error, 'moderation de l avis')
    return Array.isArray(data) && data.length > 0
  }

  async listerTousLesAvis(userId: string): Promise<MonAvis[]> {
    const { data, error } = await this.client
      .from('profiles')
      .select('est_moderateur')
      .eq('id', userId)
      .maybeSingle()
    verifier(error, 'verification du role de moderateur')
    if (!data?.est_moderateur) return []

    const { data: avis, error: erreurAvis } = await this.client
      .from('reviews')
      .select('*')
      .order('cree_le', { ascending: false })
      .limit(200)
    verifier(erreurAvis, 'lecture de tous les avis')
    return ((avis ?? []) as Record<string, unknown>[]).map(versMonAvis)
  }

  // ---------------------------------------------------------------- projets
  async listerProjets(userId: string, filtres: FiltresProjets = {}): Promise<Projet[]> {
    let requete = this.client
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('maj_le', { ascending: false })

    if (filtres.statut) requete = requete.eq('statut', filtres.statut)
    if (filtres.limite) requete = requete.limit(filtres.limite)

    const { data, error } = await requete
    verifier(error, 'liste des projets')
    return (data as LigneProjet[]).map(versProjet)
  }

  async obtenirProjet(userId: string, projetId: string): Promise<Projet | null> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('id', projetId)
      .maybeSingle()
    verifier(error, 'lecture du projet')
    return data ? versProjet(data as LigneProjet) : null
  }

  async creerProjet(nouveau: NouveauProjet): Promise<Projet> {
    const { data, error } = await this.client
      .from('projects')
      .insert({
        user_id: nouveau.userId,
        titre: nouveau.titre,
        entree_source: nouveau.entreeSource,
        idee: nouveau.idee ?? null,
        statut: 'brouillon',
      })
      .select('*')
      .single()
    verifier(error, 'creation du projet')
    return versProjet(data as LigneProjet)
  }

  async mettreAJourProjet(
    userId: string,
    projetId: string,
    changements: Partial<
      Pick<Projet, 'titre' | 'statut' | 'script' | 'templateId' | 'apparence'>
    >,
  ): Promise<Projet> {
    const charge: Record<string, unknown> = {}
    if (changements.titre !== undefined) charge.titre = changements.titre
    if (changements.statut !== undefined) charge.statut = changements.statut
    if (changements.script !== undefined) charge.script = changements.script
    if (changements.templateId !== undefined) charge.template_id = changements.templateId
    if (changements.apparence !== undefined) charge.apparence = changements.apparence

    const { data, error } = await this.client
      .from('projects')
      .update(charge)
      .eq('user_id', userId)
      .eq('id', projetId)
      .select('*')
      .single()
    verifier(error, 'mise a jour du projet')
    return versProjet(data as LigneProjet)
  }

  async dupliquerProjet(userId: string, projetId: string): Promise<Projet> {
    const original = await this.obtenirProjet(userId, projetId)
    if (!original) {
      throw new Error(`Motiq : le projet ${projetId} est introuvable (ou n'appartient pas a l'utilisateur).`)
    }

    const { data, error } = await this.client
      .from('projects')
      .insert({
        user_id: userId,
        titre: `${original.titre} (copie)`,
        statut: 'brouillon',
        entree_source: original.entreeSource,
        idee: original.idee,
        script: original.script,
        template_id: original.templateId,
        apparence: original.apparence,
      })
      .select('*')
      .single()
    verifier(error, 'duplication du projet')
    return versProjet(data as LigneProjet)
  }

  async supprimerProjet(userId: string, projetId: string): Promise<void> {
    const { error } = await this.client
      .from('projects')
      .delete()
      .eq('user_id', userId)
      .eq('id', projetId)
    verifier(error, 'suppression du projet')
  }

  // ---------------------------------------------------------------- medias
  async listerAssets(userId: string, projetId: string): Promise<Asset[]> {
    const projet = await this.obtenirProjet(userId, projetId)
    if (!projet) return []

    const { data, error } = await this.client
      .from('assets')
      .select('*')
      .eq('projet_id', projetId)
      .order('cree_le', { ascending: true })
    verifier(error, 'liste des medias')
    return (data as LigneAsset[]).map(versAsset)
  }

  async enregistrerAsset(asset: Omit<Asset, 'creeLe'>): Promise<Asset> {
    const { data, error } = await this.client
      .from('assets')
      .insert({
        id: asset.id,
        projet_id: asset.projetId,
        type: asset.type,
        chemin: asset.chemin,
        taille_octets: asset.tailleOctets,
      })
      .select('*')
      .single()
    verifier(error, 'enregistrement du media')
    return versAsset(data as LigneAsset)
  }

  async supprimerAsset(userId: string, assetId: string): Promise<Asset | null> {
    // On lit d'abord : la politique RLS ecarte les medias des autres projets,
    // donc « introuvable » et « pas le tien » sont traites de la meme facon.
    const { data, error } = await this.client
      .from('assets')
      .select('*, projects!inner(user_id)')
      .eq('id', assetId)
      .eq('projects.user_id', userId)
      .maybeSingle()
    verifier(error, 'lecture du media a supprimer')
    if (!data) return null

    const asset = versAsset(data as unknown as LigneAsset)

    const { error: erreurSuppression } = await this.client
      .from('assets')
      .delete()
      .eq('id', assetId)
    verifier(erreurSuppression, 'suppression du media')

    return asset
  }

  // ---------------------------------------------------------------- templates
  async listerTemplates(): Promise<Template[]> {
    const { data, error } = await this.client
      .from('templates')
      .select('*')
      .eq('actif', true)
      .order('id', { ascending: true })
    verifier(error, 'liste des templates')
    return (data as LigneTemplate[]).map(versTemplate)
  }

  async obtenirTemplate(templateId: string): Promise<Template | null> {
    const { data, error } = await this.client
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle()
    verifier(error, 'lecture du template')
    return data ? versTemplate(data as LigneTemplate) : null
  }

  // ---------------------------------------------------------------- rendus
  async creerRendu(nouveau: NouveauRendu): Promise<Rendu> {
    const { data, error } = await this.client
      .from('render_jobs')
      .insert({
        projet_id: nouveau.projetId,
        statut: 'en_attente',
        progression: 0,
      })
      .select('*')
      .single()
    verifier(error, 'creation du rendu')
    return versRendu(data as LigneRendu)
  }

  async obtenirRendu(userId: string, renduId: string): Promise<Rendu | null> {
    const { data, error } = await this.client
      .from('render_jobs')
      .select('*, projects!inner(user_id)')
      .eq('id', renduId)
      .eq('projects.user_id', userId)
      .maybeSingle()
    verifier(error, 'lecture du rendu')
    return data ? versRendu(data as unknown as LigneRendu) : null
  }

  async listerRendus(userId: string, projetId: string): Promise<Rendu[]> {
    // Le filtre sur user_id n'est pas une precaution de style : c'est ce qui
    // empeche de lire les rendus d'un projet qui n'est pas le sien. RLS le
    // refuserait de toute facon, mais autant ne pas le demander.
    const projet = await this.obtenirProjet(userId, projetId)
    if (!projet) return []

    const { data, error } = await this.client
      .from('render_jobs')
      .select('*')
      .eq('projet_id', projetId)
      .order('cree_le', { ascending: false })
    verifier(error, 'liste des rendus')
    return (data as LigneRendu[]).map(versRendu)
  }

  async majProgressionRendu(
    renduId: string,
    progression: number,
    statut: Rendu['statut'],
  ): Promise<Rendu> {
    const { data, error } = await this.client
      .from('render_jobs')
      .update({ progression, statut })
      .eq('id', renduId)
      .select('*')
      .single()
    verifier(error, 'mise a jour de la progression')
    return versRendu(data as LigneRendu)
  }

  // ---------------------------------------------------------------- kit de marque
  async obtenirKitMarque(userId: string): Promise<KitMarque | null> {
    const { data, error } = await this.client
      .from('brand_kits')
      .select('*')
      .eq('user_id', userId)
      .order('cree_le', { ascending: false })
      .limit(1)
      .maybeSingle()
    verifier(error, 'lecture du kit de marque')
    return data ? versKit(data as LigneKit) : null
  }

  async enregistrerKitMarque(
    kit: Omit<KitMarque, 'creeLe' | 'majLe'>,
  ): Promise<KitMarque> {
    const { data, error } = await this.client
      .from('brand_kits')
      .upsert(
        {
          id: kit.id,
          user_id: kit.userId,
          logo: kit.logo,
          couleurs: kit.couleurs,
          police: kit.police,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single()
    verifier(error, 'enregistrement du kit de marque')
    return versKit(data as LigneKit)
  }

  // ---------------------------------------------------------------- abonnements
  async obtenirAbonnement(userId: string): Promise<Abonnement | null> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('periode_debut', { ascending: false })
      .limit(1)
      .maybeSingle()
    verifier(error, 'lecture de l abonnement')
    return data ? versAbonnement(data as LigneAbonnement) : null
  }

  async enregistrerAbonnement(abo: Omit<Abonnement, 'id'>): Promise<Abonnement> {
    const { data, error } = await this.client
      .from('subscriptions')
      .insert({
        user_id: abo.userId,
        plan: abo.plan,
        statut_paiement: abo.statutPaiement,
        fournisseur: abo.fournisseur,
        reference: abo.reference,
        plan_code: abo.planCode,
        code_client: abo.codeClient,
        periode_debut: abo.periodeDebut,
        periode_fin: abo.periodeFin,
      })
      .select('*')
      .single()
    verifier(error, 'enregistrement de l abonnement')
    return versAbonnement(data as LigneAbonnement)
  }

  // ---------------------------------------------------------------- usage
  async obtenirUsage(userId: string, mois: string): Promise<Usage | null> {
    const { data, error } = await this.client
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .eq('mois', mois)
      .maybeSingle()
    verifier(error, 'lecture de la consommation')
    return data ? versUsage(data as LigneUsage) : null
  }

  async incrementerUsage(userId: string, mois: string, minutes: number): Promise<Usage> {
    const existant = await this.obtenirUsage(userId, mois)
    const nouveau = {
      user_id: userId,
      mois,
      nombre_rendus: (existant?.nombreRendus ?? 0) + 1,
      minutes_generees: (existant?.minutesGenerees ?? 0) + minutes,
    }

    const { data, error } = await this.client
      .from('usage')
      .upsert(nouveau, { onConflict: 'user_id,mois' })
      .select('*')
      .single()
    verifier(error, 'mise a jour de la consommation')
    return versUsage(data as LigneUsage)
  }
}
