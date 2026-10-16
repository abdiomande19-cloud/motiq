/**
 * Motiq — implementation LOCALE du depot de donnees (decision D2).
 *
 * Objectif : que le socle tourne aujourd'hui, sans aucun identifiant, pendant
 * que Supabase n'est pas encore relie. Le stockage est un simple fichier JSON
 * dans `.donnees/`, ignore par git.
 *
 * ⚠️ Cette implementation est prevue pour le DEVELOPPEMENT LOCAL uniquement :
 *  - pas de verrouillage concurrent (deux generations simultanees se ecraseraient),
 *  - pas de regles RLS (le filtrage par userId est fait a la main, plus bas),
 *  - pas de stockage de fichiers (les chemins sont enregistres, pas les octets).
 * L'implementation Supabase remplacera ces trois points sans changer les ecrans.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { DepotMotiq, FiltresProjets, NouveauProjet, NouveauRendu } from './repository'
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

const FICHIER = join(process.cwd(), '.donnees', 'motiq.json')

/** Contenu du fichier de donnees. */
interface Base {
  profils: Profil[]
  kits: KitMarque[]
  projets: Projet[]
  assets: Asset[]
  templates: Template[]
  rendus: Rendu[]
  abonnements: Abonnement[]
  usages: Usage[]
}

const BASE_VIDE: Base = {
  profils: [],
  kits: [],
  projets: [],
  assets: [],
  templates: [],
  rendus: [],
  abonnements: [],
  usages: [],
}

/** Horodatage ISO courant. */
const maintenant = () => new Date().toISOString()

/** Identifiant court et lisible, prefixe par type (ex. : prj_3f9a2c). */
const id = (prefixe: string) => `${prefixe}_${randomUUID().slice(0, 8)}`

// ---------------------------------------------------------------- Persistance

async function lire(): Promise<Base> {
  try {
    const brut = await readFile(FICHIER, 'utf8')
    const donnees = JSON.parse(brut) as Partial<Base>
    return { ...BASE_VIDE, ...donnees }
  } catch {
    // Aucun fichier encore : on demarre sur une base vide, sans erreur.
    return { ...BASE_VIDE }
  }
}

async function ecrire(base: Base): Promise<void> {
  await mkdir(dirname(FICHIER), { recursive: true })
  await writeFile(FICHIER, JSON.stringify(base, null, 2), 'utf8')
}

// ---------------------------------------------------------------- Bibliotheque de templates

/**
 * Bibliotheque de depart : 8 templates, minimum exige par le cahier des charges
 * (6.1 point 4). Les parametres sont volontairement simples ; leur rendu visuel
 * reel appartient a la phase 4 (moteur motion design).
 */
function templatesDeDepart(): Template[] {
  const base = { format: '9:16' as const, apercu: '', parametres: {} }
  return [
    { id: 'tpl_punch', nom: 'Punch', categorie: 'Promo', ...base, parametres: { rythme: 'rapide', transition: 'flash' } },
    { id: 'tpl_slide', nom: 'Slide', categorie: 'Educatif', ...base, parametres: { rythme: 'pose', transition: 'glissement' } },
    { id: 'tpl_pulse', nom: 'Pulse', categorie: 'Musique', ...base, parametres: { rythme: 'rapide', transition: 'zoom' } },
    { id: 'tpl_clair', nom: 'Clair', categorie: 'Minimal', ...base, parametres: { rythme: 'pose', transition: 'fondu' } },
    { id: 'tpl_audace', nom: 'Audace', categorie: 'Marketing', ...base, parametres: { rythme: 'moyen', transition: 'bascule' } },
    { id: 'tpl_narration', nom: 'Narration', categorie: 'Storytelling', ...base, parametres: { rythme: 'pose', transition: 'fondu' } },
    { id: 'tpl_affiche', nom: 'Affiche', categorie: 'Annonce', ...base, parametres: { rythme: 'moyen', transition: 'rideau' } },
    { id: 'tpl_energie', nom: 'Energie', categorie: 'Sport', ...base, parametres: { rythme: 'rapide', transition: 'impact' } },
  ]
}

