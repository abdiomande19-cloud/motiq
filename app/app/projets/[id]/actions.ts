/**
 * Motiq — actions sur un projet : script, template, generation.
 *
 * REGLE DE CONFIANCE : le navigateur n'est jamais cru sur parole. La duree
 * totale du script est RECALCULEE ici, a partir des scenes, et non reprise du
 * formulaire. Le cahier des charges impose une video de 15 a 60 secondes
 * (6.1 point 5) : c'est le serveur qui le verifie, pas l'interface.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepot, obtenirDepotPourJeton } from '@/lib/data'
import { estPoliceValide } from '@/lib/polices'
import {
  deposerFichier,
  retirerFichier,
  TAILLE_MAX,
  TAILLE_SON_MAX,
  TYPES_ACCEPTES,
  TYPES_SON,
} from '@/lib/fichiers'
import type { Scene } from '@/lib/data'

export interface EtatAction {
  erreur?: string
  succes?: string
}

async function session() {
  const supabase = await creerClientServeur()
  const {
    data: { session: s },
  } = await supabase.auth.getSession()
  return s
}

/** Bornes imposees par le cahier des charges. */
const DUREE_MIN = 15
const DUREE_MAX = 60
const DUREE_SCENE_MAX = 30

/**
 * Dotation mensuelle du plan gratuit.
 *
 * La maquette de phase 1 annonce des « quotas provisoires — a valider » : ce 3
 * est la valeur posee a l'inscription, pas un chiffre invente. Les dotations Pro
 * et Business seront fixees avec les abonnements.
 */
const QUOTA_GRATUIT = 3

/** Valide et normalise les scenes venues du navigateur. */
function analyserScenes(brut: unknown): { scenes: Scene[]; erreur?: string } {
  if (!Array.isArray(brut)) return { scenes: [], erreur: 'Le script est illisible.' }
  if (brut.length === 0) return { scenes: [], erreur: 'Ajoute au moins une scene.' }
  if (brut.length > 30) return { scenes: [], erreur: 'Trente scenes au maximum.' }

  const scenes: Scene[] = []

  brut.forEach((element, index) => {
    const e = element as Record<string, unknown>
    const texte = String(e.texte ?? '').trim()
    const duree = Number(e.dureeSecondes)

    if (!texte) throw new Error(`La scene ${index + 1} n'a pas de texte.`)
    if (!Number.isFinite(duree) || duree <= 0) {
      throw new Error(`La duree de la scene ${index + 1} est invalide.`)
    }
    if (duree > DUREE_SCENE_MAX) {
      throw new Error(`La scene ${index + 1} depasse ${DUREE_SCENE_MAX} secondes.`)
    }

    scenes.push({
      ordre: index + 1,
      texte,
      dureeSecondes: Math.round(duree * 10) / 10,
      note: typeof e.note === 'string' && e.note.trim() ? e.note.trim() : undefined,
    })
  })

  return { scenes }
}

