'use server'

import { revalidatePath } from 'next/cache'
import { creerClientServeur } from '@/lib/supabase/server'
import { obtenirDepotPourJeton } from '@/lib/data'

/**
 * Motiq — moderation des avis.
 *
 * OU EST LA PROTECTION, EXACTEMENT ?
 * Pas ici. La politique RLS « avis: moderer » de la base refuse la mise a jour
 * a quiconque n'est pas moderateur. Ce fichier ne fait que transmettre la
 * demande.
 *
 * C'est volontaire : un controle ecrit seulement dans le code se contourne en
 * appelant l'API directement. En le placant dans la base, la regle tient quel
 * que soit le chemin emprunte — interface, API, script, futur worker.
 *
 * La verification `est_moderateur` faite dans la page n'est qu'un CONFORT
 * d'affichage : elle evite de montrer un ecran inutile, elle ne protege rien.
 */

export interface EtatModeration {
  erreur?: string
  succes?: string
}

async function moderateur() {
  const supabase = await creerClientServeur()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null

  const depot = obtenirDepotPourJeton(session.access_token)
  const profil = await depot.obtenirProfil(session.user.id)
  if (!profil?.estModerateur) return null

  return { session, depot }
}

export async function masquerAvis(donnees: FormData): Promise<void> {
  const m = await moderateur()
  if (!m) return

  const avisId = String(donnees.get('avisId') ?? '')
  const motif = String(donnees.get('motif') ?? '').trim() || 'Contenu signalé comme abusif'
  if (!avisId) return

  await m.depot.modererAvis({ avisId, statut: 'masque', motif })
  revalidatePath('/moderation')
  revalidatePath('/')
}

/**
 * Remettre un avis en ligne.
 *
 * Indispensable : une moderation sans retour en arriere transforme une erreur
 * de jugement en censure definitive. On doit toujours pouvoir defaire — et le
 * motif est efface au passage, sinon un avis republie trainerait la raison de
 * son masquage.
 */
export async function retablirAvis(donnees: FormData): Promise<void> {
  const m = await moderateur()
  if (!m) return

  const avisId = String(donnees.get('avisId') ?? '')
  if (!avisId) return

  await m.depot.modererAvis({ avisId, statut: 'publie', motif: null })
  revalidatePath('/moderation')
  revalidatePath('/')
}