// ---------------------------------------------------------------- Implementation

export class DepotLocal implements DepotMotiq {
  readonly nom = 'local (fichier JSON, developpement)'

  // --- Profils ---------------------------------------------------------------

  async obtenirProfil(userId: string): Promise<Profil | null> {
    const base = await lire()
    return base.profils.find((p) => p.id === userId) ?? null
  }

  async creerProfil(profil: Omit<Profil, 'creeLe' | 'majLe'>): Promise<Profil> {
    const base = await lire()
    if (base.profils.some((p) => p.id === profil.id)) {
      throw new Error(`Motiq : un profil existe deja pour ${profil.id}.`)
    }
    const complet: Profil = { ...profil, creeLe: maintenant(), majLe: maintenant() }
    base.profils.push(complet)
    await ecrire(base)
    return complet
  }

  async mettreAJourProfil(
    userId: string,
    changements: Partial<Pick<Profil, 'nom' | 'plan'>>,
  ): Promise<Profil> {
    const base = await lire()
    const profil = base.profils.find((p) => p.id === userId)
    if (!profil) throw new Error(`Motiq : profil introuvable (${userId}).`)

    if (changements.nom !== undefined) profil.nom = changements.nom
    if (changements.plan !== undefined) profil.plan = changements.plan
    profil.majLe = maintenant()

    await ecrire(base)
    return profil
  }

  async decrementerQuota(userId: string, nombre = 1): Promise<Profil> {
    const base = await lire()
    const profil = base.profils.find((p) => p.id === userId)
    if (!profil) throw new Error(`Motiq : profil introuvable (${userId}).`)

    // Jamais en dessous de zero : le quota ne peut pas devenir negatif.
    profil.quotaRestant = Math.max(0, profil.quotaRestant - Math.max(0, nombre))
    profil.majLe = maintenant()

    await ecrire(base)
    return profil
  }

  async assurerQuotaDuMois(userId: string, quotaParDefaut: number): Promise<Profil> {
    const base = await lire()
    const profil = base.profils.find((p) => p.id === userId)
    if (!profil) throw new Error(`Motiq : profil introuvable (${userId}).`)

    const moisCourant = `${new Date().toISOString().slice(0, 7)}-01`

    // Le quota date d'un mois precedent : on le renouvelle.
    if (profil.quotaMois < moisCourant) {
      profil.quotaRestant = quotaParDefaut
      profil.quotaMois = moisCourant
      profil.majLe = maintenant()
      await ecrire(base)
    }

    return profil
  }

  // --- Projets ---------------------------------------------------------------

  async listerProjets(userId: string, filtres?: FiltresProjets): Promise<Projet[]> {
    const base = await lire()
    // Filtrage par utilisateur fait explicitement : chaque utilisateur ne voit
    // que ses projets (equivalent local des regles RLS).
    let resultat = base.projets.filter((p) => p.userId === userId)
    if (filtres?.statut) resultat = resultat.filter((p) => p.statut === filtres.statut)
    resultat.sort((a, b) => b.majLe.localeCompare(a.majLe))
    return filtres?.limite ? resultat.slice(0, filtres.limite) : resultat
  }

  async obtenirProjet(userId: string, projetId: string): Promise<Projet | null> {
    const base = await lire()
    return base.projets.find((p) => p.id === projetId && p.userId === userId) ?? null
  }

  async creerProjet(nouveau: NouveauProjet): Promise<Projet> {
    const base = await lire()
    const projet: Projet = {
      id: id('prj'),
      userId: nouveau.userId,
      titre: nouveau.titre,
      statut: 'brouillon',
      entreeSource: nouveau.entreeSource,
      idee: nouveau.idee ?? null,
      script: null,
      templateId: null,
      apparence: null,
      creeLe: maintenant(),
      majLe: maintenant(),
    }
    base.projets.push(projet)
    await ecrire(base)
    return projet
  }