export async function enregistrerScript(
  _etat: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const projetId = String(donnees.get('projetId') ?? '')
  const titre = String(donnees.get('titreScript') ?? '').trim()

  let brut: unknown
  try {
    brut = JSON.parse(String(donnees.get('scenes') ?? '[]'))
  } catch {
    return { erreur: 'Le script recu est illisible.' }
  }

  let scenes: Scene[]
  try {
    const resultat = analyserScenes(brut)
    if (resultat.erreur) return { erreur: resultat.erreur }
    scenes = resultat.scenes
  } catch (erreur) {
    return { erreur: erreur instanceof Error ? erreur.message : 'Script invalide.' }
  }

  // Recalcul cote serveur : on ne fait pas confiance au total du navigateur.
  const dureeTotaleSecondes =
    Math.round(scenes.reduce((somme, sc) => somme + sc.dureeSecondes, 0) * 10) / 10

  if (dureeTotaleSecondes < DUREE_MIN) {
    return {
      erreur:
        `Le script dure ${dureeTotaleSecondes} s : il en faut au moins ${DUREE_MIN}. ` +
        'Allonge ou ajoute une scene.',
    }
  }
  if (dureeTotaleSecondes > DUREE_MAX) {
    return {
      erreur:
        `Le script dure ${dureeTotaleSecondes} s : le maximum est ${DUREE_MAX}. ` +
        'Raccourcis tes scenes.',
    }
  }

  try {
    const depot = obtenirDepotPourJeton(s.access_token)
    await depot.mettreAJourProjet(s.user.id, projetId, {
      script: { titre: titre || 'Sans titre', scenes, dureeTotaleSecondes },
      statut: 'script_valide',
    })
  } catch (erreur) {
    return {
      erreur: `L'enregistrement a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath(`/projets/${projetId}`)
  return { succes: `Script enregistre : ${scenes.length} scenes, ${dureeTotaleSecondes} s.` }
}

export async function choisirTemplate(
  _etat: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const projetId = String(donnees.get('projetId') ?? '')
  const templateId = String(donnees.get('templateId') ?? '')

  try {
    const depot = obtenirDepotPourJeton(s.access_token)

    // Le template doit exister : on ne stocke pas une reference fantome.
    const template = await depot.obtenirTemplate(templateId)
    if (!template) return { erreur: 'Ce template est introuvable.' }

    await depot.mettreAJourProjet(s.user.id, projetId, { templateId })
  } catch (erreur) {
    return {
      erreur: `Le choix a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath(`/projets/${projetId}`)
  return { succes: 'Template enregistre.' }
}

export async function lancerGeneration(
  _etat: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const projetId = String(donnees.get('projetId') ?? '')

  try {
    const depot = obtenirDepotPourJeton(s.access_token)

    const projet = await depot.obtenirProjet(s.user.id, projetId)
    if (!projet) return { erreur: 'Projet introuvable.' }
    if (!projet.script) return { erreur: "Enregistre d'abord le script." }
    if (!projet.templateId) return { erreur: "Choisis d'abord un template." }

    // Le quota appartient au SERVEUR : la migration 0005 interdit a
    // l'utilisateur d'y toucher. On le renouvelle d'abord s'il date d'un mois
    // precedent — sinon un compte gratuit resterait bloque pour toujours apres
    // ses premiers rendus, alors que le cahier des charges promet « quelques
    // videos par mois ».
    const depotServeur = obtenirDepot()
    const profil = await depotServeur
      .assurerQuotaDuMois(s.user.id, QUOTA_GRATUIT)
      .catch(() => null)

    if (!profil) {
      return { erreur: 'Ton profil est introuvable. Va sur la page Réglages.' }
    }

    // Le quota est verifie AVANT d'enregistrer quoi que ce soit : inutile de
    // creer une demande de rendu qu'on refuserait ensuite.
    if (profil.quotaRestant <= 0) {
      return {
        erreur:
          `Quota épuisé : ${profil.quotaRestant} rendu restant ce mois-ci. ` +
          "Les plans Pro et Business ne sont pas encore disponibles (le paiement n'est pas branché). " +
          'Ton quota se renouvellera le mois prochain.',
      }
    }

    // L'enregistrement du job est REEL : la ligne existe dans render_jobs.
    // En revanche, aucun worker ne la traitera tant que la phase 5 n'est pas
    // branchee — c'est ecrit noir sur blanc dans l'interface, pas simule.
    await depot.creerRendu({ projetId, plan: profil.plan })
    await depot.mettreAJourProjet(s.user.id, projetId, { statut: 'en_generation' })

    // Le decompte et la consommation appartiennent aussi au serveur.
    const profilApres = await depotServeur.decrementerQuota(s.user.id, 1)

    const mois = new Date().toISOString().slice(0, 7)
    const minutes = Math.round(((projet.script?.dureeTotaleSecondes ?? 0) / 60) * 100) / 100
    await depotServeur.incrementerUsage(s.user.id, mois, minutes)

    revalidatePath(`/projets/${projetId}`)
    revalidatePath('/reglages')
    return {
      succes:
        `Demande enregistree dans render_jobs (statut « en attente »). ` +
        `Quota restant : ${profilApres.quotaRestant}. ` +
        "Le worker de rendu n'est pas encore branche : rien ne sera produit pour l'instant.",
    }
  } catch (erreur) {
    return {
      erreur: `Le lancement a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }
}

// ------------------------------------------------------------------ apparence

/** Analyse les couleurs et la police envoyees par le navigateur. */
function analyserApparence(donnees: FormData): { couleurs?: string[]; police?: string; erreur?: string } {
  const couleurs = [1, 2, 3]
    .map((n) => String(donnees.get(`couleur${n}`) ?? '').trim())
    .filter((c) => c.length > 0)

  if (couleurs.length < 2 || couleurs.length > 3) {
    return { erreur: 'Il faut 2 ou 3 couleurs.' }
  }
  for (const couleur of couleurs) {
    if (!/^#[0-9a-fA-F]{6}$/.test(couleur)) {
      return { erreur: `« ${couleur} » n'est pas au format #RRGGBB.` }
    }
  }

  const police = String(donnees.get('police') ?? '').trim()
  if (!estPoliceValide(police)) {
    return { erreur: 'Cette police ne fait pas partie de la liste.' }
  }

  return { couleurs, police }
}

export async function enregistrerApparence(
  _etat: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const projetId = String(donnees.get('projetId') ?? '')
  const analyse = analyserApparence(donnees)
  if (analyse.erreur) return { erreur: analyse.erreur }

  const musique = String(donnees.get('musique') ?? '').trim() || null

  try {
    const depot = obtenirDepotPourJeton(s.access_token)
    await depot.mettreAJourProjet(s.user.id, projetId, {
      apparence: { couleurs: analyse.couleurs!, police: analyse.police!, musique },
    })
  } catch (erreur) {
    return {
      erreur: `L'enregistrement a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath(`/projets/${projetId}`)
  return { succes: 'Apparence enregistree.' }
}

export async function deposerMusique(
  _etat: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const projetId = String(donnees.get('projetId') ?? '')

  // Les couleurs et la police voyagent avec ce formulaire : sans elles, le
  // depot de musique effacerait les reglages visuels.
  const analyse = analyserApparence(donnees)
  if (analyse.erreur) return { erreur: analyse.erreur }

  const fichier = donnees.get('musique')
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: 'Choisis un fichier audio.' }
  }

  const depotFichier = await deposerFichier('musique', fichier, {
    types: TYPES_SON,
    tailleMax: TAILLE_SON_MAX,
    descriptionTypes: 'MP3, M4A, AAC, WAV ou OGG',
  })
  if (depotFichier.erreur || !depotFichier.chemin) {
    return { erreur: depotFichier.erreur ?? 'Depot impossible.' }
  }

  try {
    const depot = obtenirDepotPourJeton(s.access_token)
    await depot.mettreAJourProjet(s.user.id, projetId, {
      apparence: {
        couleurs: analyse.couleurs!,
        police: analyse.police!,
        musique: depotFichier.chemin,
      },
    })
  } catch (erreur) {
    return {
      erreur: `L'enregistrement a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath(`/projets/${projetId}`)
  return { succes: 'Musique deposee. Elle n est lisible que par toi (stockage prive).' }
}

export async function retirerMusique(
  _etat: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const projetId = String(donnees.get('projetId') ?? '')
  const analyse = analyserApparence(donnees)
  if (analyse.erreur) return { erreur: analyse.erreur }

  try {
    const depot = obtenirDepotPourJeton(s.access_token)
    await depot.mettreAJourProjet(s.user.id, projetId, {
      apparence: { couleurs: analyse.couleurs!, police: analyse.police!, musique: null },
    })
  } catch (erreur) {
    return {
      erreur: `L'enregistrement a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath(`/projets/${projetId}`)
  return { succes: 'Musique retiree.' }
}

// ------------------------------------------------------------------ images

export async function deposerImage(
  _etat: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const projetId = String(donnees.get('projetId') ?? '')
  const fichier = donnees.get('image')
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: 'Choisis une image.' }
  }

  const depotFichier = await deposerFichier('images', fichier, {
    types: TYPES_ACCEPTES,
    tailleMax: TAILLE_MAX,
    descriptionTypes: 'PNG, JPEG, WebP ou SVG',
  })
  if (depotFichier.erreur || !depotFichier.chemin) {
    return { erreur: depotFichier.erreur ?? 'Depot impossible.' }
  }

  try {
    const depot = obtenirDepotPourJeton(s.access_token)
    await depot.enregistrerAsset({
      id: crypto.randomUUID(),
      projetId,
      type: 'image',
      chemin: depotFichier.chemin,
      tailleOctets: fichier.size,
    })
  } catch (erreur) {
    // Le fichier est deja dans le stockage : si la fiche echoue, on le retire
    // pour ne pas laisser un fichier orphelin, invisible et jamais facture.
    await retirerFichier(depotFichier.chemin)
    return {
      erreur: `L'enregistrement a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath(`/projets/${projetId}`)
  return { succes: 'Image ajoutee au projet.' }
}

export async function retirerImage(
  _etat: EtatAction,
  donnees: FormData,
): Promise<EtatAction> {
  const s = await session()
  if (!s) return { erreur: 'Ta session a expire. Reconnecte-toi.' }

  const projetId = String(donnees.get('projetId') ?? '')
  const assetId = String(donnees.get('assetId') ?? '')

  try {
    const depot = obtenirDepotPourJeton(s.access_token)
    const retire = await depot.supprimerAsset(s.user.id, assetId)
    if (!retire) return { erreur: 'Ce media est introuvable, ou ne t appartient pas.' }

    // La fiche est supprimee ; on retire aussi le fichier du stockage.
    await retirerFichier(retire.chemin)
  } catch (erreur) {
    return {
      erreur: `La suppression a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath(`/projets/${projetId}`)
  return { succes: 'Image retiree.' }
}

/**
 * Version sans etat, pour les boutons d'une liste.
 *
 * `useActionState` sert quand on veut un message de retour ; ici chaque image a
 * son propre bouton, et partager un seul etat entre toutes afficherait le
 * message de la mauvaise vignette.
 */
export async function retirerImageSimple(donnees: FormData): Promise<void> {
  await retirerImage({}, donnees)
}
