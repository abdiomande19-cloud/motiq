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
import { obtenirDepotPourJeton } from '@/lib/data'
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

    const profil = await depot.obtenirProfil(s.user.id)

    // L'enregistrement du job est REEL : la ligne existe dans render_jobs.
    // En revanche, aucun worker ne la traitera tant que la phase 5 n'est pas
    // branchee — c'est ecrit noir sur blanc dans l'interface, pas simule.
    await depot.creerRendu({ projetId, plan: profil?.plan ?? 'gratuit' })
    await depot.mettreAJourProjet(s.user.id, projetId, { statut: 'en_generation' })
  } catch (erreur) {
    return {
      erreur: `Le lancement a echoue : ${erreur instanceof Error ? erreur.message : 'raison inconnue'}`,
    }
  }

  revalidatePath(`/projets/${projetId}`)
  return {
    succes:
      'Demande enregistree dans render_jobs (statut « en attente »). ' +
      "Le worker de rendu n'est pas encore branche : rien ne sera produit pour l'instant.",
  }
}