  async mettreAJourProjet(
    userId: string,
    projetId: string,
    changements: Partial<Pick<Projet, 'titre' | 'statut' | 'script' | 'templateId'>>,
  ): Promise<Projet> {
    const base = await lire()
    const projet = base.projets.find((p) => p.id === projetId && p.userId === userId)
    if (!projet) throw new Error(`Motiq : projet introuvable (${projetId}).`)
    Object.assign(projet, changements, { majLe: maintenant() })
    await ecrire(base)
    return projet
  }

  async dupliquerProjet(userId: string, projetId: string): Promise<Projet> {
    const base = await lire()
    const source = base.projets.find((p) => p.id === projetId && p.userId === userId)
    if (!source) throw new Error(`Motiq : projet introuvable (${projetId}).`)
    const copie: Projet = {
      ...source,
      id: id('prj'),
      titre: `${source.titre} (copie)`,
      statut: 'brouillon',
      creeLe: maintenant(),
      majLe: maintenant(),
    }
    base.projets.push(copie)
    await ecrire(base)
    return copie
  }

  async supprimerProjet(userId: string, projetId: string): Promise<void> {
    const base = await lire()
    const avant = base.projets.length
    base.projets = base.projets.filter((p) => !(p.id === projetId && p.userId === userId))
    if (base.projets.length === avant) {
      throw new Error(`Motiq : projet introuvable (${projetId}).`)
    }
    // Les medias rattaches partent avec le projet.
    base.assets = base.assets.filter((a) => a.projetId !== projetId)
    base.rendus = base.rendus.filter((r) => r.projetId !== projetId)
    await ecrire(base)
  }

  // --- Medias ----------------------------------------------------------------

  async listerAssets(userId: string, projetId: string): Promise<Asset[]> {
    const base = await lire()
    const projet = base.projets.find((p) => p.id === projetId && p.userId === userId)
    if (!projet) return []
    return base.assets.filter((a) => a.projetId === projetId)
  }

  async enregistrerAsset(asset: Omit<Asset, 'creeLe'>): Promise<Asset> {
    const base = await lire()
    const complet: Asset = { ...asset, creeLe: maintenant() }
    base.assets.push(complet)
    await ecrire(base)
    return complet
  }

  async supprimerAsset(userId: string, assetId: string): Promise<Asset | null> {
    const base = await lire()
    const index = base.assets.findIndex((a) => a.id === assetId)
    if (index === -1) return null

    const asset = base.assets[index]
    // Verification d'appartenance : le media doit appartenir a un projet
    // de cet utilisateur.
    const appartient = base.projets.some((p) => p.id === asset.projetId && p.userId === userId)
    if (!appartient) return null

    base.assets.splice(index, 1)
    await ecrire(base)
    return asset
  }

  // --- Templates -------------------------------------------------------------

  async listerTemplates(): Promise<Template[]> {
    const base = await lire()
    if (base.templates.length === 0) {
      // Premiere lecture : on installe la bibliotheque de depart, une seule fois.
      base.templates = templatesDeDepart()
      await ecrire(base)
    }
    return base.templates
  }

  async obtenirTemplate(templateId: string): Promise<Template | null> {
    const tous = await this.listerTemplates()
    return tous.find((t) => t.id === templateId) ?? null
  }

  // --- Rendus ----------------------------------------------------------------

  async creerRendu(nouveau: NouveauRendu): Promise<Rendu> {
    const base = await lire()
    const rendu: Rendu = {
      id: id('rnd'),
      projetId: nouveau.projetId,
      statut: 'en_attente',
      progression: 0,
      urlMp4: null,
      erreur: null,
      creeLe: maintenant(),
      majLe: maintenant(),
    }
    base.rendus.push(rendu)
    // Le projet passe en generation.
    const projet = base.projets.find((p) => p.id === nouveau.projetId)
    if (projet) {
      projet.statut = 'en_generation'
      projet.majLe = maintenant()
    }
    await ecrire(base)
    return rendu
  }

  async obtenirRendu(userId: string, renduId: string): Promise<Rendu | null> {
    const base = await lire()
    const rendu = base.rendus.find((r) => r.id === renduId)
    if (!rendu) return null
    // Verification d'appartenance : le rendu doit appartenir a un projet de cet utilisateur.
    const appartient = base.projets.some((p) => p.id === rendu.projetId && p.userId === userId)
    return appartient ? rendu : null
  }

  async listerRendus(userId: string, projetId: string): Promise<Rendu[]> {
    const base = await lire()
    // On ne rend rien si le projet n'appartient pas a cet utilisateur.
    const appartient = base.projets.some((p) => p.id === projetId && p.userId === userId)
    if (!appartient) return []
    return base.rendus
      .filter((r) => r.projetId === projetId)
      .sort((a, b) => b.creeLe.localeCompare(a.creeLe))
  }

  async majProgressionRendu(
    renduId: string,
    progression: number,
    statut: Rendu['statut'],
  ): Promise<Rendu> {
    const base = await lire()
    const rendu = base.rendus.find((r) => r.id === renduId)
    if (!rendu) throw new Error(`Motiq : rendu introuvable (${renduId}).`)
    rendu.progression = Math.max(0, Math.min(100, Math.round(progression)))
    rendu.statut = statut
    rendu.majLe = maintenant()
    if (statut === 'termine') {
      const projet = base.projets.find((p) => p.id === rendu.projetId)
      if (projet) {
        projet.statut = 'pret'
        projet.majLe = maintenant()
      }
    }
    if (statut === 'echec') {
      const projet = base.projets.find((p) => p.id === rendu.projetId)
      if (projet) {
        projet.statut = 'echec'
        projet.majLe = maintenant()
      }
    }
    await ecrire(base)
    return rendu
  }

  // --- Kit de marque ---------------------------------------------------------

  async obtenirKitMarque(userId: string): Promise<KitMarque | null> {
    const base = await lire()
    return base.kits.find((k) => k.userId === userId) ?? null
  }

  async enregistrerKitMarque(kit: Omit<KitMarque, 'creeLe' | 'majLe'>): Promise<KitMarque> {
    const base = await lire()
    const existant = base.kits.find((k) => k.userId === kit.userId)
    if (existant) {
      Object.assign(existant, kit, { majLe: maintenant() })
      await ecrire(base)
      return existant
    }
    const complet: KitMarque = { ...kit, creeLe: maintenant(), majLe: maintenant() }
    base.kits.push(complet)
    await ecrire(base)
    return complet
  }

  // --- Abonnements et usage --------------------------------------------------

  async obtenirAbonnement(userId: string): Promise<Abonnement | null> {
    const base = await lire()
    return base.abonnements.find((a) => a.userId === userId) ?? null
  }

  async enregistrerAbonnement(abo: Omit<Abonnement, 'id'>): Promise<Abonnement> {
    const base = await lire()
    const complet: Abonnement = { ...abo, id: id('abo') }
    base.abonnements = base.abonnements.filter((a) => a.userId !== abo.userId)
    base.abonnements.push(complet)
    await ecrire(base)
    return complet
  }

  async obtenirUsage(userId: string, mois: string): Promise<Usage | null> {
    const base = await lire()
    return base.usages.find((u) => u.userId === userId && u.mois === mois) ?? null
  }

  async incrementerUsage(userId: string, mois: string, minutes: number): Promise<Usage> {
    const base = await lire()
    let usage = base.usages.find((u) => u.userId === userId && u.mois === mois)
    if (!usage) {
      usage = { id: id('usg'), userId, mois, nombreRendus: 0, minutesGenerees: 0 }
      base.usages.push(usage)
    }
    usage.nombreRendus += 1
    usage.minutesGenerees += minutes
    await ecrire(base)
    return usage
  }
}
